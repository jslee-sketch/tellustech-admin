import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, conflict, notFound, ok, serverError } from "@/lib/api-utils";

// POST /api/sales/[id]/confirm — 영업 [매출 발행]
//   isDraft=true 인 매출만. 발행 시 isDraft=false + salesConfirmedAt + PR(미수금) 자동 생성.
//   technicianReady=false (사용량 미확정) 면 강제 옵션 X — 차단.
export async function POST(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    const { id } = await ctx.params;
    const sale = await prisma.sales.findUnique({
      where: { id },
      include: { client: { select: { paymentTerms: true } } },
    });
    if (!sale) return notFound();
    if (!sale.isDraft) return conflict("already_confirmed");
    if (!sale.technicianReady) {
      return conflict("technician_pending", { message: "기술팀 사용량 확인 미완료. 사용량 확인서 ADMIN_CONFIRMED 후 발행 가능." });
    }

    try {
      // sourceCompany 추정: contractNumber prefix
      let companyCode: "TV" | "VR" = "TV";
      if (sale.itContractId) {
        const c = await prisma.itContract.findUnique({ where: { id: sale.itContractId }, select: { contractNumber: true } });
        companyCode = c?.contractNumber?.startsWith("VRT-") ? "VR" : "TV";
      }
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (sale.client.paymentTerms ?? 30));

      await prisma.$transaction(async (tx) => {
        await tx.sales.update({
          where: { id },
          data: { isDraft: false, salesConfirmedAt: new Date(), salesConfirmedById: session.sub },
        });
        // 미수금 자동 발행 (없으면)
        const ex = await tx.payableReceivable.findFirst({ where: { salesId: id } });
        if (!ex) {
          await tx.payableReceivable.create({
            data: {
              kind: "RECEIVABLE", clientId: sale.clientId, salesId: id,
              amount: sale.totalAmount, status: "OPEN", dueDate, companyCode,
            },
          });
        }
      });

      return ok({ ok: true });
    } catch (err) {
      return serverError(err);
    }
  });
}
