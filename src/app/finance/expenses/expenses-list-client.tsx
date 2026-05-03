"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type ExpenseRow = {
  id: string;
  expenseCode: string;
  incurredAt: string;
  expenseType: string;
  amount: string;
  note: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  _count: { allocations: number };
};

const STATUS_TONE: Record<string, "primary" | "warn" | "danger" | "success" | "neutral" | "accent"> = {
  PAID: "success",
  PENDING_PAYMENT: "warn",
  PENDING_REIMBURSE: "accent",
  REIMBURSED: "primary",
};

export function ExpensesListClient({ rows, lang, accountOptions }: { rows: ExpenseRow[]; lang: Lang; accountOptions: Array<{ value: string; label: string }> }) {
  const router = useRouter();
  const [filter, setFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approve(id: string) {
    if (accountOptions.length === 0) { alert("등록된 계좌가 없습니다."); return; }
    const accountId = window.prompt("환급 계좌 ID 입력 (또는 첫번째 사용)", accountOptions[0].value);
    if (!accountId) return;
    setBusyId(id);
    const r = await fetch(`/api/finance/expenses/${id}/reimburse`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bankAccountId: accountId }),
    });
    setBusyId(null);
    if (r.ok) router.refresh(); else alert("환급 승인 실패");
  }

  const filtered = filter === "ALL" ? rows : rows.filter((r) => r.paymentStatus === filter);

  const cols: DataTableColumn<ExpenseRow>[] = [
    { key: "expenseCode", label: t("col.expenseCode", lang), width: "150px",
      render: (v, r) => <Link href={`/finance/expenses/${r.id}`} className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)] hover:underline">{String(v)}</Link> },
    { key: "incurredAt", label: t("col.incurredAt", lang), width: "100px",
      render: (v) => <span className="font-mono text-[11px]">{String(v).slice(0, 10)}</span> },
    { key: "expenseType", label: t("col.expenseType", lang), width: "110px",
      render: (v) => <Badge tone={v === "SALES" ? "accent" : v === "PURCHASE" ? "primary" : "neutral"}>{String(v)}</Badge> },
    { key: "amount", label: t("field.amount", lang), width: "140px", align: "right",
      render: (v) => <span className="font-mono text-[13px] font-bold">{new Intl.NumberFormat("vi-VN").format(Number(v))}</span> },
    { key: "paymentMethod", label: t("expense.paymentMethod", lang), width: "130px",
      render: (v) => v ? <span className="text-[11px]">{t(`expense.payMethod.${String(v)}`, lang)}</span> : <span className="text-[color:var(--tts-muted)]">—</span> },
    { key: "paymentStatus", label: t("expense.paymentStatus", lang), width: "120px",
      render: (v) => <Badge tone={STATUS_TONE[String(v)] ?? "neutral"}>{t(`expense.payStatus.${String(v)}`, lang)}</Badge> },
    { key: "_count", label: t("col.allocCount", lang), width: "90px", align: "right",
      render: (_, r) => <span className="font-mono text-[11px]">{r._count.allocations}</span> },
    { key: "note", label: t("col.note", lang),
      render: (v, r) => (
        <div className="flex items-center gap-2">
          <span>{(v as string | null) ?? "—"}</span>
          {r.paymentStatus === "PENDING_REIMBURSE" && (
            <Button size="sm" variant="ghost" onClick={() => approve(r.id)} disabled={busyId === r.id}>
              {busyId === r.id ? "..." : t("expense.reimburse", lang)}
            </Button>
          )}
        </div>
      ) },
  ];
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
        <span className="text-[color:var(--tts-sub)]">{t("expense.paymentStatus", lang)}:</span>
        {(["ALL", "PAID", "PENDING_PAYMENT", "PENDING_REIMBURSE", "REIMBURSED"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded px-2 py-1 ${filter === s ? "bg-[color:var(--tts-primary)] text-white" : "border border-[color:var(--tts-border)]"}`}>
            {s === "ALL" ? "전체" : t(`expense.payStatus.${s}`, lang)}
          </button>
        ))}
        <span className="ml-auto text-[color:var(--tts-muted)]">{filtered.length} / {rows.length}</span>
      </div>
      <DataTable columns={cols} data={filtered} rowKey={(r) => r.id} emptyMessage={t("empty.expenses", lang)} />
    </div>
  );
}
