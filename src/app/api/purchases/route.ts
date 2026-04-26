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
import { ensureInventoryItemOnReceipt } from "@/lib/inventory-receipt";
import type { Currency } from "@/generated/prisma/client";

const CURRENCIES: readonly Currency[] = ["VND", "USD", "KRW", "JPY", "CNY"] as const;

// 매입 API (Phase 2 #2b) — 매출과 대칭.
// 공급사(supplier = Client) 의 paymentTerms 기반 dueDate.
// 자동코드 PUR-YYMMDD-###. 저장 시 PayableReceivable(kind=PAYABLE) 자동 생성.

const DEFAULT_PAYMENT_DAYS = 30;

type ItemInput = {
  itemId: string;
  serialNumber?: string | null;
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
    const supplierId = trimNonEmpty(url.searchParams.get("supplier"));
    const projectId = trimNonEmpty(url.searchParams.get("project"));

    const where = {
      ...(supplierId ? { supplierId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(q
        ? {
            OR: [
              { purchaseNumber: { contains: q, mode: "insensitive" as const } },
              { supplier: { companyNameVi: { contains: q, mode: "insensitive" as const } } },
              { supplier: { clientCode: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const purchases = await prisma.purchase.findMany({
      where,
      orderBy: { purchaseNumber: "desc" },
      take: 500,
      include: {
        supplier: { select: { id: true, clientCode: true, companyNameVi: true, paymentTerms: true } },
        project: { select: { projectCode: true, name: true } },
        _count: { select: { items: true } },
        payables: { select: { id: true, status: true, amount: true, paidAmount: true, dueDate: true } },
      },
    });
    return ok({ purchases });
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
      const supplierId = requireString(p.supplierId, "supplierId");
      const supplier = await prisma.client.findUnique({
        where: { id: supplierId },
        select: { id: true, paymentTerms: true },
      });
      if (!supplier) return badRequest("invalid_supplier");

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

        // S/N 검증 — TRADE 매입의 경우 (1) 이미 입고된 S/N 차단 (이중 입고)
        // (2) 활성 IT/TM 계약과 충돌하지 않는지 (재고로 들어왔는데 다른 계약에 등록되어 있으면 모순)
        const lineSn = trimNonEmpty(it.serialNumber);
        if (lineSn && projectType === "TRADE") {
          const lastTxn = await prisma.inventoryTransaction.findFirst({
            where: { serialNumber: lineSn },
            orderBy: { performedAt: "desc" },
            select: { txnType: true },
          });
          if (lastTxn && lastTxn.txnType !== "OUT") {
            return badRequest("serial_already_in_stock", { field: `items[${i}].serialNumber`, sn: lineSn });
          }
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
      const paymentDays = supplier.paymentTerms ?? DEFAULT_PAYMENT_DAYS;
      const createdAt = new Date();
      const dueDate = addDays(createdAt, paymentDays);

      const currency = optionalEnum(p.currency, CURRENCIES) ?? "VND";
      const rawFx = Number(p.fxRate ?? 1);
      const fxRate = Number.isFinite(rawFx) && rawFx > 0 ? rawFx.toFixed(6) : "1";

      const created = await withUniqueRetry(
        async () => {
          const purchaseNumber = await generateDatedCode({
            prefix: "PUR",
            lookupLast: async (fullPrefix) => {
              const last = await prisma.purchase.findFirst({
                where: { purchaseNumber: { startsWith: fullPrefix } },
                orderBy: { purchaseNumber: "desc" },
                select: { purchaseNumber: true },
              });
              return last?.purchaseNumber ?? null;
            },
          });

          return prisma.$transaction(async (tx) => {
            const purchase = await tx.purchase.create({
              data: {
                purchaseNumber,
                supplierId,
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
              await tx.purchaseItem.createMany({
                data: itemsData.map((it) => ({ purchaseId: purchase.id, ...it })),
              });
            }
            // TRADE 프로젝트 — 각 품목라인을 재고 IN 으로 자동 생성 (toWarehouseId=선택창고)
            // S/N 이 있는 라인은 InventoryItem 마스터도 함께 생성 → QR(qrData) 자동 발급
            if (projectType === "TRADE" && warehouseId && itemsData.length > 0) {
              await tx.inventoryTransaction.createMany({
                data: itemsData.map((it) => ({
                  companyCode: session.companyCode,
                  itemId: it.itemId,
                  fromWarehouseId: null,
                  toWarehouseId: warehouseId,
                  clientId: supplierId,
                  serialNumber: it.serialNumber,
                  txnType: "IN" as const,
                  reason: "PURCHASE" as const,
                  quantity: Math.max(1, Math.round(Number(it.quantity))),
                  note: `[자동] 매입 ${purchase.purchaseNumber}`,
                  performedById: session.sub,
                })),
              });
              for (const it of itemsData) {
                if (!it.serialNumber) continue;
                await ensureInventoryItemOnReceipt(tx, {
                  itemId: it.itemId,
                  serialNumber: it.serialNumber,
                  warehouseId,
                  companyCode: session.companyCode,
                });
              }
            }
            const vndAmount = (Number(totalAmount) * Number(fxRate)).toFixed(2);
            await tx.payableReceivable.create({
              data: {
                companyCode: session.companyCode,
                kind: "PAYABLE",
                purchaseId: purchase.id,
                clientId: supplierId,
                amount: vndAmount,
                paidAmount: "0",
                dueDate,
                status: "OPEN",
              },
            });
            return purchase;
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
      );

      const full = await prisma.purchase.findUnique({
        where: { id: created.id },
        include: {
          items: true,
          payables: true,
          supplier: { select: { clientCode: true, companyNameVi: true } },
        },
      });
      return ok({ purchase: full }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
