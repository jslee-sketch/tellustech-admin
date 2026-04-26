import "server-only";
import { prisma } from "./prisma";
import type { CompanyCode } from "@/generated/prisma/client";

// IT 계약의 렌탈 자동오더 생성 로직.
// - 계약 startDate~endDate 의 월별 첫째 날마다 RentalOrder 1건.
// - 이미 있는 월은 건드리지 않음(멱등).
// - amount = 해당 월 활성 장비들의 monthlyBaseFee 합.
//   (equipment.installedAt <= 월말 AND (removedAt 없음 OR removedAt >= 월초))
// - companyCode 는 RentalOrder 에 필수지만 IT 계약엔 없음.
//   contractNumber prefix 로 유추: TLS → TV, VRT → VR.

export function deriveCompanyFromContractNumber(contractNumber: string): CompanyCode {
  return contractNumber.startsWith("TLS") ? "TV" : "VR";
}

// Billing month 은 "월 첫째 날 UTC 자정" 으로 정규화.
// 로컬 타임존 기반 setDate/setHours 를 쓰면 KST 입력(2026-05-01 KST)이 UTC 환산 후
// DB 에 2026-04-30T15:00Z 로 저장되어 "2026-04" 월로 밀리는 문제 발생 — 전 조작을 UTC 로.
function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function lastOfMonth(firstDay: Date): Date {
  return new Date(
    Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

function addMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

function isoYm(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export type GenerateResult = {
  created: number;
  skipped: number;
  totalMonths: number;
};

export async function generateMissingOrders(contractId: string): Promise<GenerateResult> {
  const contract = await prisma.itContract.findUnique({
    where: { id: contractId },
    include: { equipment: true, amendments: true },
  });
  if (!contract) throw new Error("contract_not_found");

  const companyCode = deriveCompanyFromContractNumber(contract.contractNumber);

  // 계약 기간 월 리스트
  const startMonth = firstOfMonth(contract.startDate);
  const endMonth = firstOfMonth(contract.endDate);
  const months: Date[] = [];
  let cur = startMonth;
  while (cur <= endMonth) {
    months.push(cur);
    cur = addMonthUtc(cur);
  }

  // 이미 있는 월 Set
  const existing = await prisma.rentalOrder.findMany({
    where: { itContractId: contractId },
    select: { billingMonth: true },
  });
  const existingYm = new Set(existing.map((o) => isoYm(o.billingMonth)));

  // PRICE_CHANGE amendment 월별 누계 — effectiveDate <= billingMonth 인 것만.
  const priceAmendments = contract.amendments
    .filter((a) => a.type === "PRICE_CHANGE" && a.monthlyDelta !== null)
    .map((a) => ({ effectiveDate: a.effectiveDate, delta: Number(a.monthlyDelta) }));

  // 누락 월에 대해 amount 계산 후 배열 구성
  const toCreate: {
    companyCode: CompanyCode;
    itContractId: string;
    rentalType: "IT";
    billingMonth: Date;
    amount: string;
  }[] = [];
  for (const m of months) {
    if (existingYm.has(isoYm(m))) continue;
    const monthEnd = lastOfMonth(m);
    // active equipment: installedAt <= monthEnd AND (removedAt is null OR removedAt > m)
    const active = contract.equipment.filter((e) => {
      const installed = e.installedAt ?? contract.startDate;
      const removed = e.removedAt;
      return installed <= monthEnd && (!removed || removed > m);
    });
    let amount = active.reduce((sum, e) => sum + Number(e.monthlyBaseFee ?? 0), 0);
    // price-change deltas applicable to this billing month
    for (const pa of priceAmendments) {
      if (pa.effectiveDate <= monthEnd) amount += pa.delta;
    }
    toCreate.push({
      companyCode,
      itContractId: contractId,
      rentalType: "IT",
      billingMonth: m,
      amount: amount.toFixed(2),
    });
  }

  if (toCreate.length > 0) {
    await prisma.rentalOrder.createMany({ data: toCreate });
  }
  return {
    created: toCreate.length,
    skipped: existingYm.size,
    totalMonths: months.length,
  };
}
