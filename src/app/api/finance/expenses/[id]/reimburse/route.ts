import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, notFound, ok, requireString, serverError } from "@/lib/api-utils";
import { generateDatedCode } from "@/lib/code-generator";
import { Prisma } from "@/generated/prisma/client";

type Ctx = { params: Promise<{ id: string }> };

// POST body: { bankAccountId, paidAt? }
// 개인 선지급 비용을 환급 — CashTransaction(WITHDRAWAL/REIMBURSEMENT) 생성 + Expense.paymentStatus REIMBURSED
export async function POST(request: Request, ctx: Ctx) {
  return withSessionContext(async (session) => {
    const { id } = await ctx.params;
    const exp = await prisma.expense.findUnique({ where: { id } });
    if (!exp) return notFound();
    if (exp.paymentStatus !== "PENDING_REIMBURSE") return badRequest("not_pending_reimburse");
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const bankAccountId = requireString(p.bankAccountId, "bankAccountId");
      const paidAt = p.paidAt ? new Date(String(p.paidAt)) : new Date();
      const acc = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!acc) return badRequest("invalid_account");

      const result = await prisma.$transaction(async (tx) => {
        const txnCode = await generateDatedCode({
          prefix: "CT",
          lookupLast: async (fp) => {
            const last = await tx.cashTransaction.findFirst({ where: { txnCode: { startsWith: fp } }, orderBy: { txnCode: "desc" }, select: { txnCode: true } });
            return last?.txnCode ?? null;
          },
        });
        const cashTxn = await tx.cashTransaction.create({
          data: {
            txnCode, txnDate: paidAt, txnType: "WITHDRAWAL", category: "REIMBURSEMENT",
            accountId: bankAccountId,
            amount: exp.amount.toString(),
            currency: exp.currency,
            exchangeRate: exp.fxRate.toString(),
            amountLocal: exp.amount.toString(),
            description: `환급 ${exp.expenseCode}`,
            status: "CONFIRMED",
            confirmedById: session.sub, confirmedAt: new Date(),
          },
        });
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { currentBalance: { decrement: new Prisma.Decimal(exp.amount.toString()) } },
        });
        const updated = await tx.expense.update({
          where: { id },
          data: {
            paymentStatus: "REIMBURSED",
            reimbursedAt: new Date(),
            reimbursedById: session.sub,
            reimburseCashTxId: cashTxn.id,
          },
        });
        return { expense: updated, cashTxn };
      });
      // 알림 — 환급 승인 완료. Expense 에 신청자 추적 필드가 없어 ROLE=ADMIN 룰 한정.
      // 정확한 신청자 알림은 Expense.createdById 추가 후 향후 보강.
      try {
        const { dispatchNotification } = await import("@/lib/notify/dispatcher");
        const exp = result.expense;
        await dispatchNotification({
          eventType: "EXPENSE_REIMBURSE_APPROVED",
          companyCode: session.companyCode as "TV" | "VR",
          data: {
            amount: Number(exp.amount).toLocaleString(),
            description: exp.note ?? exp.expenseCode,
          },
          linkedModel: "Expense", linkedId: exp.id, linkUrl: `/finance/expenses/${exp.id}`,
        });
      } catch (e) { console.error("[expense-reimburse] notify failed:", e); }
      return ok(result);
    } catch (err) { return serverError(err); }
  });
}
