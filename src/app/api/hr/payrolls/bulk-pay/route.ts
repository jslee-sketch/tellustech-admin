import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, requireString, serverError } from "@/lib/api-utils";
import { generateDatedCode } from "@/lib/code-generator";
import { Prisma } from "@/generated/prisma/client";

// POST body: { yearMonth: "2026-05", bankAccountId, employeeIds: [...] (선택, 비우면 전체) }
// → N건 Payroll.paidAt 갱신 + N건 CashTransaction(WITHDRAWAL/SALARY) 일괄 생성 + 잔고 갱신
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const ym = requireString(p.yearMonth, "yearMonth");
      const m = /^(\d{4})-(\d{2})$/.exec(ym);
      if (!m) return badRequest("invalid_input", { field: "yearMonth" });
      const monthDate = new Date(Number(m[1]), Number(m[2]) - 1, 1);
      const bankAccountId = requireString(p.bankAccountId, "bankAccountId");
      const employeeIds = Array.isArray(p.employeeIds) ? (p.employeeIds as string[]) : null;

      const acc = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!acc) return badRequest("invalid_account");

      // 이번 달의 미지급 Payroll 조회
      const payrolls = await prisma.payroll.findMany({
        where: {
          month: monthDate,
          paidAt: null,
          ...(employeeIds && employeeIds.length > 0 ? { employeeId: { in: employeeIds } } : {}),
        },
      });
      if (payrolls.length === 0) return ok({ paid: 0, message: "no_payrolls" });

      const result = await prisma.$transaction(async (tx) => {
        let totalAmount = 0;
        const cashTxns: Array<{ id: string; payrollId: string }> = [];
        for (const pr of payrolls) {
          const amt = Number(pr.netPay);
          const txnCode = await generateDatedCode({
            prefix: "CT",
            lookupLast: async (fp) => {
              const last = await tx.cashTransaction.findFirst({ where: { txnCode: { startsWith: fp } }, orderBy: { txnCode: "desc" }, select: { txnCode: true } });
              return last?.txnCode ?? null;
            },
          });
          const ct = await tx.cashTransaction.create({
            data: {
              txnCode, txnDate: new Date(), txnType: "WITHDRAWAL", category: "SALARY",
              accountId: bankAccountId,
              amount: amt.toFixed(2), currency: acc.currency,
              exchangeRate: "1", amountLocal: amt.toFixed(2),
              description: `급여 ${ym} (${pr.employeeId})`,
              status: "CONFIRMED",
              confirmedById: session.sub, confirmedAt: new Date(),
            },
          });
          await tx.payroll.update({
            where: { id: pr.id },
            data: {
              paidAt: new Date(),
              paidById: session.sub,
              bankAccountId,
              cashTransactionId: ct.id,
            },
          });
          cashTxns.push({ id: ct.id, payrollId: pr.id });
          totalAmount += amt;
        }
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { currentBalance: { decrement: new Prisma.Decimal(totalAmount.toFixed(2)) } },
        });
        return { paid: payrolls.length, totalAmount: totalAmount.toFixed(2), cashTxns };
      }, { timeout: 30_000 });

      return ok(result);
    } catch (err) { return serverError(err); }
  });
}
