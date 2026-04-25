import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Badge, Button, Card, DataTable, ExcelDownload } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await getSession();
  const L = session.language;
  const rows = await prisma.expense.findMany({
    orderBy: { incurredAt: "desc" }, take: 500,
    include: { _count: { select: { allocations: true } } },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH ERP</Link>
            <h1 className="mt-1 text-2xl font-extrabold">{t("page.expenses.title", L)}</h1>
          </div>
          <div className="flex gap-2">
            <ExcelDownload
              rows={rows.map((r) => ({
                code: r.expenseCode,
                date: r.incurredAt.toISOString().slice(0, 10),
                type: r.expenseType,
                amount: Number(r.amount),
                currency: r.currency,
                fxRate: Number(r.fxRate),
                vndAmount: Number(r.amount) * Number(r.fxRate),
                note: r.note ?? "",
              }))}
              columns={[
                { key: "code", header: t("header.expenseCode", L) },
                { key: "date", header: t("col.incurredAt", L) },
                { key: "type", header: t("col.expenseType", L) },
                { key: "amount", header: t("header.expenseAmountVnd", L) },
                { key: "currency", header: t("field.currency", L) },
                { key: "fxRate", header: t("header.fxRate", L) },
                { key: "vndAmount", header: t("header.amountVnd", L) },
                { key: "note", header: t("header.note", L) },
              ]}
              filename="expenses.xlsx"
            />
            <Link href="/finance/expenses/new"><Button>{t("page.expenses.new", L)}</Button></Link>
          </div>
        </div>
        <Card title={t("title.expenses", L)} count={rows.length}>
          <DataTable
            columns={[
              { key: "expenseCode", label: t("col.expenseCode", L), width: "170px", render: (v, row) => <Link href={`/finance/expenses/${row.id}`} className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)] hover:underline">{v as string}</Link> },
              { key: "incurredAt", label: t("col.incurredAt", L), width: "110px", render: (v) => <span className="font-mono text-[11px]">{(v as Date).toISOString().slice(0, 10)}</span> },
              { key: "expenseType", label: t("col.expenseType", L), width: "100px", render: (v) => <Badge tone={v === "SALES" ? "accent" : v === "PURCHASE" ? "primary" : "neutral"}>{v === "SALES" ? t("expenseTypeShort.SALES", L) : v === "PURCHASE" ? t("expenseTypeShort.PURCHASE", L) : t("expenseTypeShort.GENERAL", L)}</Badge> },
              { key: "amount", label: t("field.amount", L), width: "150px", align: "right", render: (v) => <span className="font-mono text-[13px] font-bold">{new Intl.NumberFormat("vi-VN").format(Number(v))}</span> },
              { key: "_count", label: t("col.allocCount", L), width: "100px", align: "right", render: (_, r) => <span className="font-mono text-[11px]">{t("col.cases", L).replace("{count}", String(r._count.allocations))}</span> },
              { key: "note", label: t("col.note", L), render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span> },
            ]}
            data={rows}
            rowKey={(r) => r.id}
            emptyMessage={t("empty.expenses", L)}
          />
        </Card>
      </div>
    </main>
  );
}
