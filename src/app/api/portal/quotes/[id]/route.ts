import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, notFound, ok, serverError } from "@/lib/api-utils";

// PATCH /api/portal/quotes/[id] — 고객이 견적 수락/거절
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");
    const { id } = await ctx.params;
    const q = await prisma.quoteRequest.findUnique({ where: { id } });
    if (!q || q.clientId !== user.clientId) return notFound();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const action = String((body as any)?.action ?? "");
    try {
      let next: "ACCEPTED" | "REJECTED";
      if (action === "accept") next = "ACCEPTED";
      else if (action === "reject") next = "REJECTED";
      else return badRequest("invalid_action");
      if (q.status !== "QUOTED") return badRequest("invalid_state");
      const updated = await prisma.quoteRequest.update({ where: { id }, data: { status: next } });
      return ok({ quote: updated });
    } catch (e) { return serverError(e); }
  });
}
