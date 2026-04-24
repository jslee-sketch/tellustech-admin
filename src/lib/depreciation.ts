import "server-only";
import type { DepreciationMethod } from "@/generated/prisma/client";

// 감가상각 스케줄 생성 유틸.
// STRAIGHT_LINE (정액법): 매월 = acquisitionCost / usefulLifeMonths
// DECLINING_BALANCE (정률법): 매월 = bookValue * (2 / usefulLifeMonths) — 배수 2 (double declining)
//   마지막 월 잔존가 보정 (bookValue 가 음수가 되지 않도록 clamp)

export type ScheduleRow = {
  month: Date; // UTC 월 첫째 날
  depreciationAmount: string;
  bookValue: string;
};

export function buildDepreciationSchedule(
  acquisitionDate: Date,
  acquisitionCost: number,
  method: DepreciationMethod,
  usefulLifeMonths: number,
): ScheduleRow[] {
  if (usefulLifeMonths <= 0 || acquisitionCost <= 0) return [];
  const rows: ScheduleRow[] = [];
  let bookValue = acquisitionCost;
  const startMonth = new Date(
    Date.UTC(acquisitionDate.getUTCFullYear(), acquisitionDate.getUTCMonth(), 1, 0, 0, 0, 0),
  );

  const straightMonthly = acquisitionCost / usefulLifeMonths;
  const decliningRate = 2 / usefulLifeMonths;

  for (let i = 0; i < usefulLifeMonths; i++) {
    const month = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + i, 1, 0, 0, 0, 0));
    let dep: number;
    if (method === "STRAIGHT_LINE") {
      dep = i === usefulLifeMonths - 1 ? bookValue : Math.min(straightMonthly, bookValue);
    } else {
      // DECLINING_BALANCE: 마지막 월엔 남은 잔존가 전체를 상각해 bookValue=0 으로 마감
      dep = i === usefulLifeMonths - 1 ? bookValue : Math.min(bookValue * decliningRate, bookValue);
    }
    dep = Math.max(0, dep);
    bookValue = Math.max(0, bookValue - dep);
    rows.push({
      month,
      depreciationAmount: dep.toFixed(2),
      bookValue: bookValue.toFixed(2),
    });
  }
  return rows;
}
