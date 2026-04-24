import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  companyScope,
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
  trimNonEmpty,
} from "@/lib/api-utils";
import type { BranchType } from "@/generated/prisma/client";

const BRANCH_TYPES: readonly BranchType[] = ["BN", "HN", "HCM", "NT", "DN"] as const;

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/master/departments/[id]

export async function GET(_request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const dept = await prisma.department.findUnique({
      where: { id },
      include: { manager: { select: { id: true, employeeCode: true, nameVi: true } } },
    });
    if (!dept) return notFound();
    if (dept.companyCode !== session.companyCode && !session.allowedCompanies.includes(dept.companyCode)) {
      return forbidden();
    }
    return ok({ department: dept });
  });
}

// PATCH /api/master/departments/[id]
// 부분 업데이트. code/name/branchType/managerId 만 변경 가능.

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const payload = body as Record<string, unknown>;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return notFound();
    if (!session.allowedCompanies.includes(existing.companyCode)) return forbidden();

    try {
      const data: Record<string, unknown> = {};
      if (payload.code !== undefined) data.code = requireString(payload.code, "code").toUpperCase();
      if (payload.name !== undefined) data.name = requireString(payload.name, "name");
      if (payload.branchType !== undefined) {
        data.branchType = requireEnum(payload.branchType, BRANCH_TYPES, "branchType");
      }
      if (payload.managerId !== undefined) {
        const managerId = trimNonEmpty(payload.managerId);
        if (managerId) {
          const manager = await prisma.employee.findUnique({ where: { id: managerId } });
          if (!manager || manager.companyCode !== existing.companyCode) {
            return badRequest("invalid_manager");
          }
          data.managerId = managerId;
        } else {
          data.managerId = null;
        }
      }

      if (Object.keys(data).length === 0) {
        return ok({ department: existing });
      }

      const updated = await prisma.department.update({ where: { id }, data });
      return ok({ department: updated });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) {
        return conflict("duplicate_code");
      }
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}

// DELETE /api/master/departments/[id]
// 직원이 배정된 부서는 삭제 거부 (FK 제약으로 DB가 막음).

export async function DELETE(_request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return notFound();
    if (!session.allowedCompanies.includes(existing.companyCode)) return forbidden();

    // 회사 스코프 밖의 삭제 방지 — 세션 회사가 아닌 경우는 최소 확인을 거쳤으니 허용.
    // (멀티컴퍼니 관리자는 소유 회사의 부서만 지울 수 있음)
    void companyScope(session);

    try {
      await prisma.department.delete({ where: { id } });
      return ok({ ok: true });
    } catch (err) {
      if (isForeignKeyError(err)) {
        return conflict("has_dependent_employees", {
          message: "이 부서에 배정된 직원이 있어 삭제할 수 없습니다. 먼저 직원을 다른 부서로 옮겨 주세요.",
        });
      }
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
