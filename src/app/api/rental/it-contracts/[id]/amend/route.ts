import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  handleFieldError,
  notFound,
  ok,
  optionalEnum,
  requireEnum,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { createItAmendment } from "@/lib/amendments";
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

function parseIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const contract = await prisma.itContract.findUnique({ where: { id }, select: { id: true } });
    if (!contract) return notFound();

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
      const monthlyDelta = trimNonEmpty(p.monthlyDelta);
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
          originalEquipmentId: trimNonEmpty(it.originalEquipmentId),
          monthlyBaseFee: trimNonEmpty(it.monthlyBaseFee),
          bwIncludedPages: parseIntOrNull(it.bwIncludedPages),
          bwOverageRate: trimNonEmpty(it.bwOverageRate),
          colorIncludedPages: parseIntOrNull(it.colorIncludedPages),
          colorOverageRate: trimNonEmpty(it.colorOverageRate),
          manufacturer: trimNonEmpty(it.manufacturer),
        };
      });

      if (type === "PRICE_CHANGE" && !monthlyDelta) {
        return badRequest("invalid_input", { field: "monthlyDelta", reason: "required_for_PRICE_CHANGE" });
      }
      if ((type === "REMOVE_EQUIPMENT" || type === "ADD_EQUIPMENT" || type === "REPLACE_EQUIPMENT") && items.length === 0) {
        return badRequest("invalid_input", { field: "items", reason: "required" });
      }

      const result = await prisma.$transaction((tx) =>
        createItAmendment(tx, {
          contractId: id,
          type,
          source,
          triggeredByTxnId,
          effectiveDate,
          reason: trimNonEmpty(p.reason),
          reasonVi: trimNonEmpty(p.reasonVi),
          reasonEn: trimNonEmpty(p.reasonEn),
          reasonKo: trimNonEmpty(p.reasonKo),
          warehouseId,
          monthlyDelta,
          performedById: session.sub,
          items,
        }),
      );
      return ok({ amendment: result }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      const msg = err instanceof Error ? err.message : "server_error";
      if (msg.startsWith("items[") || msg === "contract_not_found") {
        return badRequest("invalid_input", { message: msg });
      }
      return serverError(err);
    }
  });
}
