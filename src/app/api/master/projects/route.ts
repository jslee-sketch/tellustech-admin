import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  companyScope,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  optionalEnum,
  requireEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import type { CompanyCode, SalesType } from "@/generated/prisma/client";

const SALES_TYPES: readonly SalesType[] = [
  "TRADE",
  "MAINTENANCE",
  "RENTAL",
  "CALIBRATION",
  "REPAIR",
  "OTHER",
] as const;

const COMPANY_CODES: readonly CompanyCode[] = ["TV", "VR"] as const;

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const salesType = optionalEnum(url.searchParams.get("salesType"), SALES_TYPES);

    const where = {
      ...companyScope(session),
      ...(salesType ? { salesType } : {}),
      ...(q
        ? {
            OR: [
              { projectCode: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const projects = await prisma.project.findMany({
      where,
      orderBy: { projectCode: "asc" },
    });
    return ok({ projects });
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
      const projectCode = requireString(p.projectCode, "projectCode").toUpperCase();
      const name = requireString(p.name, "name");
      const salesType = requireEnum(p.salesType, SALES_TYPES, "salesType");

      const explicit = p.companyCode
        ? requireEnum(p.companyCode, COMPANY_CODES, "companyCode")
        : null;
      const companyCode = explicit ?? session.companyCode;
      if (!session.allowedCompanies.includes(companyCode)) {
        return badRequest("company_not_allowed");
      }

      const created = await prisma.project.create({
        data: { companyCode, projectCode, name, salesType },
      });
      return ok({ project: created }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
