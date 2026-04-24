import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  handleFieldError,
  isRecordNotFoundError,
  notFound,
  ok,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { computeTmProfit } from "@/lib/tm-profit";

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

function parseDateOrUndefined(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  const s = trimNonEmpty(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
function parseDecimalOrUndefined(value: unknown, min = 0): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) return undefined;
  return n.toFixed(2);
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id: rentalId, itemId } = await context.params;
    const existing = await prisma.tmRentalItem.findUnique({ where: { id: itemId } });
    if (!existing || existing.tmRentalId !== rentalId) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const data: Record<string, unknown> = {};
      if (p.itemId !== undefined) {
        const itemRef = trimNonEmpty(p.itemId);
        if (!itemRef) return badRequest("invalid_input", { field: "itemId" });
        const item = await prisma.item.findUnique({ where: { id: itemRef }, select: { id: true } });
        if (!item) return badRequest("invalid_item");
        data.itemId = itemRef;
      }
      if (p.options !== undefined) data.options = trimNonEmpty(p.options);
      if (p.serialNumber !== undefined) data.serialNumber = trimNonEmpty(p.serialNumber) ?? existing.serialNumber;
      if (p.startDate !== undefined) {
        const d = parseDateOrUndefined(p.startDate);
        if (d === undefined || d === null) return badRequest("invalid_input", { field: "startDate" });
        data.startDate = d;
      }
      if (p.endDate !== undefined) {
        const d = parseDateOrUndefined(p.endDate);
        if (d === undefined || d === null) return badRequest("invalid_input", { field: "endDate" });
        data.endDate = d;
      }

      const salesPrice = parseDecimalOrUndefined(p.salesPrice);
      if (p.salesPrice !== undefined && (salesPrice === undefined || salesPrice === null)) {
        return badRequest("invalid_input", { field: "salesPrice" });
      }
      const purchasePrice = parseDecimalOrUndefined(p.purchasePrice);
      if (p.purchasePrice !== undefined && purchasePrice === undefined) {
        return badRequest("invalid_input", { field: "purchasePrice" });
      }
      const commission = parseDecimalOrUndefined(p.commission);
      if (p.commission !== undefined && commission === undefined) {
        return badRequest("invalid_input", { field: "commission" });
      }

      if (salesPrice !== undefined) data.salesPrice = salesPrice;
      if (purchasePrice !== undefined) data.purchasePrice = purchasePrice;
      if (commission !== undefined) data.commission = commission;
      if (p.supplierName !== undefined) data.supplierName = trimNonEmpty(p.supplierName);

      // 이익 재계산 (셋 중 하나라도 변경된 경우)
      if (salesPrice !== undefined || purchasePrice !== undefined || commission !== undefined) {
        const nextSales = (salesPrice ?? existing.salesPrice.toString()) as string;
        const nextPurchase =
          purchasePrice !== undefined ? purchasePrice : existing.purchasePrice?.toString() ?? null;
        const nextCommission =
          commission !== undefined ? commission : existing.commission?.toString() ?? null;
        data.profit = computeTmProfit(nextSales, nextPurchase, nextCommission);
      }

      if (Object.keys(data).length === 0) return ok({ item: existing });

      const updated = await prisma.tmRentalItem.update({ where: { id: itemId }, data });
      return ok({ item: updated });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}

export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id: rentalId, itemId } = await context.params;
    const existing = await prisma.tmRentalItem.findUnique({ where: { id: itemId } });
    if (!existing || existing.tmRentalId !== rentalId) return notFound();
    try {
      await prisma.tmRentalItem.delete({ where: { id: itemId } });
      return ok({ ok: true });
    } catch (err) {
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
