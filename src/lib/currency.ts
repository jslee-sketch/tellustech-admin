// 통화 포맷 + VND 환산 유틸
// - 거래 통화 그대로 포맷 (천단위 . 구분자 — 베트남식)
// - VND 가 아닐 때만 fxRate 적용해 VND 환산값을 부가 표시용으로 제공

export type Currency = "VND" | "USD" | "KRW" | "JPY" | "CNY";

export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: "VND", label: "VND · Vietnamese đồng", symbol: "₫" },
  { value: "USD", label: "USD · US Dollar", symbol: "$" },
  { value: "KRW", label: "KRW · 원", symbol: "₩" },
  { value: "JPY", label: "JPY · 円", symbol: "¥" },
  { value: "CNY", label: "CNY · 元", symbol: "¥" },
];

const SYMBOLS: Record<Currency, string> = {
  VND: "₫",
  USD: "$",
  KRW: "₩",
  JPY: "¥",
  CNY: "¥",
};

const DECIMALS: Record<Currency, number> = {
  VND: 0, // 베트남 동은 소수점 없음
  USD: 2,
  KRW: 0,
  JPY: 0,
  CNY: 2,
};

function toNumber(v: number | string | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 금액을 원 통화 단위로 포맷 (예: 100000 → "100.000 ₫") */
export function formatCurrency(amount: number | string | null | undefined, currency: Currency = "VND"): string {
  const n = toNumber(amount);
  const decimals = DECIMALS[currency];
  const formatted = new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
  return `${formatted} ${SYMBOLS[currency]}`;
}

/** 통화 코드 + 기호 */
export function currencyBadge(currency: Currency = "VND"): string {
  return `${currency} ${SYMBOLS[currency]}`;
}

/** 주어진 금액 × fxRate = VND 환산값 */
export function toVnd(amount: number | string | null | undefined, fxRate: number | string | null | undefined): number {
  return toNumber(amount) * toNumber(fxRate);
}

/** VND 환산값 포맷 (외화 거래에서 참고용으로 병기) */
export function formatVnd(amount: number | string | null | undefined, fxRate: number | string | null | undefined): string {
  return formatCurrency(toVnd(amount, fxRate), "VND");
}
