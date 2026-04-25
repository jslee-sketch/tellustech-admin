import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { forbidden, notFound, ok, serverError } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/weekly-report/backlogs/[id]/confirm — 상급자 CFM (ADMIN/MANAGER 만)
export async function POST(_req: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    if (!["ADMIN", "MANAGER"].includes(session.role)) return forbidden();
    const { id } = await context.params;
    const b = await prisma.weeklyBacklog.findUnique({ where: { id }, select: { companyCode: true, confirmedAt: true } });
    if (!b || b.companyCode !== session.companyCode) return notFound();
    try {
      const updated = await prisma.weeklyBacklog.update({
        where: { id },
        data: { confirmedById: session.sub, confirmedAt: new Date() },
      });
      return ok({ backlog: updated });
    } catch (err) {
      return serverError(err);
    }
  });
}
