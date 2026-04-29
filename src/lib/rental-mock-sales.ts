import "server-only";
import { prisma } from "./prisma";
import { generateDatedCode } from "./code-generator";
import { deriveCompanyFromContractNumber } from "./rental-orders";
import type { CompanyCode, Prisma } from "@/generated/prisma/client";

// Mock 매출 (DRAFT) 자동 생성 + UC 동기화 로직.
// 매칭 키: (itContractId, billingMonth) 또는 (tmRentalId, billingMonth) 1:1.

export function firstOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function lastOfMonthUtc(firstDay: Date): Date {
  return new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

export function ymToFirstOfMonthUtc(ym: string): Date {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
}

export function previousMonthFirstUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
}

// IT 계약 1건의 그 월 DRAFT Sales 생성 (없으면).
export async function ensureItDraftSales(
  contractId: string,
  billingMonth: Date,
): Promise<{ id: string; created: boolean }> {
  const ex = await prisma.sales.findFirst({
    where: { itContractId: contractId, billingMonth },
    select: { id: true, isDraft: true },
  });
  if (ex) return { id: ex.id, created: false };

  const contract = await prisma.itContract.findUnique({
    where: { id: contractId },
    include: { equipment: { where: { removedAt: null } } },
  });
  if (!contract) throw new Error("contract_not_found");

  const company = deriveCompanyFromContractNumber(contract.contractNumber);
  const baseFee = contract.equipment.reduce((s, e) => s + Number(e.monthlyBaseFee ?? 0), 0);
  const monthEnd = lastOfMonthUtc(billingMonth);
  const salesNumber = await generateDatedCode({
    prefix: "SLS",
    lookupLast: async (full) => {
      const last = await prisma.sales.findFirst({ where: { salesNumber: { startsWith: full } }, orderBy: { salesNumber: "desc" }, select: { salesNumber: true } });
      return last?.salesNumber ?? null;
    },
  });
  const created = await prisma.sales.create({
    data: {
      salesNumber,
      clientId: contract.clientId,
      itContractId: contractId,
      billingMonth,
      usagePeriodStart: billingMonth,
      usagePeriodEnd: monthEnd,
      isDraft: true,
      technicianReady: false, // SNMP UC 가 ADMIN_CONFIRMED 되어야 true
      totalAmount: baseFee,
      currency: contract.currency,
      fxRate: contract.fxRate,
      note: "Mock 매출 (cron 자동 생성) — UC ADMIN_CONFIRMED 후 영업 [발행] 필요",
    },
  });
  // 기본료 라인을 BASE_FEE 로 라벨해서 1줄씩 (장비별)
  for (const eq of contract.equipment) {
    if (!eq.monthlyBaseFee) continue;
    await prisma.salesItem.create({
      data: {
        salesId: created.id,
        itemId: eq.itemId,
        serialNumber: eq.serialNumber,
        quantity: 1,
        unitPrice: eq.monthlyBaseFee,
        amount: eq.monthlyBaseFee,
        sourceType: "BASE_FEE",
      },
    });
  }
  void company;
  return { id: created.id, created: true };
}

// TM 렌탈 1건의 그 월 DRAFT Sales 생성. 모든 라인 합산.
export async function ensureTmDraftSales(
  rentalId: string,
  billingMonth: Date,
): Promise<{ id: string; created: boolean }> {
  const ex = await prisma.sales.findFirst({
    where: { tmRentalId: rentalId, billingMonth },
    select: { id: true },
  });
  if (ex) return { id: ex.id, created: false };

  const rental = await prisma.tmRental.findUnique({
    where: { id: rentalId },
    include: { items: true },
  });
  if (!rental) throw new Error("rental_not_found");

  const total = rental.items.reduce((s, it) => s + Number(it.salesPrice ?? 0), 0);
  const monthEnd = lastOfMonthUtc(billingMonth);
  const salesNumber = await generateDatedCode({
    prefix: "SLS",
    lookupLast: async (full) => {
      const last = await prisma.sales.findFirst({ where: { salesNumber: { startsWith: full } }, orderBy: { salesNumber: "desc" }, select: { salesNumber: true } });
      return last?.salesNumber ?? null;
    },
  });
  const created = await prisma.sales.create({
    data: {
      salesNumber,
      clientId: rental.clientId,
      tmRentalId: rentalId,
      billingMonth,
      usagePeriodStart: billingMonth,
      usagePeriodEnd: monthEnd,
      isDraft: true,
      technicianReady: true, // TM 은 SNMP 흐름 없음 → 영업 즉시 발행 가능
      totalAmount: total,
      currency: rental.currency,
      fxRate: rental.fxRate,
      note: "Mock 매출 (cron 자동 생성, TM 렌탈) — 영업 [발행] 즉시 가능",
    },
  });
  for (const it of rental.items) {
    await prisma.salesItem.create({
      data: {
        salesId: created.id,
        itemId: it.itemId,
        serialNumber: it.serialNumber,
        quantity: 1,
        unitPrice: it.salesPrice,
        amount: it.salesPrice,
        sourceType: "TM_LINE",
        sourceTmRentalItemId: it.id,
      },
    });
  }
  return { id: created.id, created: true };
}

// UC ADMIN_CONFIRMED 시 호출 — DRAFT Sales 의 사용량 라인 동기화.
export async function syncDraftFromUsageConfirmation(usageConfirmationId: string): Promise<void> {
  const uc = await prisma.usageConfirmation.findUnique({
    where: { id: usageConfirmationId },
    include: { contract: { include: { equipment: true } } },
  });
  if (!uc || uc.status !== "ADMIN_CONFIRMED") return;

  const billingMonth = ymToFirstOfMonthUtc(uc.billingMonth);
  // DRAFT 가 없으면 즉시 생성 (cron 보다 먼저 UC 가 만들어진 경우 안전망)
  let mock = await prisma.sales.findFirst({
    where: { itContractId: uc.contractId, billingMonth, isDraft: true },
  });
  if (!mock) {
    const ensured = await ensureItDraftSales(uc.contractId, billingMonth);
    mock = await prisma.sales.findUnique({ where: { id: ensured.id } });
  }
  if (!mock) return;

  // 기존 사용량 라인(BASE_FEE/EXTRA_BW/EXTRA_COLOR) 모두 삭제 후 재생성.
  await prisma.salesItem.deleteMany({
    where: { salesId: mock.id, sourceType: { in: ["BASE_FEE", "EXTRA_BW", "EXTRA_COLOR"] } },
  });

  // UC.equipmentUsage = [{ equipmentId, serialNumber, baseFee, extraBwPages, extraBwAmount, extraColorPages, extraColorAmount, ... }]
  const usage = (uc.equipmentUsage ?? []) as Array<Record<string, unknown>>;
  let total = 0;
  for (const eq of uc.contract.equipment) {
    const u = usage.find((x) => x.equipmentId === eq.id || x.serialNumber === eq.serialNumber);
    const baseFee = Number(eq.monthlyBaseFee ?? 0);
    if (baseFee > 0) {
      await prisma.salesItem.create({
        data: { salesId: mock.id, itemId: eq.itemId, serialNumber: eq.serialNumber, quantity: 1, unitPrice: baseFee, amount: baseFee, sourceType: "BASE_FEE" },
      });
      total += baseFee;
    }
    if (u) {
      const extraBw = Number(u.extraBwAmount ?? 0);
      const extraBwPages = Number(u.extraBwPages ?? 0);
      const extraColor = Number(u.extraColorAmount ?? 0);
      const extraColorPages = Number(u.extraColorPages ?? 0);
      if (extraBwPages > 0 && extraBw > 0) {
        await prisma.salesItem.create({
          data: { salesId: mock.id, itemId: eq.itemId, serialNumber: eq.serialNumber, quantity: extraBwPages, unitPrice: extraBwPages > 0 ? extraBw / extraBwPages : 0, amount: extraBw, sourceType: "EXTRA_BW" },
        });
        total += extraBw;
      }
      if (extraColorPages > 0 && extraColor > 0) {
        await prisma.salesItem.create({
          data: { salesId: mock.id, itemId: eq.itemId, serialNumber: eq.serialNumber, quantity: extraColorPages, unitPrice: extraColorPages > 0 ? extraColor / extraColorPages : 0, amount: extraColor, sourceType: "EXTRA_COLOR" },
        });
        total += extraColor;
      }
    }
  }

  await prisma.sales.update({
    where: { id: mock.id },
    data: { totalAmount: total, technicianReady: true },
  });
}

// 단계 뱃지 분류기 — 매출 1건 → "TECH"/"SALES"/"FINANCE"/"DONE"
export function classifySalesStage(sale: {
  isDraft: boolean;
  technicianReady: boolean;
  salesConfirmedAt: Date | null;
  financeConfirmedAt: Date | null;
}): "TECH" | "SALES" | "FINANCE" | "DONE" {
  if (sale.isDraft && !sale.technicianReady) return "TECH";
  if (sale.isDraft && sale.technicianReady) return "SALES";
  if (!sale.isDraft && !sale.financeConfirmedAt) return "FINANCE";
  return "DONE";
}
