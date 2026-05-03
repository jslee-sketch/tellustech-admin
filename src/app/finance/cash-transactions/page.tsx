import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { checkFinanceAccess } from "@/lib/rbac";
import { t } from "@/lib/i18n";
import { Button, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CashTxnPage() {
  const session = await getSession();
  { const r = checkFinanceAccess(session, "manager"); if (!r.ok) redirect(r.redirectTo!); }
  const L = session.language;
  const txns = await prisma.cashTransaction.findMany({
    orderBy: { txnDate: "desc" },
    take: 200,
    include: { account: { select: { accountCode: true, accountName: true } } },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-[color:var(--tts-text)]">{t("nav.cashTransactions", L)}</h1>
          <Link href="/finance/accounts">
            <Button variant="primary">+ {t("finance.newCashTxn", L)}</Button>
          </Link>
        </div>
        <Card>
          <table className="w-full text-[12px]">
            <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
              <tr>
                <th className="py-2 text-left">Code</th>
                <th className="text-left">{t("finance.txnDate", L)}</th>
                <th className="text-left">{t("finance.account", L)}</th>
                <th className="text-left">{t("finance.txnType", L)}</th>
                <th className="text-left">{t("finance.category", L)}</th>
                <th className="text-right">{t("finance.amount", L)}</th>
                <th className="text-left">{t("finance.description", L)}</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((tx) => (
                <tr key={tx.id} className="border-b border-[color:var(--tts-border)]/50">
                  <td className="py-2 font-mono text-[11px]">{tx.txnCode}</td>
                  <td className="text-[11px]">{tx.txnDate.toISOString().slice(0, 10)}</td>
                  <td className="font-mono text-[11px]">{tx.account.accountCode}</td>
                  <td>{tx.txnType}</td>
                  <td className="text-[11px]">{tx.category}</td>
                  <td className={`text-right font-mono font-bold ${tx.txnType === "DEPOSIT" ? "text-emerald-500" : tx.txnType === "WITHDRAWAL" ? "text-rose-500" : ""}`}>
                    {tx.txnType === "DEPOSIT" ? "+" : tx.txnType === "WITHDRAWAL" ? "−" : "↔"} {Number(tx.amount).toLocaleString()} {tx.currency}
                  </td>
                  <td className="text-[11px]">{tx.description}</td>
                  <td className="text-[11px]">{tx.status}</td>
                </tr>
              ))}
              {txns.length === 0 && <tr><td colSpan={8} className="py-4 text-center text-[color:var(--tts-muted)]">no transactions yet</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </main>
  );
}
