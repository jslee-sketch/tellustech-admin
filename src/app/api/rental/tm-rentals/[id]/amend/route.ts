import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  notFound,
  ok,
  optionalEnum,
  requireEnum,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { createTmAmendment } from "@/lib/amendments";
import { canEdit } from "@/lib/record-policy";
import type {
  AmendmentItemAction,
  AmendmentSource,
  AmendmentType,
} from "@/generated/prisma/client";

const TYPES: readonly AmendmentType[] = [
  "REMOVE_EQUIPMENT",
  "ADD_EQUIPMENT",
  "REPLACE_EQUIPMENT",
  "PRICE_CHANGE",
  "TERMINATE",
] as const;
const ACTIONS: readonly AmendmentItemAction[] = [
  "REMOVE",
  "ADD",
  "REPLACE_OUT",
  "REPLACE_IN",
] as const;
const SOURCES: readonly AmendmentSource[] = ["CONTRACT_DETAIL", "INVENTORY_TXN"] as const;

type RouteContext = { params: Promise<{ id: string }> };

function parseDateOrNull(v: unknown): Date | null {
  const s = trimNonEmpty(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const rental = await prisma.tmRental.findUnique({ where: { id }, select: { id: true, deletedAt: true, lockedAt: true, lockReason: true } });
    if (!rental) return notFound();
    const verdict = canEdit(rental);
    if (!verdict.allowed) return conflict(verdict.reason);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const type = requireEnum(p.type, TYPES, "type");
      const source = optionalEnum(p.source, SOURCES) ?? "CONTRACT_DETAIL";
      const effectiveDate = parseDateOrNull(p.effectiveDate) ?? new Date();
      const warehouseId = trimNonEmpty(p.warehouseId);
      const triggeredByTxnId = trimNonEmpty(p.triggeredByTxnId);

      const rawItems = Array.isArray(p.items) ? (p.items as unknown[]) : [];
      const items = rawItems.map((raw, i) => {
        const it = raw as Record<string, unknown>;
        const action = requireEnum(it.action, ACTIONS, `items[${i}].action`);
        const serialNumber = trimNonEmpty(it.serialNumber);
        if (!serialNumber) throw new Error(`items[${i}].serialNumber: required`);
        const itemId = trimNonEmpty(it.itemId);
        if (!itemId) throw new Error(`items[${i}].itemId: required`);
        return {
          action,
          serialNumber,
          itemId,
          originalItemId: trimNonEmpty(it.originalItemId),
          salesPrice: trimNonEmpty(it.salesPrice),
          startDate: parseDateOrNull(it.startDate),
          endDate: parseDateOrNull(it.endDate),
        };
      });

      if ((type === "REMOVE_EQUIPMENT" || type === "ADD_EQUIPMENT" || type === "REPLACE_EQUIPMENT") && items.length === 0) {
        return badRequest("invalid_input", { field: "items", reason: "required" });
      }

      const result = await prisma.$transaction((tx) =>
        createTmAmendment(tx, {
          rentalId: id,
          type,
          source,
          triggeredByTxnId,
          effectiveDate,
          reason: trimNonEmpty(p.reason),
          reasonVi: trimNonEmpty(p.reasonVi),
          reasonEn: trimNonEmpty(p.reasonEn),
          reasonKo: trimNonEmpty(p.reasonKo),
          warehouseId,
          performedById: session.sub,
          items,
        }),
      );
      return ok({ amendment: result }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      const msg = err instanceof Error ? err.message : "server_error";
      if (msg.startsWith("items[") || msg === "rental_not_found") {
        return badRequest("invalid_input", { message: msg });
      }
      return serverError(err);
    }
  });
}
