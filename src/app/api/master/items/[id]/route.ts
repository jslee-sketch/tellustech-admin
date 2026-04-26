import { prisma } from "@/lib/prisma";
import { dependentsPreview, softDeleteOne } from "@/lib/api/crud";
import { canEdit } from "@/lib/record-policy";
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

    const _v = canEdit(existing);
    if (!_v.allowed) return conflict(_v.reason);
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

export async function DELETE(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const url = new URL(request.url);
    if (url.searchParams.get("preview") === "1") {
      const counts = await dependentsPreview("Item", id);
      return ok({ preview: true, dependents: counts });
    }
    try {
      const result = await softDeleteOne("Item", id);
      if (!result.ok) {
        if (result.reason === "not_found") return notFound();
        return conflict(result.reason);
      }
      return ok({ ok: true, softDeleted: true });
    } catch (err) {
      if (isForeignKeyError(err)) return conflict("has_dependent_rows");
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
