import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { checkFinanceAccess } from "@/lib/rbac";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ id: string }> };

export default async function ExpenseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  { const r = checkFinanceAccess(session, "client"); if (!r.ok) redirect(r.redirectTo!); }
  const L = session.language;
  const r = await prisma.expense.findUnique({
    where: { id },
    include: {
      allocations: {
        include: {
          project: { select: { projectCode: true, name: true } },
          department: { select: { code: true, name: true } },
        },
      },
      payables: { select: { id: true, status: true, amount: true, paidAmount: true, dueDate: true } },
      linkedSales: { select: { id: true, salesNumber: true } },
      linkedPurchase: { select: { id: true, purchaseNumber: true } },
    },
  });
  if (!r) notFound();

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/finance/expenses" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">{t("page.expenses.back", L)}</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{r.expenseCode}</span>
            <span className="text-[16px] text-[color:var(--tts-accent)]">{Number(r.amount).toLocaleString()} {r.currency}</span>
          </h1>
        </div>
        <Card title={t("section.expenseOverview", L)}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <dt className="text-[color:var(--tts-sub)]">{t("field.expType", L)}</dt><dd>{r.expenseType}</dd>
            <dt className="text-[color:var(--tts-sub)]">{t("field.amountField", L)}</dt><dd className="font-mono">{Number(r.amount).toLocaleString()} {r.currency}</dd>
            <dt className="text-[color:var(--tts-sub)]">{t("field.fxRateField", L)}</dt><dd className="font-mono">{Number(r.fxRate)}</dd>
            <dt className="text-[color:var(--tts-sub)]">{t("col.incurredAt", L)}</dt><dd className="font-mono">{r.incurredAt.toISOString().slice(0, 10)}</dd>
            <dt className="text-[color:var(--tts-sub)]">{t("field.linkedSalesField", L)}</dt>
            <dd className="font-mono">
              {r.linkedSales ? (
                <Link href={`/sales/${r.linkedSales.id}`} className="text-[color:var(--tts-primary)] hover:underline">{r.linkedSales.salesNumber}</Link>
              ) : "-"}
            </dd>
            <dt className="text-[color:var(--tts-sub)]">{t("field.linkedPurchaseField", L)}</dt>
            <dd className="font-mono">
              {r.linkedPurchase ? (
                <Link href={`/purchases/${r.linkedPurchase.id}`} className="text-[color:var(--tts-primary)] hover:underline">{r.linkedPurchase.purchaseNumber}</Link>
              ) : "-"}
            </dd>
            <dt className="text-[color:var(--tts-sub)]">{t("field.noteField", L)}</dt><dd>{r.note ?? "-"}</dd>
          </dl>
        </Card>
        <div className="mt-4">
          <Card title={t("label.allocations", L).replace("{count}", String(r.allocations.length))}>
            {r.allocations.length === 0 ? <div className="text-[12px] text-[color:var(--tts-muted)]">{t("msg.noAllocations", L)}</div> : (
              <table className="w-full text-[12px]"><thead><tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"><th className="py-2 text-left">{t("th.projectId", L)}</th><th className="py-2 text-left">{t("th.departmentId", L)}</th><th className="py-2 text-left">{t("th.basis", L)}</th><th className="py-2 text-right">{t("th.weight", L)}</th><th className="py-2 text-right">{t("th.amountTh", L)}</th></tr></thead><tbody>
                {r.allocations.map((a) => (<tr key={a.id} className="border-b border-[color:var(--tts-border)]/50">
                  <td className="py-2 font-mono">{a.project ? `${a.project.projectCode} · ${a.project.name}` : "-"}</td>
                  <td className="py-2 font-mono">{a.department ? `${a.department.code} · ${a.department.name}` : "-"}</td>
                  <td className="py-2">{a.basis}</td>
                  <td className="py-2 text-right font-mono">{Number(a.weight)}</td>
                  <td className="py-2 text-right font-mono">{Number(a.amount).toLocaleString()}</td>
                </tr>))}
              </tbody></table>
            )}
          </Card>
        </div>
        <div className="mt-4">
          <Card title={t("label.payablesCount", L).replace("{count}", String(r.payables.length))}>
            {r.payables.length === 0 ? <div className="text-[12px] text-[color:var(--tts-muted)]">{t("msg.noPayables", L)}</div> : (
              <ul className="space-y-1 text-[12px]">{r.payables.map((p) => <li key={p.id} className="font-mono">{p.status} · {Number(p.amount).toLocaleString()} (paid {Number(p.paidAmount).toLocaleString()})</li>)}</ul>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
