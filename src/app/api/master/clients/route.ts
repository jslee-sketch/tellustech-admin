import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  optionalEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import type { ClientGrade, Industry, ReceivableStatus } from "@/generated/prisma/client";

// Client 는 공유 마스터 — 회사 스코프 없음.
// clientCode 자동 생성: CL-YYMMDD-### (가이드 규칙)

const GRADES: readonly ClientGrade[] = ["A", "B", "C", "D"] as const;
const RECV: readonly ReceivableStatus[] = ["NORMAL", "WARNING", "BLOCKED"] as const;
const INDUSTRIES: readonly Industry[] = [
  "MANUFACTURING",
  "LOGISTICS",
  "EDUCATION",
  "IT",
  "OTHER",
] as const;

function parsePaymentTermsOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 365) return null;
  return n;
}

export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const grade = optionalEnum(url.searchParams.get("grade"), GRADES);
    const receivable = optionalEnum(url.searchParams.get("receivable"), RECV);

    const where = {
      ...(grade ? { grade } : {}),
      ...(receivable ? { receivableStatus: receivable } : {}),
      ...(q
        ? {
            OR: [
              { clientCode: { contains: q, mode: "insensitive" as const } },
              { companyNameVi: { contains: q, mode: "insensitive" as const } },
              { companyNameEn: { contains: q, mode: "insensitive" as const } },
              { companyNameKo: { contains: q, mode: "insensitive" as const } },
              { taxCode: { contains: q, mode: "insensitive" as const } },
              { phone: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const clients = await prisma.client.findMany({
      where,
      orderBy: { clientCode: "desc" },
      take: 500,
    });
    return ok({ clients });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const companyNameVi = requireString(p.companyNameVi, "companyNameVi");

      const created = await withUniqueRetry(
        async () => {
          const clientCode = await generateDatedCode({
            prefix: "CL",
            lookupLast: async (fullPrefix) => {
              const last = await prisma.client.findFirst({
                where: { clientCode: { startsWith: fullPrefix } },
                orderBy: { clientCode: "desc" },
                select: { clientCode: true },
              });
              return last?.clientCode ?? null;
            },
          });
          return prisma.client.create({
            data: {
              clientCode,
              companyNameVi,
              companyNameEn: trimNonEmpty(p.companyNameEn),
              companyNameKo: trimNonEmpty(p.companyNameKo),
              representative: trimNonEmpty(p.representative),
              taxCode: trimNonEmpty(p.taxCode),
              businessLicenseNo: trimNonEmpty(p.businessLicenseNo),
              industry: optionalEnum(p.industry, INDUSTRIES),
              bankAccountNumber: trimNonEmpty(p.bankAccountNumber),
              bankName: trimNonEmpty(p.bankName),
              bankHolder: trimNonEmpty(p.bankHolder),
              paymentTerms: parsePaymentTermsOrNull(p.paymentTerms),
              address: trimNonEmpty(p.address),
              phone: trimNonEmpty(p.phone),
              email: trimNonEmpty(p.email),
              emailConsent: Boolean(p.emailConsent),
              notes: trimNonEmpty(p.notes),
            },
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
      );

      return ok({ client: created }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
