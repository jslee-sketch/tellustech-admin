import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";

// GET /api/portal/surveys — 진행중 서베이 + 본인 참여 여부
export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");
    try {
      const now = new Date();
      const surveys = await prisma.survey.findMany({
        where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
        orderBy: { createdAt: "desc" },
      });
      const responses = await prisma.surveyResponse.findMany({
        where: { clientId: user.clientId, surveyId: { in: surveys.map((s) => s.id) } },
        select: { surveyId: true },
      });
      const doneSet = new Set(responses.map((r) => r.surveyId));
      const items = surveys.map((s) => ({ ...s, alreadyDone: doneSet.has(s.id) }));
      return ok({ items });
    } catch (e) { return serverError(e); }
  });
}
