// 재무제표 산출 — Layer 4.
// JournalLine (POSTED 상태만) 또는 AccountMonthlyBalance 에서 실시간 계산.
// 시산표·손익계산서(PL)·재무상태표(BS)·현금흐름표(CF) 4종.

import { prisma } from "@/lib/prisma";

type Company = "TV" | "VR";

export type TrialBalanceRow = {
  code: string;
  nameVi: string; nameEn: string; nameKo: string;
  type: string;
  totalDebit: number;
  totalCredit: number;
  balance: number; // ASSET/EXPENSE: D-C, LIABILITY/EQUITY/REVENUE: C-D
};

// 시산표 — 모든 leaf 계정의 차/대 합계.
export async function computeTrialBalance(period: string, companyCode: Company): Promise<TrialBalanceRow[]> {
  const [year, month] = period.split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));

  const accounts = await prisma.chartOfAccount.findMany({
    where: { companyCode: companyCode as never, isLeaf: true, isActive: true },
    orderBy: { code: "asc" },
  });

  const lines = await prisma.journalLine.findMany({
    where: {
      companyCode: companyCode as never,
      entry: { status: "POSTED", entryDate: { gte: from, lt: to } },
    },
    select: { accountCode: true, debitAmount: true, creditAmount: true },
  });

  const sumByCode = new Map<string, { d: number; c: number }>();
  for (const l of lines) {
    const cur = sumByCode.get(l.accountCode) ?? { d: 0, c: 0 };
    cur.d += Number(l.debitAmount);
    cur.c += Number(l.creditAmount);
    sumByCode.set(l.accountCode, cur);
  }

  return accounts.map((a) => {
    const s = sumByCode.get(a.code) ?? { d: 0, c: 0 };
    const isDebitNature = a.type === "ASSET" || a.type === "EXPENSE";
    const balance = isDebitNature ? s.d - s.c : s.c - s.d;
    return {
      code: a.code,
      nameVi: a.nameVi, nameEn: a.nameEn, nameKo: a.nameKo,
      type: a.type as string,
      totalDebit: s.d,
      totalCredit: s.c,
      balance,
    };
  });
}

// 손익계산서(PL) — REVENUE - EXPENSE = NetIncome.
export type IncomeStatement = {
  period: string;
  revenue: { code: string; name: string; amount: number }[];
  totalRevenue: number;
  expense: { code: string; name: string; amount: number }[];
  totalExpense: number;
  netIncome: number;
};

export async function computeIncomeStatement(period: string, companyCode: Company, lang: "VI" | "EN" | "KO"): Promise<IncomeStatement> {
  const tb = await computeTrialBalance(period, companyCode);
  const localized = (a: TrialBalanceRow) => lang === "VI" ? a.nameVi : lang === "EN" ? a.nameEn : a.nameKo;

  const revenue = tb.filter((r) => r.type === "REVENUE" && r.balance !== 0).map((r) => ({ code: r.code, name: localized(r), amount: r.balance }));
  const expense = tb.filter((r) => r.type === "EXPENSE" && r.balance !== 0).map((r) => ({ code: r.code, name: localized(r), amount: r.balance }));
  const totalRevenue = revenue.reduce((s, x) => s + x.amount, 0);
  const totalExpense = expense.reduce((s, x) => s + x.amount, 0);

  return { period, revenue, totalRevenue, expense, totalExpense, netIncome: totalRevenue - totalExpense };
}

// 재무상태표(BS) — ASSET = LIABILITY + EQUITY (+ NetIncome 누적).
// 누적 잔액: yearMonth ≤ asOf 까지 모든 POSTED journal line 합산.
export type BalanceSheet = {
  asOf: string;
  asset: { code: string; name: string; amount: number }[];
  totalAsset: number;
  liability: { code: string; name: string; amount: number }[];
  totalLiability: number;
  equity: { code: string; name: string; amount: number }[];
  totalEquity: number;
  retainedEarnings: number; // 당기순이익 (cumulative R-E to date)
};

export async function computeBalanceSheet(asOf: string, companyCode: Company, lang: "VI" | "EN" | "KO"): Promise<BalanceSheet> {
  // asOf 가 "YYYY-MM" 이면 그 달 말까지, "YYYY-MM-DD" 면 그 일자 포함까지.
  const ymOnly = /^\d{4}-\d{2}$/.test(asOf);
  const cutoff = ymOnly
    ? (() => { const [y, m] = asOf.split("-").map(Number); return new Date(Date.UTC(y, m, 1)); })()
    : (() => { const d = new Date(asOf); d.setUTCDate(d.getUTCDate() + 1); return d; })();

  const accounts = await prisma.chartOfAccount.findMany({
    where: { companyCode: companyCode as never, isLeaf: true, isActive: true },
    orderBy: { code: "asc" },
  });

  const lines = await prisma.journalLine.findMany({
    where: {
      companyCode: companyCode as never,
      entry: { status: "POSTED", entryDate: { lt: cutoff } },
    },
    select: { accountCode: true, debitAmount: true, creditAmount: true },
  });

  const sumByCode = new Map<string, { d: number; c: number }>();
  for (const l of lines) {
    const cur = sumByCode.get(l.accountCode) ?? { d: 0, c: 0 };
    cur.d += Number(l.debitAmount);
    cur.c += Number(l.creditAmount);
    sumByCode.set(l.accountCode, cur);
  }

  const localized = (a: typeof accounts[number]) => lang === "VI" ? a.nameVi : lang === "EN" ? a.nameEn : a.nameKo;

  const asset: { code: string; name: string; amount: number }[] = [];
  const liability: { code: string; name: string; amount: number }[] = [];
  const equity: { code: string; name: string; amount: number }[] = [];
  let totalRev = 0, totalExp = 0;

  for (const a of accounts) {
    const s = sumByCode.get(a.code) ?? { d: 0, c: 0 };
    const isDebitNature = a.type === "ASSET" || a.type === "EXPENSE";
    const balance = isDebitNature ? s.d - s.c : s.c - s.d;
    if (balance === 0) continue;
    if (a.type === "ASSET") asset.push({ code: a.code, name: localized(a), amount: balance });
    else if (a.type === "LIABILITY") liability.push({ code: a.code, name: localized(a), amount: balance });
    else if (a.type === "EQUITY") equity.push({ code: a.code, name: localized(a), amount: balance });
    else if (a.type === "REVENUE") totalRev += balance;
    else if (a.type === "EXPENSE") totalExp += balance;
  }
  const retainedEarnings = totalRev - totalExp;

  const totalAsset = asset.reduce((s, x) => s + x.amount, 0);
  const totalLiability = liability.reduce((s, x) => s + x.amount, 0);
  const totalEquity = equity.reduce((s, x) => s + x.amount, 0) + retainedEarnings;

  return { asOf, asset, totalAsset, liability, totalLiability, equity, totalEquity, retainedEarnings };
}

// 현금흐름표(CF) 간이 — 직접법.
// 자산계정 중 현금/예금(111, 112) 의 차변·대변 변동을 source 별로 분류.
export type CashFlowStatement = {
  period: string;
  operating: { source: string; inflow: number; outflow: number; net: number }[];
  investing: { source: string; inflow: number; outflow: number; net: number }[];
  financing: { source: string; inflow: number; outflow: number; net: number }[];
  netCashFlow: number;
  openingCash: number;
  closingCash: number;
};

const CASH_CODES = ["111", "112"];

export async function computeCashFlow(period: string, companyCode: Company): Promise<CashFlowStatement> {
  const [year, month] = period.split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));

  // 기초 현금 — period 시작 전까지 누적
  const beforeLines = await prisma.journalLine.findMany({
    where: {
      companyCode: companyCode as never,
      accountCode: { in: CASH_CODES },
      entry: { status: "POSTED", entryDate: { lt: from } },
    },
    select: { debitAmount: true, creditAmount: true },
  });
  const openingCash = beforeLines.reduce((s, l) => s + Number(l.debitAmount) - Number(l.creditAmount), 0);

  // period 내 cash 라인 — source 별 분류
  const periodLines = await prisma.journalLine.findMany({
    where: {
      companyCode: companyCode as never,
      accountCode: { in: CASH_CODES },
      entry: { status: "POSTED", entryDate: { gte: from, lt: to } },
    },
    select: { debitAmount: true, creditAmount: true, entry: { select: { source: true } } },
  });

  // operating: SALES, PURCHASE, EXPENSE, PAYROLL, CASH
  // investing/financing: 향후 분류 가능 — 현재는 모두 operating 으로 집계
  const bySource = new Map<string, { in: number; out: number }>();
  for (const l of periodLines) {
    const src = l.entry.source as string;
    const cur = bySource.get(src) ?? { in: 0, out: 0 };
    cur.in += Number(l.debitAmount);
    cur.out += Number(l.creditAmount);
    bySource.set(src, cur);
  }

  const operating: { source: string; inflow: number; outflow: number; net: number }[] = [];
  for (const [source, v] of bySource) {
    operating.push({ source, inflow: v.in, outflow: v.out, net: v.in - v.out });
  }
  operating.sort((a, b) => a.source.localeCompare(b.source));

  const netCashFlow = operating.reduce((s, x) => s + x.net, 0);
  return {
    period,
    operating,
    investing: [],
    financing: [],
    netCashFlow,
    openingCash,
    closingCash: openingCash + netCashFlow,
  };
}

// AccountMonthlyBalance 산출/upsert — 마감 직전 호출.
export async function snapshotMonthlyBalance(period: string, companyCode: Company): Promise<{ count: number }> {
  const tb = await computeTrialBalance(period, companyCode);
  // 직전 달 마감 잔액을 opening 으로 가져옴
  const [year, month] = period.split("-").map(Number);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  const prevAMB = await prisma.accountMonthlyBalance.findMany({
    where: { companyCode: companyCode as never, yearMonth: prevPeriod },
  });
  const prevByCode = new Map(prevAMB.map((p) => [p.accountCode, Number(p.closingBalance)]));

  let count = 0;
  for (const r of tb) {
    const opening = prevByCode.get(r.code) ?? 0;
    const closing = opening + (r.type === "ASSET" || r.type === "EXPENSE" ? (r.totalDebit - r.totalCredit) : (r.totalCredit - r.totalDebit));
    await prisma.accountMonthlyBalance.upsert({
      where: { companyCode_yearMonth_accountCode: { companyCode: companyCode as never, yearMonth: period, accountCode: r.code } },
      update: { openingBalance: opening, totalDebit: r.totalDebit, totalCredit: r.totalCredit, closingBalance: closing },
      create: { companyCode: companyCode as never, yearMonth: period, accountCode: r.code, openingBalance: opening, totalDebit: r.totalDebit, totalCredit: r.totalCredit, closingBalance: closing },
    });
    count++;
  }
  return { count };
}

// 마감 검증 — verify 단계.
export async function verifyPeriod(period: string, companyCode: Company): Promise<{ ok: boolean; unbalanced: { entryNo: string; debit: number; credit: number }[]; draftCount: number }> {
  const [year, month] = period.split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));

  const entries = await prisma.journalEntry.findMany({
    where: { companyCode: companyCode as never, entryDate: { gte: from, lt: to } },
    include: { lines: { select: { debitAmount: true, creditAmount: true } } },
  });

  const unbalanced: { entryNo: string; debit: number; credit: number }[] = [];
  let draftCount = 0;
  for (const e of entries) {
    if (e.status === "DRAFT") draftCount++;
    if (e.status !== "POSTED") continue;
    const d = e.lines.reduce((s, l) => s + Number(l.debitAmount), 0);
    const c = e.lines.reduce((s, l) => s + Number(l.creditAmount), 0);
    if (Math.abs(d - c) > 0.01) unbalanced.push({ entryNo: e.entryNo, debit: d, credit: c });
  }

  return { ok: unbalanced.length === 0 && draftCount === 0, unbalanced, draftCount };
}

// 마감 가드 — JournalEntry 생성 시 호출. closed period 면 throw.
export async function assertPeriodOpen(entryDate: Date, companyCode: Company): Promise<void> {
  const ym = `${entryDate.getUTCFullYear()}-${String(entryDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const close = await prisma.periodClose.findUnique({
    where: { companyCode_yearMonth: { companyCode: companyCode as never, yearMonth: ym } },
    select: { status: true },
  });
  if (close?.status === "CLOSED") {
    throw new Error(`PERIOD_CLOSED:${ym}`);
  }
}
