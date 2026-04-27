import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";

// PATCH /api/admin/portal-rewards/[id]
// body: { action: "approve" | "reject" | "deliver", appliedToInvoiceId?, deliveryNote? }
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    const { id } = await ctx.params;
    const reward = await prisma.portalReward.findUnique({ where: { id } });
    if (!reward) return notFound();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const action = String(p.action ?? "");
    try {
      let updated;
      if (action === "approve") {
        if (reward.status !== "PENDING") return badRequest("invalid_state");
        updated = await prisma.portalReward.update({
          where: { id },
          data: { status: "APPROVED", approvedAt: new Date(), approvedById: session.sub },
        });
      } else if (action === "reject") {
        if (reward.status !== "PENDING") return badRequest("invalid_state");
        updated = await prisma.portalReward.update({
          where: { id },
          data: { status: "REJECTED" },
        });
        // 차감했던 포인트 복구
        await prisma.portalPoint.create({
          data: {
            clientId: reward.clientId,
            amount: reward.pointsUsed,
            reason: "ADMIN_GRANT",
            reasonDetail: `교환 거절 환원 (Reward ID ${id})`,
            issuedById: session.sub,
            linkedModel: "PortalReward",
            linkedId: id,
          },
        });
      } else if (action === "deliver") {
        if (reward.status !== "APPROVED") return badRequest("invalid_state");
        const data: any = { status: "DELIVERED", deliveredAt: new Date() };
        if (reward.rewardType === "INVOICE_DEDUCT") {
          const inv = String(p.appliedToInvoiceId ?? "").trim();
          if (!inv) return badRequest("invoice_required");
          data.appliedToInvoiceId = inv;
        } else {
          const note = String(p.deliveryNote ?? "").trim();
          if (!note) return badRequest("delivery_note_required");
          data.deliveryNote = note;
        }
        updated = await prisma.portalReward.update({ where: { id }, data });
      } else {
        return badRequest("invalid_action");
      }
      return ok({ reward: updated });
    } catch (e) { return serverError(e); }
  });
}
