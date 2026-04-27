import { prisma } from "@/lib/prisma";
import { dependentsPreview, softDeleteOne } from "@/lib/api/crud";
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
import { fillTranslations } from "@/lib/translate";
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

      // 이름 — 어느 한 언어 변경 시 자동 3언어 재번역
      const viCh = p.nameVi !== undefined, enCh = p.nameEn !== undefined, koCh = p.nameKo !== undefined;
      if (viCh || enCh || koCh) {
        const inVi = viCh ? trimNonEmpty(p.nameVi) : existing.nameVi;
        const inEn = enCh ? trimNonEmpty(p.nameEn) : existing.nameEn;
        const inKo = koCh ? trimNonEmpty(p.nameKo) : existing.nameKo;
        const sourceLang: "VI" | "EN" | "KO" =
          viCh && trimNonEmpty(p.nameVi) ? "VI"
          : koCh && trimNonEmpty(p.nameKo) ? "KO"
          : enCh && trimNonEmpty(p.nameEn) ? "EN"
          : (inVi ? "VI" : inKo ? "KO" : "EN");
        const refilled = await fillTranslations({ vi: inVi, en: inEn, ko: inKo, originalLang: sourceLang });
        if (refilled.vi) data.nameVi = refilled.vi;
        if (refilled.en !== undefined) data.nameEn = refilled.en;
        if (refilled.ko !== undefined) data.nameKo = refilled.ko;
      }
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

export async function DELETE(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const url = new URL(request.url);
    if (url.searchParams.get("preview") === "1") {
      const counts = await dependentsPreview("Employee", id);
      return ok({ preview: true, dependents: counts });
    }
    try {
      const result = await softDeleteOne("Employee", id);
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
