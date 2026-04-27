"use client";

import Link from "next/link";
import { Badge, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type ExpenseRow = {
  id: string;
  expenseCode: string;
  incurredAt: string; // ISO
  expenseType: string;
  amount: string;
  note: string | null;
  _count: { allocations: number };
};

export function ExpensesListClient({ rows, lang }: { rows: ExpenseRow[]; lang: Lang }) {
  const cols: DataTableColumn<ExpenseRow>[] = [
    { key: "expenseCode", label: t("col.expenseCode", lang), width: "170px",
      render: (v, r) => <Link href={`/finance/expenses/${r.id}`} className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)] hover:underline">{String(v)}</Link> },
    { key: "incurredAt", label: t("col.incurredAt", lang), width: "110px",
      render: (v) => <span className="font-mono text-[11px]">{String(v).slice(0, 10)}</span> },
    { key: "expenseType", label: t("col.expenseType", lang), width: "120px",
      render: (v) => <Badge tone={v === "SALES" ? "accent" : v === "PURCHASE" ? "primary" : "neutral"}>{String(v)}</Badge> },
    { key: "amount", label: t("field.amount", lang), width: "150px", align: "right",
      render: (v) => <span className="font-mono text-[13px] font-bold">{new Intl.NumberFormat("vi-VN").format(Number(v))}</span> },
    { key: "_count", label: t("col.allocCount", lang), width: "100px", align: "right",
      render: (_, r) => <span className="font-mono text-[11px]">{t("col.cases", lang).replace("{count}", String(r._count.allocations))}</span> },
    { key: "note", label: t("col.note", lang),
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span> },
  ];
  return <DataTable columns={cols} data={rows} rowKey={(r) => r.id} emptyMessage={t("empty.expenses", lang)} />;
}
