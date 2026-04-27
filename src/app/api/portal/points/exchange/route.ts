import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import { deductPoints } from "@/lib/portal-points";

// POST /api/portal/points/exchange
// body: { rewardType: "INVOICE_DEDUCT" | "GIFT_CARD", amount: number (단위 1,000,000) }
const MIN_EXCHANGE = 1_000_000;

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const rewardType = p.rewardType;
    const amount = Number(p.amount ?? 0);

    if (rewardType !== "INVOICE_DEDUCT" && rewardType !== "GIFT_CARD") return badRequest("invalid_reward_type");
    if (!Number.isFinite(amount) || amount < MIN_EXCHANGE) return badRequest("minimum_1m");
    if (amount % MIN_EXCHANGE !== 0) return badRequest("must_be_million_unit");

    try {
      const reward = await prisma.portalReward.create({
        data: {
          clientId: user.clientId,
          rewardType: rewardType as "INVOICE_DEDUCT" | "GIFT_CARD",
          pointsUsed: amount,
          status: "PENDING",
        },
      });
      const result = await deductPoints({
        clientId: user.clientId,
        amount,
        reason: "REWARD_EXCHANGE",
        linkedModel: "PortalReward",
        linkedId: reward.id,
      });
      if (result === "INSUFFICIENT") {
        // rollback the reward record
        await prisma.portalReward.delete({ where: { id: reward.id } });
        return badRequest("insufficient_points");
      }
      return ok({ reward, balance: result?.balance ?? 0 }, { status: 201 });
    } catch (e) { return serverError(e); }
  });
}
