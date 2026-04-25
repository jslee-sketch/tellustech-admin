import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ id: string }> };

export default async function ExpenseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const L = session.language;
  const r = await prisma.expense.findUnique({
    where: { id },
    include: {
      allocations: { include: { expense: false } },
      payables: { select: { id: true, status: true, amount: true, paidAmount: true, dueDate: true } },
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
        <Card title="개요">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <dt className="text-[color:var(--tts-sub)]">유형</dt><dd>{r.expenseType}</dd>
            <dt className="text-[color:var(--tts-sub)]">금액</dt><dd className="font-mono">{Number(r.amount).toLocaleString()} {r.currency}</dd>
            <dt className="text-[color:var(--tts-sub)]">환율</dt><dd className="font-mono">{Number(r.fxRate)}</dd>
            <dt className="text-[color:var(--tts-sub)]">발생일</dt><dd className="font-mono">{r.incurredAt.toISOString().slice(0, 10)}</dd>
            <dt className="text-[color:var(--tts-sub)]">연관 매출</dt><dd className="font-mono">{r.linkedSalesId ?? "-"}</dd>
            <dt className="text-[color:var(--tts-sub)]">연관 매입</dt><dd className="font-mono">{r.linkedPurchaseId ?? "-"}</dd>
            <dt className="text-[color:var(--tts-sub)]">비고</dt><dd>{r.note ?? "-"}</dd>
          </dl>
        </Card>
        <div className="mt-4">
          <Card title={`배분 (${r.allocations.length})`}>
            {r.allocations.length === 0 ? <div className="text-[12px] text-[color:var(--tts-muted)]">배분 내역 없음</div> : (
              <table className="w-full text-[12px]"><thead><tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"><th className="py-2 text-left">프로젝트</th><th className="py-2 text-left">부서</th><th className="py-2 text-left">기준</th><th className="py-2 text-right">비율</th><th className="py-2 text-right">금액</th></tr></thead><tbody>
                {r.allocations.map((a) => (<tr key={a.id} className="border-b border-[color:var(--tts-border)]/50"><td className="py-2 font-mono">{a.projectId ?? "-"}</td><td className="py-2 font-mono">{a.departmentId ?? "-"}</td><td className="py-2">{a.basis}</td><td className="py-2 text-right font-mono">{Number(a.weight)}</td><td className="py-2 text-right font-mono">{Number(a.amount).toLocaleString()}</td></tr>))}
              </tbody></table>
            )}
          </Card>
        </div>
        <div className="mt-4">
          <Card title={`미지급 (${r.payables.length})`}>
            {r.payables.length === 0 ? <div className="text-[12px] text-[color:var(--tts-muted)]">미지급 없음</div> : (
              <ul className="space-y-1 text-[12px]">{r.payables.map((p) => <li key={p.id} className="font-mono">{p.status} · {Number(p.amount).toLocaleString()} (paid {Number(p.paidAmount).toLocaleString()})</li>)}</ul>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
