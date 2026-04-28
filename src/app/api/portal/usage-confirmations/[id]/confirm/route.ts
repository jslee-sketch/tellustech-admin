import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, notFound, ok, serverError } from "@/lib/api-utils";
import { grantPoints } from "@/lib/portal-points";

// POST /api/portal/usage-confirmations/[id]/confirm
// body: { signature: base64 PNG }
// 고객 CFM + 서명 + 포인트 적립
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const { id } = await ctx.params;
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");

    const uc = await prisma.usageConfirmation.findUnique({ where: { id } });
    if (!uc) return notFound();
    if (uc.clientId !== user.clientId) return badRequest("not_yours");
    if (uc.customerConfirmedAt) return badRequest("already_confirmed");

    let body: any;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const signature = String(body?.signature ?? "").trim();
    if (!signature) return badRequest("signature_required");

    try {
      const updated = await prisma.usageConfirmation.update({
        where: { id },
        data: {
          customerConfirmedAt: new Date(),
          customerSignature: signature,
          status: "CUSTOMER_CONFIRMED",
        },
      });
      const granted = await grantPoints({
        clientId: user.clientId,
        reason: "USAGE_CONFIRM",
        linkedModel: "UsageConfirmation",
        linkedId: id,
      }).catch(() => null);
      return ok({
        usageConfirmation: updated,
        pointsEarned: granted?.pointsEarned ?? null,
        pointBalance: granted?.balance ?? null,
      });
    } catch (e) { return serverError(e); }
  });
}
