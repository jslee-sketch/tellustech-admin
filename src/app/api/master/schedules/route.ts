import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, conflict, handleFieldError, isUniqueConstraintError, ok, requireString, serverError, trimNonEmpty } from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";

export async function GET() {
  return withSessionContext(async (session) => {
    const rows = await prisma.schedule.findMany({
      where: { companyCode: session.companyCode },
      orderBy: { dueAt: "asc" }, take: 500,
    });
    return ok({ schedules: rows });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const title = requireString(p.title, "title");
      const dueAtStr = requireString(p.dueAt, "dueAt");
      const dueAt = new Date(dueAtStr);
      if (Number.isNaN(dueAt.getTime())) return badRequest("invalid_input", { field: "dueAt" });

      const targetIds = Array.isArray(p.targetEmployeeIds) ? (p.targetEmployeeIds as string[]).filter((x) => typeof x === "string") : [];
      const reporterIds = Array.isArray(p.reporterEmployeeIds) ? (p.reporterEmployeeIds as string[]).filter((x) => typeof x === "string") : [];

      const alertH = Number(p.alertBeforeHours);
      const alertBeforeHours = Number.isInteger(alertH) && alertH >= 0 ? alertH : null;

      const created = await withUniqueRetry(
        async () => {
          const scheduleCode = await generateDatedCode({
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
          return prisma.schedule.create({
            data: {
              companyCode: session.companyCode,
              scheduleCode,
              title,
              dueAt,
              repeatCron: trimNonEmpty(p.repeatCron),
              alertBeforeHours,
              relatedModule: trimNonEmpty(p.relatedModule),
              targets: targetIds.length > 0 ? { connect: targetIds.map((id) => ({ id })) } : undefined,
              reporters: reporterIds.length > 0 ? { connect: reporterIds.map((id) => ({ id })) } : undefined,
            },
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
      );
      return ok({ schedule: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      return serverError(err);
    }
  });
}
