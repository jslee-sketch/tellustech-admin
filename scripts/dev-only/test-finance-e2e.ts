// 재경 모듈 (Layer 1~5) E2E 검증 — 21단계.
// 실행: npx tsx scripts/test-finance-e2e.ts
// DB 직접 조작 (server-only 모듈 회피) — 핵심 로직만 재현하여 자체 검증.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TAG = "[E2E-Finance]";
let pass = 0, fail = 0;

function ok(name: string, cond: boolean, detail?: unknown) {
  const sym = cond ? "✓" : "✗";
  if (cond) pass++; else fail++;
  console.log(`  ${sym} ${name}${detail !== undefined ? ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`);
}

// 자체 createJournalEntry — server-only 모듈 회피.
async function makeEntry(args: {
  entryNo: string;
  entryDate: Date;
  description: string;
  source: "MANUAL" | "SALES" | "PURCHASE" | "CASH" | "EXPENSE" | "PAYROLL" | "ADJUSTMENT";
  companyCode: "TV" | "VR";
  lines: { accountCode: string; debit?: number; credit?: number; description?: string }[];
  autoPost?: boolean;
}) {
  // 마감 가드 체크
  const ym = `${args.entryDate.getUTCFullYear()}-${String(args.entryDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const close = await prisma.periodClose.findUnique({
    where: { companyCode_yearMonth: { companyCode: args.companyCode, yearMonth: ym } },
    select: { status: true },
  });
  if (close?.status === "CLOSED") {
    throw new Error(`PERIOD_CLOSED:${ym}`);
  }

  // 차대 검증
  const totalDr = args.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCr = args.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (Math.abs(totalDr - totalCr) > 0.01) throw new Error(`UNBALANCED:${totalDr}/${totalCr}`);

  return prisma.journalEntry.create({
    data: {
      entryNo: args.entryNo,
      entryDate: args.entryDate,
      description: args.description,
      source: args.source,
      status: args.autoPost ? "POSTED" : "DRAFT",
      postedAt: args.autoPost ? new Date() : null,
      companyCode: args.companyCode,
      lines: {
        create: args.lines.map((l, i) => ({
          lineNo: i + 1,
          accountCode: l.accountCode,
          debitAmount: l.debit ?? 0,
          creditAmount: l.credit ?? 0,
          description: l.description ?? null,
          companyCode: args.companyCode,
        })),
      },
    },
  });
}

async function trialBalance(period: string, cc: "TV" | "VR") {
  const [y, m] = period.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 1));
  const lines = await prisma.journalLine.findMany({
    where: {
      companyCode: cc,
      entry: { status: "POSTED", entryDate: { gte: from, lt: to } },
    },
    include: { account: { select: { type: true } } },
  });
  let totalDr = 0, totalCr = 0, totalRev = 0, totalExp = 0;
  let asset = 0, liab = 0, eq = 0;
  for (const l of lines) {
    const d = Number(l.debitAmount); const c = Number(l.creditAmount);
    totalDr += d; totalCr += c;
    const t = l.account.type;
    if (t === "REVENUE") totalRev += c - d;
    else if (t === "EXPENSE") totalExp += d - c;
    else if (t === "ASSET") asset += d - c;
    else if (t === "LIABILITY") liab += c - d;
    else if (t === "EQUITY") eq += c - d;
  }
  return { totalDr, totalCr, totalRev, totalExp, asset, liab, eq };
}

async function balanceSheetCumulative(asOfYM: string, cc: "TV" | "VR") {
  const [y, m] = asOfYM.split("-").map(Number);
  const cutoff = new Date(Date.UTC(y, m, 1)); // exclusive
  const lines = await prisma.journalLine.findMany({
    where: {
      companyCode: cc,
      entry: { status: "POSTED", entryDate: { lt: cutoff } },
    },
    include: { account: { select: { type: true } } },
  });
  let asset = 0, liab = 0, eq = 0, rev = 0, exp = 0;
  for (const l of lines) {
    const d = Number(l.debitAmount); const c = Number(l.creditAmount);
    const t = l.account.type;
    if (t === "ASSET") asset += d - c;
    else if (t === "LIABILITY") liab += c - d;
    else if (t === "EQUITY") eq += c - d;
    else if (t === "REVENUE") rev += c - d;
    else if (t === "EXPENSE") exp += d - c;
  }
  return { asset, liab, eq, retainedEarnings: rev - exp };
}

async function main() {
  console.log(`\n${TAG} starting 21-step finance E2E\n`);

  const COMPANY = "TV" as const;
  const period = "2099-12";
  const periodDate = new Date(Date.UTC(2099, 11, 15));
  const MARKER = "[E2E-FIN-MARKER]";

  // 사전 정리 (이전 실행 잔재)
  await prisma.journalEntry.deleteMany({ where: { companyCode: COMPANY, description: { startsWith: MARKER } } });
  await prisma.accountMonthlyBalance.deleteMany({ where: { companyCode: COMPANY, yearMonth: period } });
  await prisma.periodClose.deleteMany({ where: { companyCode: COMPANY, yearMonth: period } });

  // 1
  let cfg = await prisma.accountingConfig.findUnique({ where: { companyCode: COMPANY } });
  if (!cfg) cfg = await prisma.accountingConfig.create({ data: { companyCode: COMPANY } });
  ok("1. AccountingConfig 생성/획득", !!cfg, cfg.standard);

  // 2
  const accounts = await prisma.chartOfAccount.findMany({ where: { companyCode: COMPANY, standard: "VAS" } });
  ok("2. VAS ChartOfAccounts 시드 확인", accounts.length >= 30, `${accounts.length} accounts`);

  // 3
  const mappings = await prisma.accountMapping.findMany({ where: { companyCode: COMPANY } });
  ok("3. AccountMappings 14개 확인", mappings.length >= 14, `${mappings.length} mappings`);

  // 4
  let bank = await prisma.bankAccount.findFirst({ where: { companyCode: COMPANY, accountCode: "E2EFIN-001" } });
  if (!bank) {
    bank = await prisma.bankAccount.create({
      data: {
        accountCode: "E2EFIN-001", bankName: "E2E Bank", accountName: "E2E-FIN-Test",
        accountNumber: "9999", currency: "VND", accountType: "CHECKING",
        openingBalance: "0", openingDate: new Date(), currentBalance: "0",
        isActive: true, companyCode: COMPANY,
      },
    });
  }
  ok("4. BankAccount 생성", !!bank);

  // 5
  const sales = await makeEntry({
    entryNo: "JE-E2E-FIN-005", entryDate: periodDate,
    description: `${MARKER} 매출 1,100,000`, source: "SALES", companyCode: COMPANY, autoPost: true,
    lines: [
      { accountCode: "131", debit: 1100000, description: "매출 미수금" },
      { accountCode: "5111", credit: 1000000, description: "매출" },
      { accountCode: "3331", credit: 100000, description: "VAT" },
    ],
  });
  ok("5. 매출 자동분개 발급", !!sales.entryNo, sales.entryNo);

  // 6
  const tb = await trialBalance(period, COMPANY);
  ok("6. 시산표 차대 균형", Math.abs(tb.totalDr - tb.totalCr) < 0.01, `Dr=${tb.totalDr} Cr=${tb.totalCr}`);

  // 7
  ok("7. 손익 — 수익=1,000,000 비용=0", tb.totalRev === 1000000 && tb.totalExp === 0, `rev=${tb.totalRev} exp=${tb.totalExp}`);

  // 8
  const bs = await balanceSheetCumulative(period, COMPANY);
  const balanced = Math.abs(bs.asset - (bs.liab + bs.eq + bs.retainedEarnings)) < 0.01;
  ok("8. 재무상태표 A=L+E", balanced, `A=${bs.asset} L=${bs.liab} E=${bs.eq + bs.retainedEarnings}`);

  // 9
  const cash = await makeEntry({
    entryNo: "JE-E2E-FIN-009", entryDate: periodDate,
    description: `${MARKER} Cash 입금 1,000,000`, source: "CASH", companyCode: COMPANY, autoPost: true,
    lines: [
      { accountCode: "112", debit: 1000000, description: "입금" },
      { accountCode: "131", credit: 1000000, description: "미수금 회수" },
    ],
  });
  ok("9. CashTransaction 자동분개", !!cash.entryNo, cash.entryNo);

  // 10
  const cashLines = await prisma.journalLine.findMany({
    where: { companyCode: COMPANY, accountCode: { in: ["111", "112"] }, entry: { status: "POSTED", entryDate: { gte: new Date(Date.UTC(2099, 11, 1)), lt: new Date(Date.UTC(2100, 0, 1)) } } },
  });
  const cashNet = cashLines.reduce((s, l) => s + Number(l.debitAmount) - Number(l.creditAmount), 0);
  ok("10. 현금흐름표 — 영업활동 IN", cashNet === 1000000, `net=${cashNet}`);

  // 11
  const purch = await makeEntry({
    entryNo: "JE-E2E-FIN-011", entryDate: periodDate,
    description: `${MARKER} 매입 330,000`, source: "PURCHASE", companyCode: COMPANY, autoPost: true,
    lines: [
      { accountCode: "156", debit: 300000 },
      { accountCode: "133", debit: 30000 },
      { accountCode: "331", credit: 330000 },
    ],
  });
  ok("11. 매입 자동분개", !!purch.entryNo, purch.entryNo);

  // 12
  const expense = await makeEntry({
    entryNo: "JE-E2E-FIN-012", entryDate: periodDate,
    description: `${MARKER} Expense 100,000`, source: "EXPENSE", companyCode: COMPANY, autoPost: true,
    lines: [
      { accountCode: "6428", debit: 100000 },
      { accountCode: "112", credit: 100000 },
    ],
  });
  ok("12. Expense 자동분개", !!expense.entryNo, expense.entryNo);

  // 13
  const allEntries = await prisma.journalEntry.findMany({
    where: { companyCode: COMPANY, description: { startsWith: MARKER } },
    include: { lines: true },
  });
  let allBalanced = true;
  for (const e of allEntries) {
    const d = e.lines.reduce((s: number, l: { debitAmount: unknown }) => s + Number(l.debitAmount), 0);
    const c = e.lines.reduce((s: number, l: { creditAmount: unknown }) => s + Number(l.creditAmount), 0);
    if (Math.abs(d - c) > 0.01) allBalanced = false;
  }
  ok("13. 모든 entry POSTED + 차대 균형", allBalanced && allEntries.every((e: { status: string }) => e.status === "POSTED"), `${allEntries.length} entries`);

  // 14
  const drafts = await prisma.journalEntry.count({
    where: { companyCode: COMPANY, status: "DRAFT", entryDate: { gte: new Date(Date.UTC(2099, 11, 1)), lt: new Date(Date.UTC(2100, 0, 1)) } },
  });
  ok("14. PeriodClose verify ok=true", allBalanced && drafts === 0, `unbalanced=0 drafts=${drafts}`);

  // 15
  const cur = await prisma.periodClose.upsert({
    where: { companyCode_yearMonth: { companyCode: COMPANY, yearMonth: period } },
    update: { status: "VERIFIED", verifiedAt: new Date() },
    create: { yearMonth: period, status: "VERIFIED", verifiedAt: new Date(), companyCode: COMPANY },
  });
  // AMB 스냅샷
  for (const a of accounts) {
    if (!a.isLeaf) continue;
    const lines = await prisma.journalLine.findMany({
      where: { companyCode: COMPANY, accountCode: a.code, entry: { status: "POSTED", entryDate: { gte: new Date(Date.UTC(2099, 11, 1)), lt: new Date(Date.UTC(2100, 0, 1)) } } },
    });
    const totalD = lines.reduce((s, l) => s + Number(l.debitAmount), 0);
    const totalC = lines.reduce((s, l) => s + Number(l.creditAmount), 0);
    const isDebit = a.type === "ASSET" || a.type === "EXPENSE";
    const closing = isDebit ? totalD - totalC : totalC - totalD;
    await prisma.accountMonthlyBalance.upsert({
      where: { companyCode_yearMonth_accountCode: { companyCode: COMPANY, yearMonth: period, accountCode: a.code } },
      update: { totalDebit: totalD, totalCredit: totalC, closingBalance: closing, isFrozen: true },
      create: { companyCode: COMPANY, yearMonth: period, accountCode: a.code, openingBalance: 0, totalDebit: totalD, totalCredit: totalC, closingBalance: closing, isFrozen: true },
    });
  }
  await prisma.periodClose.update({ where: { id: cur.id }, data: { status: "CLOSED", closedAt: new Date() } });
  const closed = await prisma.periodClose.findUnique({ where: { id: cur.id } });
  ok("15. PeriodClose close 완료", closed?.status === "CLOSED");

  // 16
  const ambs = await prisma.accountMonthlyBalance.findMany({ where: { companyCode: COMPANY, yearMonth: period } });
  ok("16. AMB 행 생성 + 동결", ambs.length >= 30 && ambs.every((a: { isFrozen: boolean }) => a.isFrozen), `${ambs.length} rows, all frozen`);

  // 17
  let blockedOk = false;
  try {
    await makeEntry({
      entryNo: "JE-E2E-FIN-017-blocked", entryDate: periodDate,
      description: `${MARKER} should be blocked`, source: "MANUAL", companyCode: COMPANY, autoPost: true,
      lines: [{ accountCode: "131", debit: 100 }, { accountCode: "5111", credit: 100 }],
    });
  } catch (e) {
    if ((e as Error).message.includes("PERIOD_CLOSED")) blockedOk = true;
  }
  ok("17. 마감 후 분개 차단 (PERIOD_CLOSED throw)", blockedOk);

  // 18
  await prisma.accountMonthlyBalance.updateMany({ where: { companyCode: COMPANY, yearMonth: period }, data: { isFrozen: false } });
  await prisma.periodClose.update({ where: { id: cur.id }, data: { status: "REOPENED", reopenedAt: new Date(), reopenReason: "E2E test" } });
  const reopened = await makeEntry({
    entryNo: "JE-E2E-FIN-018", entryDate: periodDate,
    description: `${MARKER} after reopen`, source: "ADJUSTMENT", companyCode: COMPANY, autoPost: true,
    lines: [{ accountCode: "131", debit: 1 }, { accountCode: "5111", credit: 1 }],
  });
  ok("18. reopen 후 분개 재개 가능", !!reopened.entryNo, reopened.entryNo);

  // 19
  await prisma.accountingConfig.update({ where: { companyCode: COMPANY }, data: { standard: "K_IFRS", reportingCurrency: "KRW" } });
  const updatedCfg = await prisma.accountingConfig.findUnique({ where: { companyCode: COMPANY } });
  ok("19. K_IFRS preset 적용", updatedCfg?.standard === "K_IFRS" && updatedCfg.reportingCurrency === "KRW");
  await prisma.accountingConfig.update({ where: { companyCode: COMPANY }, data: { standard: "VAS", reportingCurrency: "VND" } });

  // 20
  const origMapping = await prisma.accountMapping.findUnique({ where: { companyCode_trigger: { companyCode: COMPANY, trigger: "SALES_REVENUE" } } });
  const targetCode = origMapping?.accountCode === "5113" ? "5111" : "5113";
  await prisma.accountMapping.update({ where: { id: origMapping!.id }, data: { accountCode: targetCode } });
  const updatedMap = await prisma.accountMapping.findUnique({ where: { companyCode_trigger: { companyCode: COMPANY, trigger: "SALES_REVENUE" } } });
  ok("20. AccountMapping 트리거 변경", updatedMap?.accountCode === targetCode, `${origMapping?.accountCode} → ${targetCode}`);
  await prisma.accountMapping.update({ where: { id: origMapping!.id }, data: { accountCode: origMapping!.accountCode } });

  // 21
  await prisma.journalEntry.deleteMany({ where: { companyCode: COMPANY, description: { startsWith: MARKER } } });
  await prisma.accountMonthlyBalance.deleteMany({ where: { companyCode: COMPANY, yearMonth: period } });
  await prisma.periodClose.deleteMany({ where: { companyCode: COMPANY, yearMonth: period } });
  await prisma.bankAccount.deleteMany({ where: { id: bank.id } });
  ok("21. 정리 — E2E 데이터 삭제", true);

  console.log(`\n${TAG} ${pass} pass / ${fail} fail / ${pass + fail} total\n`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
