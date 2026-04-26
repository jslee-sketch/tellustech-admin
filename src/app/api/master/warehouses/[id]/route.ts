import { prisma } from "@/lib/prisma";
import { dependentsPreview, softDeleteOne } from "@/lib/api/crud";
import { canEdit } from "@/lib/record-policy";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isForeignKeyError,
  isRecordNotFoundError,
  isUniqueConstraintError,
  notFound,
  ok,
  optionalEnum,
  requireEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import type { BranchType, WarehouseType } from "@/generated/prisma/client";

const WAREHOUSE_TYPES: readonly WarehouseType[] = ["INTERNAL", "EXTERNAL", "CLIENT"] as const;
const BRANCH_TYPES: readonly BranchType[] = ["BN", "HN", "HCM", "NT", "DN"] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) return notFound();
    return ok({ warehouse });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const existing = await prisma.warehouse.findUnique({ where: { id } });
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
      const data: Record<string, unknown> = {};
      if (p.code !== undefined) data.code = requireString(p.code, "code").toUpperCase();
      if (p.name !== undefined) data.name = requireString(p.name, "name");
      if (p.warehouseType !== undefined) {
        data.warehouseType = requireEnum(p.warehouseType, WAREHOUSE_TYPES, "warehouseType");
      }
      if (p.branchType !== undefined) data.branchType = optionalEnum(p.branchType, BRANCH_TYPES);
      if (p.location !== undefined) data.location = trimNonEmpty(p.location);

      if (Object.keys(data).length === 0) return ok({ warehouse: existing });

      const updated = await prisma.warehouse.update({ where: { id }, data });
      return ok({ warehouse: updated });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
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
      const counts = await dependentsPreview("Warehouse", id);
      return ok({ preview: true, dependents: counts });
    }
    try {
      const result = await softDeleteOne("Warehouse", id);
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
