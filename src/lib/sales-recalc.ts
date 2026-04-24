import "server-only";
import type { prisma } from "./prisma";

// 매출·매입 품목 라인 변동 시 합계와 미수금/미지급금 동기화 헬퍼.
// 반드시 $transaction 내부에서 호출 (tx 인자 강제).
//
// TxClient: extended prisma client 의 $transaction 콜백이 받는 tx 타입을 역추출.
// Prisma 7 의 `Prisma.TransactionClient` 는 base 타입이라 $extends 로 확장된 우리 client 와
// 미호환 → 실제 사용 중인 prisma 싱글톤으로부터 타입을 유도해야 한다.
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function recalcSalesTotalsInTx(tx: TxClient, salesId: string): Promise<void> {
  const agg = await tx.salesItem.aggregate({
    where: { salesId },
    _sum: { amount: true },
  });
  const total = (agg._sum.amount ?? 0).toString();
  await tx.sales.update({ where: { id: salesId }, data: { totalAmount: total } });
  // 매출당 미수금 레코드는 1:N 이지만 운영상 1건 생성됨. 해당 salesId 로 묶인 모든 PR 의 amount 를 업데이트.
  await tx.payableReceivable.updateMany({
    where: { salesId },
    data: { amount: total },
  });
}

export async function recalcPurchaseTotalsInTx(tx: TxClient, purchaseId: string): Promise<void> {
  const agg = await tx.purchaseItem.aggregate({
    where: { purchaseId },
    _sum: { amount: true },
  });
  const total = (agg._sum.amount ?? 0).toString();
  await tx.purchase.update({ where: { id: purchaseId }, data: { totalAmount: total } });
  await tx.payableReceivable.updateMany({
    where: { purchaseId },
    data: { amount: total },
  });
}
