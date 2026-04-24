import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isRecordNotFoundError,
  isUniqueConstraintError,
  notFound,
  ok,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { recalcSalesTotalsInTx } from "@/lib/sales-recalc";

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function parseDateOrUndefined(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

function parseDecimalOrUndefined(value: unknown, min = 0): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) return undefined;
  return n.toFixed(2);
}

function parseQtyOrUndefined(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n.toFixed(3);
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id: salesId, itemId } = await context.params;
    const existing = await prisma.salesItem.findUnique({ where: { id: itemId } });
    if (!existing || existing.salesId !== salesId) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const data: Record<string, unknown> = {};
      if (p.serialNumber !== undefined) data.serialNumber = trimNonEmpty(p.serialNumber);
      if (p.itemId !== undefined) {
        const rid = trimNonEmpty(p.itemId);
        if (!rid) return badRequest("invalid_input", { field: "itemId" });
        const it = await prisma.item.findUnique({ where: { id: rid } });
        if (!it) return badRequest("invalid_item");
        data.itemId = rid;
      }

      const qty = parseQtyOrUndefined(p.quantity);
      if (p.quantity !== undefined && qty === undefined) return badRequest("invalid_input", { field: "quantity" });
      const unitPrice = parseDecimalOrUndefined(p.unitPrice);
      if (p.unitPrice !== undefined && unitPrice === undefined) return badRequest("invalid_input", { field: "unitPrice" });

      const nextQty = qty ?? existing.quantity.toString();
      const nextPrice = unitPrice ?? existing.unitPrice.toString();
      if (qty !== undefined) data.quantity = qty;
      if (unitPrice !== undefined) data.unitPrice = unitPrice;
      if (qty !== undefined || unitPrice !== undefined) {
        data.amount = (Number(nextQty) * Number(nextPrice)).toFixed(2);
      }

      // 기간
      if (p.startDate !== undefined) {
        const d = parseDateOrUndefined(p.startDate);
        if (d === undefined) return badRequest("invalid_input", { field: "startDate" });
        data.startDate = d;
      }
      if (p.endDate !== undefined) {
        const d = parseDateOrUndefined(p.endDate);
        if (d === undefined) return badRequest("invalid_input", { field: "endDate" });
        data.endDate = d;
      }

      // 교정 성적서
      if (p.certNumber !== undefined) data.certNumber = trimNonEmpty(p.certNumber);
      if (p.certFileId !== undefined) {
        const fid = trimNonEmpty(p.certFileId);
        if (fid) {
          const f = await prisma.file.findUnique({ where: { id: fid }, select: { id: true } });
          if (!f) return badRequest("invalid_file");
          data.certFileId = fid;
        } else {
          data.certFileId = null;
        }
      }
      if (p.issuedAt !== undefined) {
        const d = parseDateOrUndefined(p.issuedAt);
        if (d === undefined) return badRequest("invalid_input", { field: "issuedAt" });
        data.issuedAt = d;
        data.nextDueAt = d ? addMonths(d, 11) : null;
      }

      if (Object.keys(data).length === 0) return ok({ item: existing });

      const updated = await prisma.$transaction(async (tx) => {
        const upd = await tx.salesItem.update({ where: { id: itemId }, data });
        await recalcSalesTotalsInTx(tx, salesId);
        return upd;
      });
      return ok({ item: updated });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_cert_number");
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}

export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id: salesId, itemId } = await context.params;
    const existing = await prisma.salesItem.findUnique({ where: { id: itemId } });
    if (!existing || existing.salesId !== salesId) return notFound();
    try {
      await prisma.$transaction(async (tx) => {
        await tx.salesItem.delete({ where: { id: itemId } });
        await recalcSalesTotalsInTx(tx, salesId);
      });
      return ok({ ok: true });
    } catch (err) {
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
