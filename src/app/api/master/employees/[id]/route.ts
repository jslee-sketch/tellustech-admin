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
  notFound,
  ok,
  optionalEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import type { EmployeeStatus } from "@/generated/prisma/client";

const EMPLOYEE_STATUSES: readonly EmployeeStatus[] = ["ACTIVE", "ON_LEAVE", "TERMINATED"] as const;

type RouteContext = { params: Promise<{ id: string }> };

function parseDateOrNull(value: unknown): Date | null {
  const s = trimNonEmpty(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseSalaryOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { department: { select: { id: true, code: true, name: true } } },
    });
    if (!employee) return notFound();
    if (!session.allowedCompanies.includes(employee.companyCode)) return forbidden();
    return ok({ employee });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const existing = await prisma.employee.findUnique({ where: { id } });
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
      // employeeCode 와 companyCode 는 불변
      const data: Record<string, unknown> = {};

      if (p.nameVi !== undefined) data.nameVi = requireString(p.nameVi, "nameVi");
      if (p.nameEn !== undefined) data.nameEn = trimNonEmpty(p.nameEn);
      if (p.nameKo !== undefined) data.nameKo = trimNonEmpty(p.nameKo);
      if (p.position !== undefined) data.position = trimNonEmpty(p.position);
      if (p.email !== undefined) data.email = trimNonEmpty(p.email);
      if (p.phone !== undefined) data.phone = trimNonEmpty(p.phone);
      if (p.photoUrl !== undefined) data.photoUrl = trimNonEmpty(p.photoUrl);
      if (p.idCardNumber !== undefined) data.idCardNumber = trimNonEmpty(p.idCardNumber);
      if (p.idCardPhotoUrl !== undefined) data.idCardPhotoUrl = trimNonEmpty(p.idCardPhotoUrl);
      if (p.insuranceNumber !== undefined) data.insuranceNumber = trimNonEmpty(p.insuranceNumber);
      if (p.contractType !== undefined) data.contractType = trimNonEmpty(p.contractType);
      if (p.salary !== undefined) data.salary = parseSalaryOrNull(p.salary);
      if (p.contractStart !== undefined) data.contractStart = parseDateOrNull(p.contractStart);
      if (p.contractEnd !== undefined) data.contractEnd = parseDateOrNull(p.contractEnd);
      if (p.hireDate !== undefined) data.hireDate = parseDateOrNull(p.hireDate);
      if (p.status !== undefined) {
        const s = optionalEnum(p.status, EMPLOYEE_STATUSES);
        if (!s) return badRequest("invalid_input", { field: "status" });
        data.status = s;
      }

      if (p.departmentId !== undefined) {
        const deptId = trimNonEmpty(p.departmentId);
        if (!deptId) return badRequest("invalid_input", { field: "departmentId" });
        const dept = await prisma.department.findUnique({ where: { id: deptId } });
        if (!dept || dept.companyCode !== existing.companyCode) {
          return badRequest("invalid_department");
        }
        data.departmentId = deptId;
      }

      if (Object.keys(data).length === 0) return ok({ employee: existing });

      const updated = await prisma.employee.update({ where: { id }, data });
      return ok({ employee: updated });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}

export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) return notFound();
    if (!session.allowedCompanies.includes(existing.companyCode)) return forbidden();

    try {
      await prisma.employee.delete({ where: { id } });
      return ok({ ok: true });
    } catch (err) {
      if (isForeignKeyError(err)) {
        return conflict("has_dependent_rows", {
          message:
            "이 직원에 연결된 사용자 계정·입사카드·평가·AS 배정 등이 있어 삭제할 수 없습니다. 상태를 '퇴사'로 변경해 주세요.",
        });
      }
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
