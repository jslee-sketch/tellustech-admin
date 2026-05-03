import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { checkFinanceAccess } from "@/lib/rbac";
import { CashTxClient, type CashTxRow } from "./cash-tx-client";

export const dynamic = "force-dynamic";

export default async function CashTxnPage() {
  const session = await getSession();
  { const r = checkFinanceAccess(session, "manager"); if (!r.ok) redirect(r.redirectTo!); }
  const L = session.language;
  const txns = await prisma.cashTransaction.findMany({
    orderBy: { txnDate: "desc" },
    take: 1000,
    include: { account: { select: { accountCode: true, accountName: true } } },
  });
  const rows: CashTxRow[] = txns.map((tx) => ({
    id: tx.id, txnCode: tx.txnCode, txnDate: tx.txnDate.toISOString(),
    accountCode: tx.account.accountCode, accountName: tx.account.accountName,
    txnType: tx.txnType, category: tx.category,
    amount: tx.amount.toString(), currency: tx.currency,
    description: tx.description, status: tx.status,
  }));
  return <CashTxClient rows={rows} lang={L} />;
}
