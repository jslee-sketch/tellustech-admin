import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";

// POST /api/usage-confirmations/[id]/admin-confirm
export async function POST(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    const uc = await prisma.usageConfirmation.findUnique({ where: { id } });
    if (!uc) return notFound();
    if (uc.status !== "CUSTOMER_CONFIRMED") return badRequest("invalid_state", { current: uc.status, expected: "CUSTOMER_CONFIRMED" });
    try {
      const updated = await prisma.usageConfirmation.update({
        where: { id },
        data: { adminConfirmedAt: new Date(), adminConfirmedById: session.sub, status: "ADMIN_CONFIRMED" },
      });
      return ok({ usageConfirmation: updated });
    } catch (e) { return serverError(e); }
  });
}
