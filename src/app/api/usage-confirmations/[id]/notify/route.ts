import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";

// POST /api/usage-confirmations/[id]/notify
// 고객에게 알림 발송 (현재는 status 만 갱신 + Notification 생성)
export async function POST(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    try {
      const uc = await prisma.usageConfirmation.findUnique({ where: { id }, include: { client: { select: { id: true } } } });
      if (!uc) return notFound();
      if (!["COLLECTED", "CUSTOMER_NOTIFIED"].includes(uc.status)) return badRequest("invalid_state");
      // 고객 user 에게 Notification — 포탈 사용자 찾기
      const user = await prisma.user.findFirst({ where: { clientId: uc.clientId, isActive: true }, select: { id: true } });
      if (user) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "USAGE_CONFIRM_REQUEST",
            titleKo: "사용량 확인 요청",
            titleVi: "Yêu cầu xác nhận sản lượng",
            titleEn: "Usage confirmation request",
            bodyKo: `${uc.billingMonth} 사용량을 확인해 주세요. 확인서: ${uc.confirmCode}`,
            bodyVi: `Vui lòng xác nhận sản lượng ${uc.billingMonth}. Mã: ${uc.confirmCode}`,
            bodyEn: `Please confirm ${uc.billingMonth} usage. Code: ${uc.confirmCode}`,
            linkUrl: `/portal/usage-confirm?ucId=${uc.id}`,
            companyCode: "TV",
          },
        }).catch(() => undefined);
      }
      const updated = await prisma.usageConfirmation.update({
        where: { id },
        data: { status: "CUSTOMER_NOTIFIED" },
      });
      return ok({ usageConfirmation: updated });
    } catch (e) { return serverError(e); }
  });
}
