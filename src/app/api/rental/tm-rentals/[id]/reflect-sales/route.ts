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

// TM 렌탈 → 매출전표 자동반영
// - 각 TmRentalItem 을 SalesItem 으로 복제 (quantity=1, unitPrice=salesPrice)
// - 거래처 paymentTerms 로 dueDate 계산 후 PayableReceivable(RECEIVABLE) 자동 생성
// - 매출전표와 TM 렌탈 사이 명시적 FK 는 없지만(스키마 한계) note 에 tmRentalCode 를 박아 링크 유지.

const DEFAULT_PAYMENT_DAYS = 30;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_r: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;

    const rental = await prisma.tmRental.findUnique({
      where: { id },
      include: {
        items: true,
        client: { select: { id: true, paymentTerms: true } },
      },
    });
    if (!rental) return notFound();
    // 차후 정책: 호출 시점에 active 한 라인만 반영
    //   - endDate >= now 인 항목만 active.
    //   - Amendment 가 endDate 를 단축(REMOVE/TERMINATE)했다면 자동 제외됨.
    //   - 새로 추가된 ADD 라인은 자동 포함됨.
    const now = new Date();
    const activeItems = rental.items.filter((it) => it.endDate >= now);
    if (activeItems.length === 0) {
      return badRequest("no_items", { message: "활성 품목이 없어 매출로 반영할 수 없습니다." });
    }

    try {
      const totalAmount = activeItems
        .reduce((sum, it) => sum + Number(it.salesPrice), 0)
        .toFixed(2);
      const paymentDays = rental.client.paymentTerms ?? DEFAULT_PAYMENT_DAYS;
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
                clientId: rental.clientId,
                totalAmount,
                currency: rental.currency,
                fxRate: rental.fxRate,
                note: `[자동반영] TM 렌탈 ${rental.rentalCode}`,
                createdAt,
              },
            });
            await tx.salesItem.createMany({
              data: activeItems.map((it) => ({
                salesId: sales.id,
                itemId: it.itemId,
                serialNumber: it.serialNumber,
                stockCheck: "LOOSE",
                quantity: "1",
                unitPrice: it.salesPrice,
                amount: it.salesPrice,
                sourceTmRentalItemId: it.id,
              })),
            });
            const vndAmount = (Number(totalAmount) * Number(rental.fxRate)).toFixed(2);
            await tx.payableReceivable.create({
              data: {
                companyCode: session.companyCode,
                kind: "RECEIVABLE",
                salesId: sales.id,
                clientId: rental.clientId,
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
          sales: {
            id: created.id,
            salesNumber: created.salesNumber,
            totalAmount,
          },
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
