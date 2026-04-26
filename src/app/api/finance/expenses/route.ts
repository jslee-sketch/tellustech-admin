import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest, conflict, handleFieldError, isUniqueConstraintError, ok,
  optionalEnum, requireEnum, requireString, serverError, trimNonEmpty,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import type { AllocationBasis, Currency, ExpenseType } from "@/generated/prisma/client";

const EXP_TYPES: readonly ExpenseType[] = ["PURCHASE", "SALES", "GENERAL", "TRANSPORT", "MEAL", "ENTERTAINMENT", "RENT", "UTILITY", "OTHER"] as const;
const BASES: readonly AllocationBasis[] = ["QUANTITY", "AMOUNT"] as const;
const CURRENCIES: readonly Currency[] = ["VND", "USD", "KRW", "JPY", "CNY"] as const;

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
  return withSessionContext(async () => {
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
              },
            });
            if (allocsData.length > 0) {
              await tx.expenseAllocation.createMany({
                data: allocsData.map((a) => ({ expenseId: exp.id, ...a })),
              });
            }
            return exp;
          });
        },
        { isConflict: isUniqueConstraintError },
      );
      return ok({ expense: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      return serverError(err);
    }
  });
}
