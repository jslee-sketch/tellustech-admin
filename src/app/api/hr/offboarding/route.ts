import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, conflict, handleFieldError, isUniqueConstraintError, ok, requireString, serverError, trimNonEmpty } from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { Prisma } from "@/generated/prisma/client";

export async function GET() {
  return withSessionContext(async (session) => {
    const rows = await prisma.offboardingCard.findMany({
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
          const offboardingCode = await generateDatedCode({
            prefix: "OFF",
            lookupLast: async (fp) => {
              const last = await prisma.offboardingCard.findFirst({
                where: { offboardingCode: { startsWith: fp } },
                orderBy: { offboardingCode: "desc" },
                select: { offboardingCode: true },
              });
              return last?.offboardingCode ?? null;
            },
          });
          return prisma.offboardingCard.create({
            data: {
              companyCode: session.companyCode,
              offboardingCode,
              employeeId,
              returnedItems: p.returnedItems ? (p.returnedItems as Prisma.InputJsonValue) : Prisma.JsonNull,
              paidItems: p.paidItems ? (p.paidItems as Prisma.InputJsonValue) : Prisma.JsonNull,
              stoppedItems: p.stoppedItems ? (p.stoppedItems as Prisma.InputJsonValue) : Prisma.JsonNull,
              issuedItems: p.issuedItems ? (p.issuedItems as Prisma.InputJsonValue) : Prisma.JsonNull,
              hrSignature: trimNonEmpty(p.hrSignature),
              accountingSignature: trimNonEmpty(p.accountingSignature),
              employeeSignature: trimNonEmpty(p.employeeSignature),
              status: "DRAFT",
            },
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
      );
      return ok({ card: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      if (isUniqueConstraintError(err)) return conflict("already_exists");
      return serverError(err);
    }
  });
}
