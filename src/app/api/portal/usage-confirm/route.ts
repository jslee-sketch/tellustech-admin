import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, requireString, serverError } from "@/lib/api-utils";
import { grantPoints } from "@/lib/portal-points";

// POST /api/portal/usage-confirm
// body: { billingId: string, signature: string }
// 권한: role=CLIENT 만. billing.itContract.clientId === user.clientId 검증.
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return forbidden();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;

    try {
      const billingId = requireString(p.billingId, "billingId");
      const signature = requireString(p.signature, "signature");

      const user = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { clientId: true },
      });
      if (!user?.clientId) return forbidden();

      const billing = await prisma.itMonthlyBilling.findUnique({
        where: { id: billingId },
        include: { itContract: { select: { clientId: true } } },
      });
      if (!billing) return notFound();
      if (billing.itContract.clientId !== user.clientId) return forbidden();
      if (billing.customerSignature) {
        return badRequest("already_confirmed");
      }

      const updated = await prisma.itMonthlyBilling.update({
        where: { id: billingId },
        data: { customerSignature: signature },
      });
      const granted = await grantPoints({
        clientId: user.clientId,
        reason: "USAGE_CONFIRM",
        linkedModel: "ItMonthlyBilling",
        linkedId: billingId,
      }).catch(() => null);
      return ok({
        billing: updated,
        pointsEarned: granted?.pointsEarned ?? null,
        pointBalance: granted?.balance ?? null,
      });
    } catch (err) {
      return serverError(err);
    }
  });
}
