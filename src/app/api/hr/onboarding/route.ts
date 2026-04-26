import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, conflict, handleFieldError, isUniqueConstraintError, ok, requireString, serverError, trimNonEmpty } from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { Prisma } from "@/generated/prisma/client";

export async function GET() {
  return withSessionContext(async (session) => {
    const rows = await prisma.onboardingCard.findMany({
      where: { companyCode: session.companyCode },
      orderBy: { createdAt: "desc" }, take: 200,
      include: { employee: { select: { employeeCode: true, nameVi: true } } },
    });
    return ok({ cards: rows });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const employeeId = requireString(p.employeeId, "employeeId");
      const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { companyCode: true } });
      if (!emp || emp.companyCode !== session.companyCode) return badRequest("invalid_employee");
      const created = await withUniqueRetry(
        async () => {
          const onboardingCode = await generateDatedCode({
            prefix: "ONB",
            lookupLast: async (fp) => {
              const last = await prisma.onboardingCard.findFirst({
                where: { deletedAt: undefined, onboardingCode: { startsWith: fp } },
                orderBy: { onboardingCode: "desc" },
                select: { onboardingCode: true },
              });
              return last?.onboardingCode ?? null;
            },
          });
          return prisma.onboardingCard.create({
            data: {
              companyCode: session.companyCode,
              onboardingCode,
              employeeId,
              personalInfo: (p.personalInfo ?? {}) as Prisma.InputJsonValue,
              education: p.education ? (p.education as Prisma.InputJsonValue) : Prisma.JsonNull,
              consentSignature: trimNonEmpty(p.consentSignature),
              profilePhotoId: trimNonEmpty(p.profilePhotoId),
              status: "DRAFT",
            },
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
      );
      return ok({ card: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      if (isUniqueConstraintError(err)) return conflict("already_exists", { message: "이 직원의 입사카드가 이미 존재합니다." });
      return serverError(err);
    }
  });
}
