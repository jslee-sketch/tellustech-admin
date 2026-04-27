// 잔여일 / 색상 / 라벨 — 포탈 현황판과 어드민 미수금/미지급금 페이지 공통 유틸.
// 단일 출처: 잔여일 정책을 한 곳에서만 정의해 모듈 간 모순 방지.

export type DaysRemainingResult = {
  days: number | null;
  color: "green" | "yellow" | "orange" | "red" | "";
  label: string; // i18n 처리는 호출 측에서. 여기는 raw days만 반환.
};

/**
 * 잔여일 계산.
 * - days > 0  → 연체 (오늘이 예정일 지남, 빨강)
 * - days === 0 → 오늘이 예정일 (노랑)
 * - -3 <= days < 0 → 임박 (오렌지)
 * - days < -3 → 미도래 (초록)
 * - PAID 상태면 null (잔여일 표시 안 함)
 */
export function calcRemainingDays(dueDate: Date | string | null, status: string): DaysRemainingResult {
  if (status === "PAID") return { days: null, color: "", label: "" };
  if (!dueDate) return { days: null, color: "", label: "" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - due.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days > 0) return { days, color: "red", label: `+${days}` };
  if (days === 0) return { days: 0, color: "yellow", label: "0" };
  if (days >= -3) return { days, color: "orange", label: `${days}` };
  return { days, color: "green", label: `${days}` };
}
