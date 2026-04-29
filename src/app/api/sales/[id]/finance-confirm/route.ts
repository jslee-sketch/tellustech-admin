import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, conflict, forbidden, notFound, ok, serverError } from "@/lib/api-utils";

// POST   /api/sales/[id]/finance-confirm — 재경 CFM
// DELETE /api/sales/[id]/finance-confirm — 잠금 해제 (ADMIN 만)
export async function POST(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    const sale = await prisma.sales.findUnique({ where: { id } });
    if (!sale) return notFound();
    if (sale.isDraft) return badRequest("invalid_state", { reason: "still_draft_must_be_confirmed_first" });
    if (sale.financeConfirmedAt) return conflict("already_finance_confirmed");
    try {
      await prisma.sales.update({
        where: { id },
        data: { financeConfirmedAt: new Date(), financeConfirmedById: session.sub },
      });
      return ok({ ok: true });
    } catch (err) {
      return serverError(err);
    }
  });
}

export async function DELETE(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN") return forbidden("admin_only");
    const { id } = await ctx.params;
    const sale = await prisma.sales.findUnique({ where: { id } });
    if (!sale) return notFound();
    try {
      await prisma.sales.update({
        where: { id },
        data: { financeConfirmedAt: null, financeConfirmedById: null },
      });
      return ok({ ok: true });
    } catch (err) {
      return serverError(err);
    }
  });
}
