import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import { grantPoints } from "@/lib/portal-points";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");
    const { id } = await ctx.params;
    const survey = await prisma.survey.findUnique({ where: { id } });
    if (!survey) return badRequest("survey_not_found");
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const answers = (body as any)?.answers ?? [];
    if (!Array.isArray(answers)) return badRequest("invalid_answers");

    const existing = await prisma.surveyResponse.findUnique({ where: { surveyId_clientId: { surveyId: id, clientId: user.clientId } } });
    if (existing) return badRequest("already_done");

    try {
      const resp = await prisma.surveyResponse.create({ data: { surveyId: id, clientId: user.clientId, answers } });
      const granted = await grantPoints({
        clientId: user.clientId,
        reason: "SURVEY_COMPLETE",
        linkedModel: "Survey",
        linkedId: id,
        customAmount: survey.rewardPoints,
      }).catch(() => null);
      return ok({ response: resp, pointsEarned: granted?.pointsEarned ?? null }, { status: 201 });
    } catch (e) { return serverError(e); }
  });
}
