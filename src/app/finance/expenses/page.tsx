import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Button, Card, ExcelDownload } from "@/components/ui";
import { ExpensesListClient } from "./expenses-list-client";

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
          <ExpensesListClient rows={rows.map(r => ({
            id: r.id, expenseCode: r.expenseCode,
            incurredAt: r.incurredAt.toISOString(),
            expenseType: r.expenseType,
            amount: r.amount.toString(),
            note: r.note,
            _count: { allocations: r._count.allocations },
          }))} lang={L} />
        </Card>
      </div>
    </main>
  );
}
