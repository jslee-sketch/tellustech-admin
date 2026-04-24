import "server-only";

// TM 렌탈 품목 라인 이익 자동계산 헬퍼.
// profit = salesPrice - (purchasePrice ?? 0) - (commission ?? 0)

export function computeTmProfit(
  salesPrice: string | number,
  purchasePrice: string | number | null,
  commission: string | number | null,
): string {
  const s = Number(salesPrice);
  const p = purchasePrice === null ? 0 : Number(purchasePrice);
  const c = commission === null ? 0 : Number(commission);
  if (!Number.isFinite(s) || !Number.isFinite(p) || !Number.isFinite(c)) return "0";
  return (s - p - c).toFixed(2);
}
