import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, requireString, serverError } from "@/lib/api-utils";

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
      return ok({ billing: updated });
    } catch (err) {
      return serverError(err);
    }
  });
}
