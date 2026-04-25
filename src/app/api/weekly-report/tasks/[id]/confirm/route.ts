import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { forbidden, notFound, ok, serverError } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    if (!["ADMIN", "MANAGER"].includes(session.role)) return forbidden();
    const { id } = await context.params;
    const t = await prisma.weeklyTask.findUnique({ where: { id }, select: { companyCode: true } });
    if (!t || t.companyCode !== session.companyCode) return notFound();
    try {
      const updated = await prisma.weeklyTask.update({
        where: { id },
        data: { confirmedById: session.sub, confirmedAt: new Date() },
      });
      return ok({ task: updated });
    } catch (err) {
      return serverError(err);
    }
  });
}
