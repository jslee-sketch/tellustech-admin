import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// 매월 1일 03:00 KST — 전월 BankAccountMonthlySnapshot + Budget.actualAmount 자동 집계.
// Bearer CRON_SECRET 으로 보호. body.yearMonth 가 들어오면 그 월, 없으면 전월.
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch { /* empty body OK */ }
  const explicitYm = typeof body.yearMonth === "string" ? body.yearMonth : null;

  const now = new Date();
  const target = explicitYm ?? `${now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, "0")}`;
  const m = /^(\d{4})-(\d{2})$/.exec(target);
  if (!m) return NextResponse.json({ error: "invalid_yearMonth" }, { status: 400 });
  const year = Number(m[1]); const month = Number(m[2]) - 1;
  const from = new Date(year, month, 1, 0, 0, 0);
  const to = new Date(year, month + 1, 0, 23, 59, 59);

  // 1) BankAccountMonthlySnapshot — 계좌별 in/out 합계 + closingBalance
  const accounts = await prisma.bankAccount.findMany({ where: { isActive: true } });
  let snapshots = 0;
  for (const acc of accounts) {
    const txns = await prisma.cashTransaction.findMany({
      where: { accountId: acc.id, status: "CONFIRMED", txnDate: { gte: from, lte: to } },
      select: { txnType: true, amountLocal: true },
    });
    const totalIn = txns.filter((t) => t.txnType === "DEPOSIT").reduce((s, t) => s + Number(t.amountLocal), 0);
    const totalOut = txns.filter((t) => t.txnType === "WITHDRAWAL").reduce((s, t) => s + Number(t.amountLocal), 0);
    // openingBalance = 직전월 closing 또는 acc.openingBalance
    const prevYm = month === 0 ? `${year - 1}-12` : `${year}-${String(month).padStart(2, "0")}`;
    const prev = await prisma.bankAccountMonthlySnapshot.findUnique({
      where: { companyCode_accountId_yearMonth: { companyCode: acc.companyCode, accountId: acc.id, yearMonth: prevYm } },
    });
    const openingBalance = prev ? Number(prev.closingBalance) : Number(acc.openingBalance);
    const closingBalance = openingBalance + totalIn - totalOut;
    await prisma.bankAccountMonthlySnapshot.upsert({
      where: { companyCode_accountId_yearMonth: { companyCode: acc.companyCode, accountId: acc.id, yearMonth: target } },
      create: {
        accountId: acc.id, yearMonth: target,
        openingBalance: openingBalance.toFixed(2),
        totalIn: totalIn.toFixed(2),
        totalOut: totalOut.toFixed(2),
        closingBalance: closingBalance.toFixed(2),
        companyCode: acc.companyCode,
      },
      update: {
        openingBalance: openingBalance.toFixed(2),
        totalIn: totalIn.toFixed(2),
        totalOut: totalOut.toFixed(2),
        closingBalance: closingBalance.toFixed(2),
      },
    });
    snapshots++;
  }

  // 2) Budget.actualAmount — 비용 센터별 ExpenseAllocation 집계
  const budgets = await prisma.budget.findMany({ where: { yearMonth: target } });
  let updatedBudgets = 0;
  for (const b of budgets) {
    const allocSum = await prisma.expenseAllocation.aggregate({
      where: {
        costCenterId: b.costCenterId,
        createdAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });
    const actual = Number(allocSum._sum.amount ?? 0);
    const variance = Number(b.budgetAmount) - actual;
    await prisma.budget.update({
      where: { id: b.id },
      data: {
        actualAmount: actual.toFixed(2),
        variance: variance.toFixed(2),
      },
    });
    // 예산 초과 알림 — actual > budget 인 경우 ADMIN 알림
    if (actual > Number(b.budgetAmount)) {
      const cc = await prisma.costCenter.findUnique({ where: { id: b.costCenterId } });
      if (cc) {
        const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, allowedCompanies: true } });
        const targets = admins.filter((u) => Array.isArray(u.allowedCompanies) && u.allowedCompanies.includes(b.companyCode)).map((u) => u.id);
        for (const uid of targets) {
          try {
            await prisma.notification.create({
              data: {
                companyCode: b.companyCode,
                userId: uid,
                type: "BUDGET_OVERRUN",
                titleKo: `예산 초과 — ${cc.code}`,
                titleVi: `Vượt ngân sách — ${cc.code}`,
                titleEn: `Budget overrun — ${cc.code}`,
                bodyKo: `${target}: 예산 ${Number(b.budgetAmount).toFixed(0)} / 실적 ${actual.toFixed(0)} (초과 ${(actual - Number(b.budgetAmount)).toFixed(0)})`,
                bodyVi: `${target}: NS ${Number(b.budgetAmount).toFixed(0)} / Thực tế ${actual.toFixed(0)}`,
                bodyEn: `${target}: budget ${Number(b.budgetAmount).toFixed(0)} / actual ${actual.toFixed(0)}`,
                linkUrl: "/finance/cost-centers",
              },
            });
          } catch { /* ignore */ }
        }
      }
    }
    updatedBudgets++;
  }

  return NextResponse.json({ ok: true, yearMonth: target, snapshots, updatedBudgets });
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "jobs/finance-monthly-snapshot" });
}
