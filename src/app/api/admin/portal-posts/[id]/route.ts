import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const data: any = {};
    if (typeof p.isPublished === "boolean") {
      data.isPublished = p.isPublished;
      if (p.isPublished) data.publishedAt = new Date();
    }
    if (typeof p.isPinned === "boolean") data.isPinned = p.isPinned;
    if (typeof p.bonusPoints === "number") data.bonusPoints = p.bonusPoints;
    try {
      const post = await prisma.portalPost.update({ where: { id }, data });
      return ok({ post });
    } catch (e) { return serverError(e); }
  });
}

export async function DELETE(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    try {
      await prisma.portalPost.delete({ where: { id } });
      return ok({ ok: true });
    } catch (e) { return serverError(e); }
  });
}
