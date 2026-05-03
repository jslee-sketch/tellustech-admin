import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, requireString, serverError, trimNonEmpty, optionalEnum, requireEnum } from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { Prisma, type CashCategory, type CashTxnType, type Currency } from "@/generated/prisma/client";

const TXN_TYPES: readonly CashTxnType[] = ["DEPOSIT", "WITHDRAWAL", "TRANSFER"] as const;
const CATEGORIES: readonly CashCategory[] = [
  "RECEIVABLE_COLLECTION", "PAYABLE_PAYMENT", "SALARY", "TAX",
  "EXPENSE", "REVENUE_OTHER", "TRANSFER", "LOAN_IN", "LOAN_OUT", "REIMBURSEMENT", "OTHER",
] as const;
const CURRENCIES: readonly Currency[] = ["VND", "USD", "KRW", "JPY", "CNY"] as const;

export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const accountId = trimNonEmpty(url.searchParams.get("accountId"));
    const txnType = optionalEnum(url.searchParams.get("txnType"), TXN_TYPES);
    const category = optionalEnum(url.searchParams.get("category"), CATEGORIES);
    const fromStr = trimNonEmpty(url.searchParams.get("from"));
    const toStr = trimNonEmpty(url.searchParams.get("to"));

    const txns = await prisma.cashTransaction.findMany({
      where: {
        ...(accountId ? { accountId } : {}),
        ...(txnType ? { txnType } : {}),
        ...(category ? { category } : {}),
        ...(fromStr || toStr
          ? { txnDate: { ...(fromStr ? { gte: new Date(fromStr) } : {}), ...(toStr ? { lte: new Date(toStr) } : {}) } }
          : {}),
      },
      orderBy: { txnDate: "desc" },
      take: 500,
      include: {
        account: { select: { accountCode: true, accountName: true, currency: true } },
        client: { select: { id: true, clientCode: true, companyNameVi: true, companyNameKo: true } },
      },
    });
    return ok({ transactions: txns });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const txnType = requireEnum(p.txnType, TXN_TYPES, "txnType");
      if (txnType === "TRANSFER") return badRequest("use_transfer_endpoint");
      const accountId = requireString(p.accountId, "accountId");
      const category = requireEnum(p.category, CATEGORIES, "category");
      const description = requireString(p.description, "description");
      const amount = Number(requireString(p.amount, "amount"));
      if (!Number.isFinite(amount) || amount <= 0) return badRequest("invalid_input", { field: "amount" });
      const txnDate = p.txnDate ? new Date(String(p.txnDate)) : new Date();
      const currency = optionalEnum(p.currency, CURRENCIES) ?? "VND";
      const exchangeRate = Number(p.exchangeRate ?? 1);
      const amountLocal = currency === "VND" ? amount : amount * exchangeRate;

      const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
      if (!account) return badRequest("invalid_account");

      const created = await withUniqueRetry(
        async () => {
          const txnCode = await generateDatedCode({
            prefix: "CT",
            lookupLast: async (fp) => {
              const last = await prisma.cashTransaction.findFirst({
                where: { txnCode: { startsWith: fp } },
                orderBy: { txnCode: "desc" },
                select: { txnCode: true },
              });
              return last?.txnCode ?? null;
            },
          });
          return prisma.$transaction(async (tx) => {
            const t = await tx.cashTransaction.create({
              data: {
                txnCode, txnDate, txnType, amount: amount.toFixed(2), currency,
                exchangeRate: exchangeRate.toFixed(4), amountLocal: amountLocal.toFixed(2),
                accountId, category, description,
                clientId: trimNonEmpty(p.clientId),
                status: "CONFIRMED",
                confirmedById: session.sub,
                confirmedAt: new Date(),
              },
            });
            // 잔고 갱신
            const delta = txnType === "DEPOSIT" ? amount : -amount;
            await tx.bankAccount.update({
              where: { id: accountId },
              data: { currentBalance: { increment: new Prisma.Decimal(delta.toFixed(2)) } },
            });
            return t;
          });
        },
        { isConflict: (e) => (e as { code?: string })?.code === "P2002" },
      );

      // Layer 3 — 자금 자동 분개.
      try {
        const { postCashJournal, lookupAccountCode } = await import("@/lib/journal");
        const bankCode = await lookupAccountCode(txnType === "DEPOSIT" ? "CASH_IN" : "CASH_OUT", session.companyCode as "TV" | "VR");
        if (bankCode) {
          // 카테고리 → trigger 매핑
          const catTrigger =
            category === "RECEIVABLE_COLLECTION" ? "SALES_COLLECTION"
            : category === "PAYABLE_PAYMENT" ? "PURCHASE_PAYMENT"
            : category === "SALARY" ? "PAYROLL"
            : category === "EXPENSE" ? "EXPENSE"
            : "OTHER";
          await postCashJournal({
            cashTxId: created.id,
            txnDate,
            type: txnType === "DEPOSIT" ? "IN" : txnType === "WITHDRAWAL" ? "OUT" : "TRANSFER",
            amount,
            category: catTrigger,
            bankAccountCode: bankCode,
            companyCode: session.companyCode as "TV" | "VR",
            description,
            createdById: session.sub,
          });
        }
      } catch (e) {
        console.error("[cash-tx] auto-journal failed:", e);
      }

      return ok({ transaction: created }, { status: 201 });
    } catch (err) { return serverError(err); }
  });
}
