import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";

// POST /api/usage-confirmations/[id]/manual-confirm
// body: { customerNote }  (전화/이메일 확인 시 메모 필수)
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    const uc = await prisma.usageConfirmation.findUnique({ where: { id } });
    if (!uc) return notFound();
    if (uc.customerConfirmedAt) return badRequest("already_confirmed");
    let body: any;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const note = String(body?.customerNote ?? "").trim();
    if (!note) return badRequest("note_required", { hint: "수동 CFM 시 메모 필수 (예: 04-26 전화 확인)" });
    try {
      const updated = await prisma.usageConfirmation.update({
        where: { id },
        data: { customerConfirmedAt: new Date(), customerNote: note, status: "CUSTOMER_CONFIRMED" },
      });
      return ok({ usageConfirmation: updated });
    } catch (e) { return serverError(e); }
  });
}
