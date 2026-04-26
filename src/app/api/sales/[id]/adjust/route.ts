import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  handleFieldError,
  notFound,
  ok,
  requireEnum,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { createSalesAdjustment } from "@/lib/adjustments";
import type { AdjustmentItemAction, AdjustmentType } from "@/generated/prisma/client";

// 매출 사후조정 — POST /api/sales/[id]/adjust
//   body: {
//     type: AdjustmentType,
//     warehouseId?: string,
//     reason?: string, reasonVi/En/Ko?: string,
//     priceDelta?: string, // PRICE_ADJUST 만 사용
//     items?: [{ action: AdjustmentItemAction, serialNumber, itemId, originalSalesItemId?, unitPrice }],
//   }

const TYPES: readonly AdjustmentType[] = [
  "RETURN_FULL",
  "RETURN_PARTIAL",
  "EXCHANGE_FULL",
  "EXCHANGE_PARTIAL",
  "PRICE_ADJUST",
] as const;
const ACTIONS: readonly AdjustmentItemAction[] = [
  "RETURN",
  "EXCHANGE_OUT",
  "EXCHANGE_IN",
] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const sales = await prisma.sales.findUnique({ where: { id }, select: { id: true } });
    if (!sales) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const type = requireEnum(p.type, TYPES, "type");
      const warehouseId = trimNonEmpty(p.warehouseId);
      // PRICE_ADJUST 외에는 회수/출고 창고 권장이지만 강제 X (외부 처리 가능)
      const priceDelta = trimNonEmpty(p.priceDelta);

      const rawItems = Array.isArray(p.items) ? (p.items as unknown[]) : [];
      const items = rawItems.map((raw, i) => {
        const it = raw as Record<string, unknown>;
        const action = requireEnum(it.action, ACTIONS, `items[${i}].action`);
        if (action === "EXCHANGE_IN") {
          throw new Error(`items[${i}].action: EXCHANGE_IN_not_allowed_for_sales`);
        }
        const serialNumber = trimNonEmpty(it.serialNumber);
        if (!serialNumber) throw new Error(`items[${i}].serialNumber: required`);
        const itemId = trimNonEmpty(it.itemId);
        if (!itemId) throw new Error(`items[${i}].itemId: required`);
        const unitPriceStr = trimNonEmpty(it.unitPrice) ?? "0";
        const unitPrice = Number(unitPriceStr);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(`items[${i}].unitPrice: invalid`);
        }
        return {
          action,
          serialNumber,
          itemId,
          originalSalesItemId: trimNonEmpty(it.originalSalesItemId),
          unitPrice: unitPrice.toFixed(2),
        };
      });

      if (type === "PRICE_ADJUST" && !priceDelta) {
        return badRequest("invalid_input", { field: "priceDelta", reason: "required_for_PRICE_ADJUST" });
      }
      if (type !== "PRICE_ADJUST" && items.length === 0) {
        return badRequest("invalid_input", { field: "items", reason: "required" });
      }

      const result = await prisma.$transaction((tx) =>
        createSalesAdjustment(tx, {
          companyCode: session.companyCode,
          originalSalesId: id,
          type,
          reason: trimNonEmpty(p.reason),
          reasonVi: trimNonEmpty(p.reasonVi),
          reasonEn: trimNonEmpty(p.reasonEn),
          reasonKo: trimNonEmpty(p.reasonKo),
          warehouseId,
          performedById: session.sub,
          priceDelta,
          items,
        }),
      );
      return ok({ adjustment: result }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      const msg = err instanceof Error ? err.message : "server_error";
      if (msg.startsWith("items[") || msg.startsWith("invalid_") || msg.startsWith("original_")) {
        return badRequest("invalid_input", { message: msg });
      }
      return serverError(err);
    }
  });
}
