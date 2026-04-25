import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  handleFieldError,
  isForeignKeyError,
  isRecordNotFoundError,
  conflict,
  notFound,
  ok,
  requireEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import type { ItemType } from "@/generated/prisma/client";

const ITEM_TYPES: readonly ItemType[] = ["PRODUCT", "CONSUMABLE", "PART"] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return notFound();
    return ok({ item });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      // itemCode 는 자동 생성 후 불변. 여기서는 변경 대상 아님.
      const data: Record<string, unknown> = {};
      if (p.itemType !== undefined) data.itemType = requireEnum(p.itemType, ITEM_TYPES, "itemType");
      if (p.name !== undefined) {
        const name = requireString(p.name, "name");
        if (!/^[\x20-\x7E]+$/.test(name)) {
          return badRequest("invalid_input", { field: "name", reason: "english_only" });
        }
        data.name = name;
      }
      if (p.unit !== undefined) data.unit = trimNonEmpty(p.unit);
      if (p.category !== undefined) data.category = trimNonEmpty(p.category);
      if (p.reorderPoint !== undefined) {
        if (p.reorderPoint === null || p.reorderPoint === "") {
          data.reorderPoint = null;
        } else {
          const n = Number(p.reorderPoint);
          if (!Number.isInteger(n) || n < 0) {
            return badRequest("invalid_input", { field: "reorderPoint" });
          }
          data.reorderPoint = n;
        }
      }

      if (Object.keys(data).length === 0) return ok({ item: existing });

      const updated = await prisma.item.update({ where: { id }, data });
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
    const { id } = await context.params;
    try {
      await prisma.item.delete({ where: { id } });
      return ok({ ok: true });
    } catch (err) {
      if (isForeignKeyError(err)) {
        return conflict("has_dependent_rows", {
          message: "이 품목에 연결된 재고·매출·매입 이력이 있어 삭제할 수 없습니다.",
        });
      }
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
