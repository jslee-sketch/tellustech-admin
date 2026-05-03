import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, requireString, serverError } from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { Prisma } from "@/generated/prisma/client";

// 계좌이체 — 출금 1건 + 입금 1건 쌍 생성. transferPairId 로 묶음.
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const fromAccountId = requireString(p.fromAccountId, "fromAccountId");
      const toAccountId = requireString(p.toAccountId, "toAccountId");
      if (fromAccountId === toAccountId) return badRequest("same_account");
      const description = requireString(p.description, "description");
      const amount = Number(requireString(p.amount, "amount"));
      if (!Number.isFinite(amount) || amount <= 0) return badRequest("invalid_input", { field: "amount" });
      const txnDate = p.txnDate ? new Date(String(p.txnDate)) : new Date();

      const [fromAcc, toAcc] = await Promise.all([
        prisma.bankAccount.findUnique({ where: { id: fromAccountId } }),
        prisma.bankAccount.findUnique({ where: { id: toAccountId } }),
      ]);
      if (!fromAcc || !toAcc) return badRequest("invalid_account");

      const result = await withUniqueRetry(
        async () => {
          const code1 = await generateDatedCode({
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
          // 두 번째 코드는 첫번째 + 1
          const tail = code1.split("-").pop() ?? "001";
          const next = String(Number(tail) + 1).padStart(tail.length, "0");
          const code2 = code1.replace(/-\d+$/, `-${next}`);

          return prisma.$transaction(async (tx) => {
            // 출금 (FROM)
            const out = await tx.cashTransaction.create({
              data: {
                txnCode: code1, txnDate, txnType: "TRANSFER",
                amount: amount.toFixed(2), currency: fromAcc.currency,
                exchangeRate: "1", amountLocal: amount.toFixed(2),
                accountId: fromAccountId, counterAccountId: toAccountId,
                category: "TRANSFER",
                description: `${description} (출금)`,
                status: "CONFIRMED",
                confirmedById: session.sub, confirmedAt: new Date(),
              },
            });
            // 입금 (TO)
            const inb = await tx.cashTransaction.create({
              data: {
                txnCode: code2, txnDate, txnType: "TRANSFER",
                amount: amount.toFixed(2), currency: toAcc.currency,
                exchangeRate: "1", amountLocal: amount.toFixed(2),
                accountId: toAccountId, counterAccountId: fromAccountId,
                category: "TRANSFER",
                description: `${description} (입금)`,
                status: "CONFIRMED",
                confirmedById: session.sub, confirmedAt: new Date(),
                transferPairId: out.id,
              },
            });
            // pair back-link
            await tx.cashTransaction.update({ where: { id: out.id }, data: { transferPairId: inb.id } });
            // 잔고 갱신
            await tx.bankAccount.update({
              where: { id: fromAccountId },
              data: { currentBalance: { decrement: new Prisma.Decimal(amount.toFixed(2)) } },
            });
            await tx.bankAccount.update({
              where: { id: toAccountId },
              data: { currentBalance: { increment: new Prisma.Decimal(amount.toFixed(2)) } },
            });
            return { out, in: inb };
          });
        },
        { isConflict: (e) => (e as { code?: string })?.code === "P2002" },
      );
      return ok(result, { status: 201 });
    } catch (err) { return serverError(err); }
  });
}
