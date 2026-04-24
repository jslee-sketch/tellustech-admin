import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  companyScope,
  conflict,
  FieldError,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  requireEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import type { BranchType, CompanyCode } from "@/generated/prisma/client";

const BRANCH_TYPES: readonly BranchType[] = ["BN", "HN", "HCM", "NT", "DN"] as const;
const COMPANY_CODES: readonly CompanyCode[] = ["TV", "VR"] as const;

// GET /api/master/departments
// 리스트 — 현재 세션 회사의 부서만. ?q=검색어, ?branch=BN 등 필터.

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const branch = trimNonEmpty(url.searchParams.get("branch"));

    const where = {
      ...companyScope(session),
      ...(branch ? { branchType: branch as BranchType } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const departments = await prisma.department.findMany({
      where,
      orderBy: [{ branchType: "asc" }, { code: "asc" }],
      include: { manager: { select: { id: true, employeeCode: true, nameVi: true } } },
    });

    return ok({ departments });
  });
}

// POST /api/master/departments
// 생성 — 세션 회사에 속한 부서. 관리자(TV+VR) 가 회사코드를 명시적으로 바꾸고 싶으면
// companyCode 필드를 body 에 포함할 수 있지만, allowedCompanies 확인 후에만 허용.

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const payload = body as Record<string, unknown>;

    try {
      const code = requireString(payload.code, "code").toUpperCase();
      const name = requireString(payload.name, "name");
      const branchType = requireEnum(payload.branchType, BRANCH_TYPES, "branchType");

      // 회사코드 선택: body 에 있으면 권한 확인 후 적용, 없으면 세션 회사.
      const explicitCompany = payload.companyCode
        ? requireEnum(payload.companyCode, COMPANY_CODES, "companyCode")
        : null;
      const companyCode = explicitCompany ?? session.companyCode;
      if (!session.allowedCompanies.includes(companyCode)) {
        return badRequest("company_not_allowed", { companyCode });
      }

      // 관리자 ID 검증 (옵션) — 같은 회사의 Employee 여야 함
      const managerId = trimNonEmpty(payload.managerId);
      if (managerId) {
        const manager = await prisma.employee.findUnique({ where: { id: managerId } });
        if (!manager || manager.companyCode !== companyCode) {
          return badRequest("invalid_manager");
        }
      }

      const created = await prisma.department.create({
        data: { companyCode, code, name, branchType, managerId },
      });
      return ok({ department: created }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) {
        return conflict("duplicate_code", { message: "해당 회사에 동일한 부서코드가 존재합니다." });
      }
      return serverError(err);
    }
  });
}
