import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  notFound,
  ok,
  serverError,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";

// IT 계약 → 매출전표 자동반영 (TM 렌탈과 동일 패턴)
// - 장비 목록의 monthlyBaseFee 합계를 1회분 매출로 생성
// - 실제로는 월별 청구로 세분화하는 것이 정확하지만, 이 버튼은 간이 "계약 총액" 반영
//   (월별 세분화는 /billings 탭에서 각 월마다 처리)
// - paymentTerms 기반 미수금 자동 생성

const DEFAULT_PAYMENT_DAYS = 30;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_r: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;

    const contract = await prisma.itContract.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, paymentTerms: true } },
        equipment: true,
      },
    });
    if (!contract) return notFound();
    if (contract.equipment.length === 0) {
      return badRequest("no_equipment", { message: "장비가 없어 매출로 반영할 수 없습니다." });
    }

    try {
      // 장비별 월기본료를 1회분 매출 라인으로 반영
      const totalAmount = contract.equipment
        .reduce((sum, e) => sum + Number(e.monthlyBaseFee ?? 0), 0)
        .toFixed(2);
      const paymentDays = contract.client.paymentTerms ?? DEFAULT_PAYMENT_DAYS;
      const createdAt = new Date();
      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + paymentDays);

      const created = await withUniqueRetry(
        async () => {
          const salesNumber = await generateDatedCode({
            prefix: "SLS",
            lookupLast: async (fullPrefix) => {
              const last = await prisma.sales.findFirst({
                where: { deletedAt: undefined, salesNumber: { startsWith: fullPrefix } },
                orderBy: { salesNumber: "desc" },
                select: { salesNumber: true },
              });
              return last?.salesNumber ?? null;
            },
          });

          return prisma.$transaction(async (tx) => {
            const sales = await tx.sales.create({
              data: {
                salesNumber,
                clientId: contract.clientId,
                totalAmount,
                currency: contract.currency,
                fxRate: contract.fxRate,
                note: `[자동반영] IT 계약 ${contract.contractNumber}`,
                createdAt,
              },
            });
            await tx.salesItem.createMany({
              data: contract.equipment.map((e) => ({
                salesId: sales.id,
                itemId: e.itemId,
                serialNumber: e.serialNumber,
                stockCheck: "STRICT",
                quantity: "1",
                unitPrice: (e.monthlyBaseFee ?? 0).toString(),
                amount: (e.monthlyBaseFee ?? 0).toString(),
              })),
            });
            const vndAmount = (Number(totalAmount) * Number(contract.fxRate)).toFixed(2);
            await tx.payableReceivable.create({
              data: {
                companyCode: session.companyCode,
                kind: "RECEIVABLE",
                salesId: sales.id,
                clientId: contract.clientId,
                amount: vndAmount,
                paidAmount: "0",
                dueDate,
                status: "OPEN",
              },
            });
            return sales;
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
      );

      return ok(
        {
          sales: { id: created.id, salesNumber: created.salesNumber, totalAmount },
        },
        { status: 201 },
      );
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
