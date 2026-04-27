import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";
import { grantPoints } from "@/lib/portal-points";
import type { ReferralStatus } from "@/generated/prisma/client";

const VALID_STATUS: ReferralStatus[] = ["SUBMITTED", "CONTACTED", "MEETING", "CONTRACTED", "PAID", "DECLINED"];

// PATCH /api/admin/referrals/[id]
// body: { action: "status" | "first_payment", status?, assignedToId? }
//   "first_payment" → status=PAID + 100,000d 적립 트리거 (REFERRAL_CONTRACT)
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    const ref = await prisma.referral.findUnique({ where: { id } });
    if (!ref) return notFound();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const action = String(p.action ?? "");
    try {
      if (action === "status") {
        const status = String(p.status ?? "") as ReferralStatus;
        if (!VALID_STATUS.includes(status)) return badRequest("invalid_status");
        const updated = await prisma.referral.update({ where: { id }, data: { status, assignedToId: p.assignedToId ? String(p.assignedToId) : ref.assignedToId } });
        return ok({ referral: updated });
      }
      if (action === "first_payment") {
        if (ref.status === "PAID" || ref.contractPointId) return badRequest("already_paid");
        const granted = await grantPoints({
          clientId: ref.referrerClientId,
          reason: "REFERRAL_CONTRACT",
          linkedModel: "Referral",
          linkedId: id,
          issuedById: session.sub,
        });
        const updated = await prisma.referral.update({
          where: { id },
          data: { status: "PAID", firstPaymentAt: new Date(), contractPointId: granted?.point.id ?? null },
        });
        return ok({ referral: updated, pointsEarned: granted?.pointsEarned ?? null });
      }
      return badRequest("invalid_action");
    } catch (e) { return serverError(e); }
  });
}
