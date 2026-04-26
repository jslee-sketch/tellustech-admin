import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, handleFieldError, isUniqueConstraintError, conflict, ok, requireString, serverError, trimNonEmpty } from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";

export async function GET() {
  return withSessionContext(async (session) => {
    const rows = await prisma.license.findMany({
      where: { companyCode: session.companyCode },
      orderBy: { expiresAt: "asc" }, take: 500,
      include: { owner: { select: { employeeCode: true, nameVi: true } } },
    });
    return ok({ licenses: rows });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const name = requireString(p.name, "name");
      const acquiredAtStr = requireString(p.acquiredAt, "acquiredAt");
      const expiresAtStr = requireString(p.expiresAt, "expiresAt");
      const acquiredAt = new Date(acquiredAtStr);
      const expiresAt = new Date(expiresAtStr);
      if (Number.isNaN(acquiredAt.getTime()) || Number.isNaN(expiresAt.getTime()) || expiresAt < acquiredAt) {
        return badRequest("invalid_input", { field: "dates" });
      }
      const alertDays = Number(p.alertBeforeDays);
      const alertBeforeDays = Number.isInteger(alertDays) && alertDays >= 0 ? alertDays : 30;

      const renewalCost = trimNonEmpty(p.renewalCost);
      const renewalCostNum = renewalCost ? Number(renewalCost) : null;

      const created = await withUniqueRetry(
        async () => {
          const licenseCode = await generateDatedCode({
            prefix: "LIC",
            lookupLast: async (fp) => {
              const last = await prisma.license.findFirst({
                where: { deletedAt: undefined, licenseCode: { startsWith: fp } },
                orderBy: { licenseCode: "desc" },
                select: { licenseCode: true },
              });
              return last?.licenseCode ?? null;
            },
          });
          return prisma.license.create({
            data: {
              companyCode: session.companyCode,
              licenseCode,
              name,
              ownerEmployeeId: trimNonEmpty(p.ownerEmployeeId),
              acquiredAt,
              expiresAt,
              renewalCost: renewalCostNum !== null && Number.isFinite(renewalCostNum) ? renewalCostNum.toFixed(2) : null,
              alertBeforeDays,
              certificateFileId: trimNonEmpty(p.certificateFileId),
            },
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
      );
      return ok({ license: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
