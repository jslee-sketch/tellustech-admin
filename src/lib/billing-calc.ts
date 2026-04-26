import "server-only";
import { prisma } from "./prisma";

// IT 월별 사용량 컨펌의 청구액 계산 로직.
// - 이전 월 카운터와 이번 달 카운터의 delta 로 사용량 도출.
// - 흑백/컬러 각각 기본 제공 매수를 초과한 만큼 단가 곱해 과금.
// - 이전 월이 없으면 delta=0 으로 처리 (첫 달은 base 만).
// - Amendment(PRICE_CHANGE) 의 monthlyDelta 는 effectiveDate <= billingMonth 합산.

export type ComputeInput = {
  monthlyBaseFee: number;
  bwIncludedPages: number;
  bwOverageRate: number;
  colorIncludedPages: number;
  colorOverageRate: number;
  bwUsage: number;
  colorUsage: number;
};

export type ComputeResult = {
  bwUsage: number;
  colorUsage: number;
  bwOverage: number;
  colorOverage: number;
  bwCost: number;
  colorCost: number;
  total: string; // Decimal 2 자리
};

export function computeBillingAmount(p: ComputeInput): ComputeResult {
  const bwOverage = Math.max(0, p.bwUsage - p.bwIncludedPages);
  const colorOverage = Math.max(0, p.colorUsage - p.colorIncludedPages);
  const bwCost = bwOverage * p.bwOverageRate;
  const colorCost = colorOverage * p.colorOverageRate;
  const total = p.monthlyBaseFee + bwCost + colorCost;
  return {
    bwUsage: p.bwUsage,
    colorUsage: p.colorUsage,
    bwOverage,
    colorOverage,
    bwCost,
    colorCost,
    total: total.toFixed(2),
  };
}

/**
 * 지정 (계약, S/N) 의 billingMonth 직전 월 청구 레코드 조회 → 그 값으로 delta 산출.
 * excludeId 는 PATCH 시 자기 자신을 제외하기 위해 사용.
 */
export async function deriveUsage(
  itContractId: string,
  serialNumber: string,
  billingMonth: Date,
  counterBw: number | null,
  counterColor: number | null,
  excludeId?: string,
): Promise<{ bwUsage: number; colorUsage: number; prevMonth: string | null }> {
  const prev = await prisma.itMonthlyBilling.findFirst({
    where: {
      itContractId,
      serialNumber,
      billingMonth: { lt: billingMonth },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: { billingMonth: "desc" },
    select: { counterBw: true, counterColor: true, billingMonth: true },
  });
  const prevBw = prev?.counterBw ?? 0;
  const prevColor = prev?.counterColor ?? 0;
  const curBw = counterBw ?? 0;
  const curColor = counterColor ?? 0;
  return {
    bwUsage: Math.max(0, curBw - prevBw),
    colorUsage: Math.max(0, curColor - prevColor),
    prevMonth: prev ? prev.billingMonth.toISOString().slice(0, 7) : null,
  };
}

/**
 * 해당 (계약, billingMonth) 에 적용 가능한 PRICE_CHANGE Amendment 의 monthlyDelta 합.
 * effectiveDate <= billingMonth 인 amendment 만 합산.
 */
export async function sumPriceChangeDelta(
  itContractId: string,
  billingMonth: Date,
): Promise<number> {
  const amendments = await prisma.itContractAmendment.findMany({
    where: {
      contractId: itContractId,
      type: "PRICE_CHANGE",
      effectiveDate: { lte: billingMonth },
    },
    select: { monthlyDelta: true },
  });
  return amendments.reduce((sum, a) => sum + Number(a.monthlyDelta ?? 0), 0);
}
