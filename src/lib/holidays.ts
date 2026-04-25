import "server-only";

// 베트남/한국 공휴일 — 양력 고정 + 음력 기반 주요일은 2026~2030 하드코딩.
// 새 해 추가 시 LUNAR_VN / LUNAR_KR 에 행 추가.

export type HolidayDef = {
  date: string; // YYYY-MM-DD
  nameVi: string;
  nameKo: string;
  country: "VN" | "KR";
};

const FIXED_VN: { month: number; day: number; nameVi: string; nameKo: string }[] = [
  { month: 1, day: 1, nameVi: "Tết Dương lịch", nameKo: "신정" },
  { month: 4, day: 30, nameVi: "Ngày Giải phóng", nameKo: "통일의 날" },
  { month: 5, day: 1, nameVi: "Quốc tế Lao động", nameKo: "노동절" },
  { month: 9, day: 2, nameVi: "Quốc khánh", nameKo: "베트남 국경일" },
];

const FIXED_KR: { month: number; day: number; nameKo: string; nameVi: string }[] = [
  { month: 1, day: 1, nameKo: "신정", nameVi: "Tết Dương lịch" },
  { month: 3, day: 1, nameKo: "삼일절", nameVi: "Ngày 3/1" },
  { month: 5, day: 5, nameKo: "어린이날", nameVi: "Ngày Thiếu nhi" },
  { month: 6, day: 6, nameKo: "현충일", nameVi: "Ngày Tưởng niệm" },
  { month: 8, day: 15, nameKo: "광복절", nameVi: "Ngày Giải phóng" },
  { month: 10, day: 3, nameKo: "개천절", nameVi: "Ngày Khai thiên" },
  { month: 10, day: 9, nameKo: "한글날", nameVi: "Ngày Hangul" },
  { month: 12, day: 25, nameKo: "크리스마스", nameVi: "Giáng sinh" },
];

// 음력 기반 — 2026~2030. 매년 양력 환산 후 등록.
const LUNAR_VN: HolidayDef[] = [
  // Tết Nguyên Đán (음력 정월 1~5일)
  { date: "2026-02-17", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2026-02-18", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2026-02-19", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2026-02-20", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2026-02-21", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2027-02-06", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2027-02-07", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2027-02-08", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2027-02-09", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2027-02-10", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2028-01-26", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2028-01-27", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2028-01-28", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2028-01-29", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  { date: "2028-01-30", nameVi: "Tết Nguyên Đán", nameKo: "베트남 설날", country: "VN" },
  // Giỗ Tổ Hùng Vương (음력 3/10)
  { date: "2026-04-26", nameVi: "Giỗ Tổ Hùng Vương", nameKo: "훙왕 기일", country: "VN" },
  { date: "2027-04-15", nameVi: "Giỗ Tổ Hùng Vương", nameKo: "훙왕 기일", country: "VN" },
  { date: "2028-04-04", nameVi: "Giỗ Tổ Hùng Vương", nameKo: "훙왕 기일", country: "VN" },
];

const LUNAR_KR: HolidayDef[] = [
  // 설날 (음력 1/1 ± 1)
  { date: "2026-02-16", nameKo: "설날 연휴", nameVi: "Tết Hàn Quốc", country: "KR" },
  { date: "2026-02-17", nameKo: "설날", nameVi: "Tết Hàn Quốc", country: "KR" },
  { date: "2026-02-18", nameKo: "설날 연휴", nameVi: "Tết Hàn Quốc", country: "KR" },
  { date: "2027-02-05", nameKo: "설날 연휴", nameVi: "Tết Hàn Quốc", country: "KR" },
  { date: "2027-02-06", nameKo: "설날", nameVi: "Tết Hàn Quốc", country: "KR" },
  { date: "2027-02-07", nameKo: "설날 연휴", nameVi: "Tết Hàn Quốc", country: "KR" },
  { date: "2028-01-25", nameKo: "설날 연휴", nameVi: "Tết Hàn Quốc", country: "KR" },
  { date: "2028-01-26", nameKo: "설날", nameVi: "Tết Hàn Quốc", country: "KR" },
  { date: "2028-01-27", nameKo: "설날 연휴", nameVi: "Tết Hàn Quốc", country: "KR" },
  // 추석 (음력 8/15 ± 1)
  { date: "2026-09-24", nameKo: "추석 연휴", nameVi: "Tết Trung Thu HQ", country: "KR" },
  { date: "2026-09-25", nameKo: "추석", nameVi: "Tết Trung Thu HQ", country: "KR" },
  { date: "2026-09-26", nameKo: "추석 연휴", nameVi: "Tết Trung Thu HQ", country: "KR" },
  { date: "2027-09-14", nameKo: "추석 연휴", nameVi: "Tết Trung Thu HQ", country: "KR" },
  { date: "2027-09-15", nameKo: "추석", nameVi: "Tết Trung Thu HQ", country: "KR" },
  { date: "2027-09-16", nameKo: "추석 연휴", nameVi: "Tết Trung Thu HQ", country: "KR" },
  { date: "2028-10-02", nameKo: "추석 연휴", nameVi: "Tết Trung Thu HQ", country: "KR" },
  { date: "2028-10-03", nameKo: "추석", nameVi: "Tết Trung Thu HQ", country: "KR" },
  { date: "2028-10-04", nameKo: "추석 연휴", nameVi: "Tết Trung Thu HQ", country: "KR" },
];

function fixedToList(year: number, fixed: { month: number; day: number; nameVi: string; nameKo: string }[], country: "VN" | "KR"): HolidayDef[] {
  return fixed.map((h) => ({
    date: `${year}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`,
    nameVi: h.nameVi,
    nameKo: h.nameKo,
    country,
  }));
}

function inRange(d: HolidayDef, start: Date, end: Date): boolean {
  const t = new Date(d.date + "T00:00:00").getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function getVietnamHolidays(start: Date, end: Date): HolidayDef[] {
  const years = new Set<number>();
  for (let y = start.getUTCFullYear(); y <= end.getUTCFullYear(); y++) years.add(y);
  const out: HolidayDef[] = [];
  for (const y of years) out.push(...fixedToList(y, FIXED_VN, "VN"));
  out.push(...LUNAR_VN);
  return out.filter((d) => inRange(d, start, end));
}

export function getKoreaHolidays(start: Date, end: Date): HolidayDef[] {
  const years = new Set<number>();
  for (let y = start.getUTCFullYear(); y <= end.getUTCFullYear(); y++) years.add(y);
  const out: HolidayDef[] = [];
  for (const y of years) out.push(...fixedToList(y, FIXED_KR, "KR"));
  out.push(...LUNAR_KR);
  return out.filter((d) => inRange(d, start, end));
}
