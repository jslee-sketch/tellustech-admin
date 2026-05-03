import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  optionalEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import type { Currency, StockCheckMode } from "@/generated/prisma/client";

const CURRENCIES: readonly Currency[] = ["VND", "USD", "KRW", "JPY", "CNY"] as const;

// 매출 API (Phase 2 #2a)
// - POST: 매출 + 품목라인 + 미수금 PayableReceivable 를 하나의 트랜잭션으로 생성
// - 거래처 paymentTerms 기반 dueDate (null 이면 30일 기본)
// - 자동코드 SLS-YYMMDD-###

const DEFAULT_PAYMENT_DAYS = 30;

type ItemInput = {
  itemId: string;
  serialNumber?: string | null;
  stockCheck?: StockCheckMode;
  quantity: string | number;
  unitPrice: string | number;
  startDate?: string | null;
  endDate?: string | null;
};

function parseDecimal(value: string | number, min = 0): string | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < min) return null;
  return n.toFixed(2);
}

function parseQty(value: string | number): string | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(3);
}

function parseDateOrNull(value: unknown): Date | null {
  const s = trimNonEmpty(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const clientId = trimNonEmpty(url.searchParams.get("client"));
    const projectId = trimNonEmpty(url.searchParams.get("project"));

    const where = {
      ...(clientId ? { clientId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(q
        ? {
            OR: [
              { salesNumber: { contains: q, mode: "insensitive" as const } },
              { client: { companyNameVi: { contains: q, mode: "insensitive" as const } } },
              { client: { clientCode: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const sales = await prisma.sales.findMany({
      where,
      orderBy: { salesNumber: "desc" },
      take: 500,
      include: {
        client: { select: { id: true, clientCode: true, companyNameVi: true, paymentTerms: true } },
        project: { select: { projectCode: true, name: true } },
        _count: { select: { items: true } },
        receivables: { select: { id: true, status: true, amount: true, paidAmount: true, dueDate: true } },
      },
    });
    return ok({ sales });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const clientId = requireString(p.clientId, "clientId");
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, paymentTerms: true, receivableStatus: true, companyNameVi: true },
      });
      if (!client) return badRequest("invalid_client");
      // BLOCKED 거래처는 ADMIN/MANAGER 가 명시적으로 forceBlocked=true 보내야 진행
      if (client.receivableStatus === "BLOCKED" && p.forceBlocked !== true) {
        return badRequest("client_blocked", {
          message: `거래처 [${client.companyNameVi}] 가 미수금 BLOCKED 상태입니다. 관리자 승인(forceBlocked=true)이 필요합니다.`,
        });
      }

      const salesEmployeeId = trimNonEmpty(p.salesEmployeeId);
      if (salesEmployeeId) {
        const e = await prisma.employee.findUnique({ where: { id: salesEmployeeId } });
        if (!e) return badRequest("invalid_sales_employee");
      }

      const projectId = trimNonEmpty(p.projectId);
      let projectType: string | null = null;
      if (projectId) {
        const pr = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, salesType: true } });
        if (!pr) return badRequest("invalid_project");
        projectType = pr.salesType;
      }
      const warehouseId = trimNonEmpty(p.warehouseId);
      if (projectType === "TRADE" && !warehouseId) {
        return badRequest("invalid_input", { field: "warehouseId", reason: "trade_requires_warehouse" });
      }
      if (warehouseId) {
        const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { id: true } });
        if (!wh) return badRequest("invalid_warehouse");
      }

      const usagePeriodStart = parseDateOrNull(p.usagePeriodStart);
      const usagePeriodEnd = parseDateOrNull(p.usagePeriodEnd);

      // 품목 라인 유효성 — itemId 필수. 라인 기간 지정이 없으면 헤더 기간을 자동 복사.
      const rawItems = Array.isArray(p.items) ? (p.items as unknown[]) : [];
      const itemsData: {
        itemId: string;
        serialNumber: string | null;
        quantity: string;
        unitPrice: string;
        amount: string;
        startDate: Date | null;
        endDate: Date | null;
      }[] = [];
      for (let i = 0; i < rawItems.length; i++) {
        const it = rawItems[i] as ItemInput;
        const itemId = trimNonEmpty(it.itemId);
        if (!itemId) return badRequest("invalid_input", { field: `items[${i}].itemId` });
        const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
        if (!item) return badRequest("invalid_item", { field: `items[${i}].itemId` });
        const quantity = parseQty(it.quantity);
        if (!quantity) return badRequest("invalid_input", { field: `items[${i}].quantity` });
        const unitPrice = parseDecimal(it.unitPrice);
        if (unitPrice === null) return badRequest("invalid_input", { field: `items[${i}].unitPrice` });

        // S/N 검증 — TRADE 매출의 경우 (1) 이미 출고된 S/N 차단 (2) 활성 IT/TM 계약 충돌 차단
        const lineSn = trimNonEmpty(it.serialNumber);
        if (lineSn && projectType === "TRADE" && p.forceBlocked !== true) {
          // (1) 이중 출고 방지 — 마지막 트랜잭션이 OUT 이면 이미 판매됨
          const lastTxn = await prisma.inventoryTransaction.findFirst({
            where: { serialNumber: lineSn },
            orderBy: { performedAt: "desc" },
            select: { txnType: true, performedAt: true },
          });
          if (lastTxn?.txnType === "OUT") {
            return badRequest("serial_already_sold", { field: `items[${i}].serialNumber`, sn: lineSn });
          }
          // (2) 활성 IT 계약 / TM 렌탈에 등록된 S/N 차단
          const { findSerialDuplicates } = await import("@/lib/sn-dupcheck");
          const dups = await findSerialDuplicates(lineSn);
          const blocking = dups.filter((d) => d.source === "IT" || d.source === "TM");
          if (blocking.length > 0) {
            return badRequest("serial_in_active_contract", {
              field: `items[${i}].serialNumber`,
              sn: lineSn,
              detail: blocking.map((d) => `${d.source}:${d.ref}`).join(", "),
            });
          }
        }

        const amount = (Number(quantity) * Number(unitPrice)).toFixed(2);
        const lineStart = parseDateOrNull(it.startDate) ?? usagePeriodStart;
        const lineEnd = parseDateOrNull(it.endDate) ?? usagePeriodEnd;
        itemsData.push({
          itemId,
          serialNumber: lineSn,
          quantity,
          unitPrice,
          amount,
          startDate: lineStart,
          endDate: lineEnd,
        });
      }

      const totalAmount = itemsData.reduce((sum, it) => sum + Number(it.amount), 0).toFixed(2);
      const paymentDays = client.paymentTerms ?? DEFAULT_PAYMENT_DAYS;
      const createdAt = new Date();
      const dueDate = addDays(createdAt, paymentDays);

      const currency = optionalEnum(p.currency, CURRENCIES) ?? "VND";
      const rawFx = Number(p.fxRate ?? 1);
      const fxRate = Number.isFinite(rawFx) && rawFx > 0 ? rawFx.toFixed(6) : "1";

      const created = await withUniqueRetry(
        async () => {
          const salesNumber = await generateDatedCode({
            prefix: "SLS",
            lookupLast: async (fullPrefix) => {
              const last = await prisma.sales.findFirst({
                where: { deletedAt: undefined, salesNumber: { startsWith: fullPrefix } },
                orderBy: { salesNumber: "desc" },
                select: { salesNumber: true },
              });
              return last?.salesNumber ?? null;
            },
          });

          return prisma.$transaction(async (tx) => {
            const sales = await tx.sales.create({
              data: {
                salesNumber,
                clientId,
                projectId: projectId ?? null,
                salesEmployeeId: salesEmployeeId ?? null,
                warehouseId: warehouseId ?? null,
                usagePeriodStart,
                usagePeriodEnd,
                totalAmount,
                currency,
                fxRate,
                note: trimNonEmpty(p.note),
                createdAt,
              },
            });
            if (itemsData.length > 0) {
              await tx.salesItem.createMany({
                data: itemsData.map((it) => ({ salesId: sales.id, ...it })),
              });
            }
            // TRADE 프로젝트 — 각 품목라인을 재고 OUT 으로 자동 생성 (fromWarehouseId=선택창고)
            if (projectType === "TRADE" && warehouseId && itemsData.length > 0) {
              // Phase 1 정책: TRADE 매출 라인은 InventoryItem 마스터 매칭 검증
              for (const it of itemsData) {
                if (!it.serialNumber) continue;
                const master = await tx.inventoryItem.findUnique({
                  where: { serialNumber: it.serialNumber },
                  select: { warehouseId: true, archivedAt: true },
                });
                if (!master) {
                  throw new Error(`sn_not_in_inventory:${it.serialNumber}`);
                }
                if (master.archivedAt) {
                  throw new Error(`sn_archived:${it.serialNumber}`);
                }
                if (master.warehouseId !== warehouseId) {
                  throw new Error(`sn_warehouse_mismatch:${it.serialNumber}`);
                }
              }
              await tx.inventoryTransaction.createMany({
                data: itemsData.map((it) => ({
                  companyCode: session.companyCode,
                  itemId: it.itemId,
                  fromWarehouseId: warehouseId,
                  toWarehouseId: null,
                  clientId,
                  serialNumber: it.serialNumber,
                  txnType: "OUT" as const,
                  reason: "SALE" as const,
                  // Phase 1 신규 4축 분류
                  referenceModule: "TRADE",
                  subKind: "SALE",
                  quantity: Math.max(1, Math.round(Number(it.quantity))),
                  note: `[자동] 매출 ${sales.salesNumber}`,
                  performedById: session.sub,
                })),
              });
              // Phase 1: 매출 시 마스터 archive (소유권 이전)
              for (const it of itemsData) {
                if (!it.serialNumber) continue;
                await tx.inventoryItem.update({
                  where: { serialNumber: it.serialNumber },
                  data: { archivedAt: new Date() },
                }).catch(() => undefined);
              }
            }
            // PayableReceivable 은 항상 VND 본위로 저장 (다른 모듈/리포트는 전부 VND 로 집계)
            const vndAmount = (Number(totalAmount) * Number(fxRate)).toFixed(2);
            await tx.payableReceivable.create({
              data: {
                companyCode: session.companyCode,
                kind: "RECEIVABLE",
                salesId: sales.id,
                clientId,
                amount: vndAmount,
                paidAmount: "0",
                dueDate,
                status: "OPEN",
              },
            });
            return sales;
          });
        },
        { isConflict: isUniqueConstraintError },
      );

      // Layer 3 — 매출 자동 분개 (실패해도 매출은 유지).
      try {
        const { postSalesJournal } = await import("@/lib/journal");
        const total = Number(totalAmount);
        const vatRate = 0.1;
        const net = +(total / (1 + vatRate)).toFixed(2);
        const vat = +(total - net).toFixed(2);
        await postSalesJournal({
          salesId: created.id,
          salesDate: createdAt,
          totalAmount: total,
          netAmount: net,
          vatAmount: vat,
          clientId,
          companyCode: session.companyCode as "TV" | "VR",
          description: `매출 ${created.salesNumber} — ${client.companyNameVi}`,
          createdById: session.sub,
        });
      } catch (e) {
        console.error("[sales] auto-journal failed:", e);
      }

      // 전체 레코드를 items 포함으로 반환
      const full = await prisma.sales.findUnique({
        where: { id: created.id },
        include: {
          items: true,
          receivables: true,
          client: { select: { clientCode: true, companyNameVi: true } },
        },
      });
      return ok({ sales: full }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
