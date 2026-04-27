import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError, trimNonEmpty } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    const fb = await prisma.portalFeedback.findUnique({ where: { id } });
    if (!fb) return notFound();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const replyVi = trimNonEmpty(p.replyVi);
      const replyEn = trimNonEmpty(p.replyEn);
      const replyKo = trimNonEmpty(p.replyKo);
      const data: any = {};
      if (replyVi || replyEn || replyKo) {
        const filled = await fillTranslations({ vi: replyVi ?? null, en: replyEn ?? null, ko: replyKo ?? null, originalLang: replyKo ? "KO" : replyVi ? "VI" : "EN" });
        data.replyVi = filled.vi; data.replyEn = filled.en; data.replyKo = filled.ko;
        data.repliedAt = new Date();
        data.repliedById = session.sub;
        data.status = "REPLIED";
      }
      if (p.status && ["RECEIVED", "REVIEWED", "REPLIED"].includes(String(p.status))) {
        data.status = p.status;
      }
      if (Object.keys(data).length === 0) return ok({ feedback: fb });
      const updated = await prisma.portalFeedback.update({ where: { id }, data });
      return ok({ feedback: updated });
    } catch (e) { return serverError(e); }
  });
}
