import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  notFound,
  ok,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";

// POST /api/master/licenses/[id]/renew
// body: { newExpiresAt: ISO, renewalCost?: number, certificateFileId?: string }
// 갱신: 새 License 행 생성 (acquiredAt = old.expiresAt + 1, expiresAt = newExpiresAt) +
//       차기 만기 알림용 Schedule 자동 생성 (LIC 만기 D-30 기본).
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;

    try {
      const newExpiresAtStr = requireString(p.newExpiresAt, "newExpiresAt");
      const newExpiresAt = new Date(newExpiresAtStr);
      if (Number.isNaN(newExpiresAt.getTime())) return badRequest("invalid_input", { field: "newExpiresAt" });

      const old = await prisma.license.findUnique({ where: { id } });
      if (!old) return notFound();
      if (old.companyCode !== session.companyCode) return notFound();
      if (newExpiresAt <= old.expiresAt) {
        return badRequest("invalid_input", { field: "newExpiresAt", reason: "must_be_after_old" });
      }

      const renewalCostRaw = trimNonEmpty(p.renewalCost);
      const renewalCostNum = renewalCostRaw ? Number(renewalCostRaw) : null;
      const certificateFileId = trimNonEmpty(p.certificateFileId);

      // 새 License + Schedule 한 트랜잭션
      const result = await withUniqueRetry(
        async () => {
          const newCode = await generateDatedCode({
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
          const schCode = await generateDatedCode({
            prefix: "SCH",
            lookupLast: async (fp) => {
              const last = await prisma.schedule.findFirst({
                where: { deletedAt: undefined, scheduleCode: { startsWith: fp } },
                orderBy: { scheduleCode: "desc" },
                select: { scheduleCode: true },
              });
              return last?.scheduleCode ?? null;
            },
          });
          return prisma.$transaction(async (tx) => {
            const acquiredAt = new Date(old.expiresAt.getTime() + 24 * 60 * 60 * 1000);
            const created = await tx.license.create({
              data: {
                companyCode: session.companyCode,
                licenseCode: newCode,
                name: old.name,
                ownerEmployeeId: old.ownerEmployeeId,
                acquiredAt,
                expiresAt: newExpiresAt,
                renewalCost:
                  renewalCostNum !== null && Number.isFinite(renewalCostNum)
                    ? renewalCostNum.toFixed(2)
                    : old.renewalCost,
                alertBeforeDays: old.alertBeforeDays ?? 30,
                certificateFileId: certificateFileId ?? null,
              },
            });
            // 차기 만기 알림용 일정: 만료 N일 전 dueAt
            const alertDays = created.alertBeforeDays ?? 30;
            const dueAt = new Date(newExpiresAt.getTime() - alertDays * 24 * 60 * 60 * 1000);
            await tx.schedule.create({
              data: {
                companyCode: session.companyCode,
                scheduleCode: schCode,
                title: `라이선스 만기 임박 — ${created.name} (${created.licenseCode})`,
                dueAt,
                alertBeforeHours: 24,
                relatedModule: "LICENSE",
              },
            });
            return created;
          });
        },
        { isConflict: isUniqueConstraintError },
      );

      return ok({ license: result }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err);
      if (h) return h;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
