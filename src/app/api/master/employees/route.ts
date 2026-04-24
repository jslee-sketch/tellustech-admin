import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  companyScope,
  conflict,
  forbidden,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  optionalEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { generateSequentialCode, withUniqueRetry } from "@/lib/code-generator";
import type { CompanyCode, EmployeeStatus } from "@/generated/prisma/client";

const COMPANY_CODES: readonly CompanyCode[] = ["TV", "VR"] as const;
const EMPLOYEE_STATUSES: readonly EmployeeStatus[] = ["ACTIVE", "ON_LEAVE", "TERMINATED"] as const;

// 직원 코드 prefix: TV → TNV-###, VR → VNV-###
function codePrefix(company: CompanyCode): string {
  return company === "TV" ? "TNV-" : "VNV-";
}

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

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const deptId = trimNonEmpty(url.searchParams.get("department"));
    const status = optionalEnum(url.searchParams.get("status"), EMPLOYEE_STATUSES);

    const where = {
      ...companyScope(session),
      ...(deptId ? { departmentId: deptId } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { employeeCode: { contains: q, mode: "insensitive" as const } },
              { nameVi: { contains: q, mode: "insensitive" as const } },
              { nameEn: { contains: q, mode: "insensitive" as const } },
              { nameKo: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const employees = await prisma.employee.findMany({
      where,
      orderBy: [{ status: "asc" }, { employeeCode: "asc" }],
      include: {
        department: { select: { id: true, code: true, name: true } },
      },
    });
    return ok({ employees });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      // 회사 결정
      const explicit = p.companyCode
        ? (String(p.companyCode).toUpperCase() as CompanyCode)
        : null;
      const companyCode = (explicit ?? session.companyCode) as CompanyCode;
      if (!COMPANY_CODES.includes(companyCode)) return badRequest("invalid_input", { field: "companyCode" });
      if (!session.allowedCompanies.includes(companyCode)) {
        return forbidden();
      }

      const nameVi = requireString(p.nameVi, "nameVi");
      const departmentId = trimNonEmpty(p.departmentId);
      if (!departmentId) return badRequest("invalid_input", { field: "departmentId" });

      const department = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!department || department.companyCode !== companyCode) {
        return badRequest("invalid_department");
      }

      const status = optionalEnum(p.status, EMPLOYEE_STATUSES) ?? "ACTIVE";

      const data = {
        companyCode,
        departmentId,
        nameVi,
        nameEn: trimNonEmpty(p.nameEn),
        nameKo: trimNonEmpty(p.nameKo),
        position: trimNonEmpty(p.position),
        email: trimNonEmpty(p.email),
        phone: trimNonEmpty(p.phone),
        photoUrl: trimNonEmpty(p.photoUrl),
        idCardNumber: trimNonEmpty(p.idCardNumber),
        idCardPhotoUrl: trimNonEmpty(p.idCardPhotoUrl),
        salary: parseSalaryOrNull(p.salary),
        insuranceNumber: trimNonEmpty(p.insuranceNumber),
        contractType: trimNonEmpty(p.contractType),
        contractStart: parseDateOrNull(p.contractStart),
        contractEnd: parseDateOrNull(p.contractEnd),
        hireDate: parseDateOrNull(p.hireDate),
        status: status as EmployeeStatus,
      };

      const created = await withUniqueRetry(
        async () => {
          const employeeCode = await generateSequentialCode({
            prefix: codePrefix(companyCode),
            lookupLast: async (prefix) => {
              const last = await prisma.employee.findFirst({
                where: { companyCode, employeeCode: { startsWith: prefix } },
                orderBy: { employeeCode: "desc" },
                select: { employeeCode: true },
              });
              return last?.employeeCode ?? null;
            },
          });
          return prisma.employee.create({
            data: { ...data, employeeCode },
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
      );

      return ok({ employee: created }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
