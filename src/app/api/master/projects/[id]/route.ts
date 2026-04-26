import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/record-policy";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  forbidden,
  handleFieldError,
  isForeignKeyError,
  isRecordNotFoundError,
  isUniqueConstraintError,
  notFound,
  ok,
  requireEnum,
  requireString,
  serverError,
} from "@/lib/api-utils";
import type { SalesType } from "@/generated/prisma/client";

const SALES_TYPES: readonly SalesType[] = [
  "TRADE",
  "MAINTENANCE",
  "RENTAL",
  "CALIBRATION",
  "REPAIR",
  "OTHER",
] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return notFound();
    if (!session.allowedCompanies.includes(project.companyCode)) return forbidden();
    return ok({ project });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return notFound();
    const _v = canEdit(existing);
    if (!_v.allowed) return conflict(_v.reason);
    if (!session.allowedCompanies.includes(existing.companyCode)) return forbidden();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const data: Record<string, unknown> = {};
      if (p.projectCode !== undefined)
        data.projectCode = requireString(p.projectCode, "projectCode").toUpperCase();
      if (p.name !== undefined) data.name = requireString(p.name, "name");
      if (p.salesType !== undefined) data.salesType = requireEnum(p.salesType, SALES_TYPES, "salesType");

      if (Object.keys(data).length === 0) return ok({ project: existing });

      const updated = await prisma.project.update({ where: { id }, data });
      return ok({ project: updated });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}

export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return notFound();
    if (!session.allowedCompanies.includes(existing.companyCode)) return forbidden();

    try {
      await prisma.project.delete({ where: { id } });
      return ok({ ok: true });
    } catch (err) {
      if (isForeignKeyError(err)) {
        return conflict("has_dependent_rows", {
          message: "이 프로젝트에 연결된 매출/매입 이력이 있어 삭제할 수 없습니다.",
        });
      }
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
