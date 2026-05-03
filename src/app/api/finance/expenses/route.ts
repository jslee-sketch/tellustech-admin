import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest, handleFieldError, isUniqueConstraintError, ok,
  optionalEnum, requireEnum, requireString, serverError, trimNonEmpty,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { Prisma, type AllocationBasis, type Currency, type ExpenseType, type ExpensePaymentMethod, type ExpensePaymentStatus } from "@/generated/prisma/client";

const EXP_TYPES: readonly ExpenseType[] = ["PURCHASE", "SALES", "GENERAL", "TRANSPORT", "MEAL", "ENTERTAINMENT", "RENT", "UTILITY", "OTHER"] as const;
const BASES: readonly AllocationBasis[] = ["QUANTITY", "AMOUNT"] as const;
const CURRENCIES: readonly Currency[] = ["VND", "USD", "KRW", "JPY", "CNY"] as const;
const PAY_METHODS: readonly ExpensePaymentMethod[] = ["CORPORATE_CARD", "BANK_TRANSFER", "CASH_COMPANY", "CASH_PERSONAL", "CREDIT_PERSONAL"] as const;
const PAY_STATUSES: readonly ExpensePaymentStatus[] = ["PAID", "PENDING_PAYMENT", "PENDING_REIMBURSE", "REIMBURSED"] as const;

// 즉시 출금 가능한 결제수단 — 회사 자금이 즉시 빠지는 케이스만
const IMMEDIATE_OUT_METHODS: readonly ExpensePaymentMethod[] = ["CORPORATE_CARD", "BANK_TRANSFER", "CASH_COMPANY"] as const;

// 비용 CRUD — 저장 시 optional 로 원가배분 라인(allocations) 포함 가능.
// 배분 비중 = QUANTITY or AMOUNT 기준. 합이 amount 와 일치하도록 권장 (검증은 기본만).

export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const type = optionalEnum(url.searchParams.get("type"), EXP_TYPES);
    const rows = await prisma.expense.findMany({
      where: { ...(type ? { expenseType: type } : {}) },
      orderBy: { incurredAt: "desc" }, take: 500,
      include: { _count: { select: { allocations: true } }, allocations: true },
    });
    return ok({ expenses: rows });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const expenseType = requireEnum(p.expenseType, EXP_TYPES, "expenseType");
      const amountStr = requireString(p.amount, "amount");
      const amount = Number(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) return badRequest("invalid_input", { field: "amount" });
      const incurredAtStr = requireString(p.incurredAt, "incurredAt");
      const incurredAt = new Date(incurredAtStr);
      if (Number.isNaN(incurredAt.getTime())) return badRequest("invalid_input", { field: "incurredAt" });

      const currency = optionalEnum(p.currency, CURRENCIES) ?? "VND";
      const rawFx = Number(p.fxRate ?? 1);
      const fxRate = Number.isFinite(rawFx) && rawFx > 0 ? rawFx.toFixed(6) : "1";

      const rawAllocs = Array.isArray(p.allocations) ? (p.allocations as unknown[]) : [];
      const allocsData = rawAllocs.map((a) => {
        const al = a as Record<string, unknown>;
        const basis = optionalEnum(al.basis, BASES) ?? "AMOUNT";
        const weight = Number(al.weight ?? 0);
        const allocAmount = Number(al.amount ?? 0);
        return {
          basis,
          weight: Number.isFinite(weight) ? weight.toFixed(4) : "0",
          amount: Number.isFinite(allocAmount) ? allocAmount.toFixed(2) : "0",
          projectId: trimNonEmpty(al.projectId),
          departmentId: trimNonEmpty(al.departmentId),
        };
      });

      // Layer 1 신규 입력
      const paymentMethod = optionalEnum(p.paymentMethod, PAY_METHODS) ?? null;
      const cashOut = !!p.cashOut;
      const cashOutAccountId = trimNonEmpty(p.cashOutAccountId);
      const vendorClientId = trimNonEmpty(p.vendorClientId);
      const vendorName = trimNonEmpty(p.vendorName);
      const targetClientId = trimNonEmpty(p.targetClientId);
      // 결제 상태 자동 결정
      let paymentStatus: ExpensePaymentStatus = "PAID";
      if (paymentMethod === "CASH_PERSONAL" || paymentMethod === "CREDIT_PERSONAL") paymentStatus = "PENDING_REIMBURSE";
      else if (!paymentMethod) paymentStatus = "PENDING_PAYMENT";
      const explicit = optionalEnum(p.paymentStatus, PAY_STATUSES);
      if (explicit) paymentStatus = explicit;

      const created = await withUniqueRetry(
        async () => {
          const expenseCode = await generateDatedCode({
            prefix: "EXP",
            lookupLast: async (fp) => {
              const last = await prisma.expense.findFirst({
                where: { deletedAt: undefined, expenseCode: { startsWith: fp } },
                orderBy: { expenseCode: "desc" },
                select: { expenseCode: true },
              });
              return last?.expenseCode ?? null;
            },
          });
          return prisma.$transaction(async (tx) => {
            const exp = await tx.expense.create({
              data: {
                expenseCode,
                expenseType,
                amount: amount.toFixed(2),
                currency,
                fxRate,
                note: trimNonEmpty(p.note),
                incurredAt,
                linkedSalesId: trimNonEmpty(p.linkedSalesId),
                linkedPurchaseId: trimNonEmpty(p.linkedPurchaseId),
                paymentMethod,
                paymentStatus,
                vendorClientId, vendorName, targetClientId,
              },
            });
            if (allocsData.length > 0) {
              await tx.expenseAllocation.createMany({
                data: allocsData.map((a) => ({ expenseId: exp.id, ...a })),
              });
            }
            // 즉시 출금 옵션 — IMMEDIATE_OUT_METHODS 만 가능
            if (cashOut && cashOutAccountId && paymentMethod && IMMEDIATE_OUT_METHODS.includes(paymentMethod)) {
              const acc = await tx.bankAccount.findUnique({ where: { id: cashOutAccountId } });
              if (acc) {
                const txnCode = await generateDatedCode({
                  prefix: "CT",
                  lookupLast: async (fp) => {
                    const last = await tx.cashTransaction.findFirst({ where: { txnCode: { startsWith: fp } }, orderBy: { txnCode: "desc" }, select: { txnCode: true } });
                    return last?.txnCode ?? null;
                  },
                });
                await tx.cashTransaction.create({
                  data: {
                    txnCode, txnDate: incurredAt, txnType: "WITHDRAWAL", category: "EXPENSE",
                    accountId: cashOutAccountId,
                    amount: amount.toFixed(2), currency: acc.currency,
                    exchangeRate: fxRate, amountLocal: amount.toFixed(2),
                    expenseId: exp.id,
                    clientId: vendorClientId,
                    description: `${expenseCode} ${trimNonEmpty(p.note) ?? ""}`.trim(),
                    status: "CONFIRMED",
                    confirmedAt: new Date(),
                  },
                });
                await tx.bankAccount.update({
                  where: { id: cashOutAccountId },
                  data: { currentBalance: { decrement: new Prisma.Decimal(amount.toFixed(2)) } },
                });
              }
            }
            return exp;
          });
        },
        { isConflict: isUniqueConstraintError },
      );
      // Layer 3 — 비용 자동 분개.
      try {
        const { postExpenseJournal } = await import("@/lib/journal");
        await postExpenseJournal({
          expenseId: created.id,
          expenseDate: incurredAt,
          amount,
          paymentStatus: paymentStatus ?? "PENDING_PAYMENT",
          companyCode: session.companyCode as "TV" | "VR",
          description: `비용 ${created.expenseCode}${trimNonEmpty(p.note) ? ` — ${trimNonEmpty(p.note)}` : ""}`,
          createdById: session.sub,
        });
      } catch (e) {
        console.error("[expense] auto-journal failed:", e);
      }

      return ok({ expense: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      return serverError(err);
    }
  });
}
