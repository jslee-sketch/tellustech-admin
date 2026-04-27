import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";

// PATCH /api/admin/quotes/[id]
// body: { action: "assign" | "quote", assignedToId?, quotedAmount?, quotedNote? }
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    const q = await prisma.quoteRequest.findUnique({ where: { id } });
    if (!q) return notFound();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const action = String(p.action ?? "");
    try {
      let updated;
      if (action === "assign") {
        const assignedToId = String(p.assignedToId ?? "").trim();
        if (!assignedToId) return badRequest("assigned_required");
        updated = await prisma.quoteRequest.update({ where: { id }, data: { assignedToId, assignedAt: new Date(), status: "ASSIGNED" } });
      } else if (action === "quote") {
        const quotedAmount = Number(p.quotedAmount ?? 0);
        if (!Number.isFinite(quotedAmount) || quotedAmount <= 0) return badRequest("invalid_amount");
        updated = await prisma.quoteRequest.update({ where: { id }, data: { quotedAmount: String(quotedAmount), quotedNote: String(p.quotedNote ?? "") || null, quotedAt: new Date(), status: "QUOTED" } });
      } else return badRequest("invalid_action");
      return ok({ quote: updated });
    } catch (e) { return serverError(e); }
  });
}
