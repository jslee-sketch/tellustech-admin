import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { ok } from "@/lib/api-utils";

// 잔고 정합성 검증 — currentBalance 캐시 vs openingBalance + SUM(deposits) - SUM(withdrawals)
// 결과: 계좌별 cached / computed / drift (drift != 0 이면 불일치)
export async function GET() {
  return withSessionContext(async () => {
    const accounts = await prisma.bankAccount.findMany({ orderBy: { accountCode: "asc" } });
    const results = await Promise.all(accounts.map(async (acc) => {
      const txns = await prisma.cashTransaction.findMany({
        where: { accountId: acc.id, status: "CONFIRMED" },
        select: { txnType: true, amount: true },
      });
      const deposits = txns.filter((t) => t.txnType === "DEPOSIT").reduce((s, t) => s + Number(t.amount), 0);
      const withdrawals = txns.filter((t) => t.txnType === "WITHDRAWAL").reduce((s, t) => s + Number(t.amount), 0);
      const computed = Number(acc.openingBalance) + deposits - withdrawals;
      const cached = Number(acc.currentBalance ?? 0);
      const drift = +(computed - cached).toFixed(2);
      return {
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        cached, computed, drift,
        ok: Math.abs(drift) < 0.01,
      };
    }));
    return ok({ accounts: results, anyDrift: results.some((r) => !r.ok) });
  });
}
