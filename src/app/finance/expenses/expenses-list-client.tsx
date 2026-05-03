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
  // 환급 승인 모달 상태
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [approveAccount, setApproveAccount] = useState<string>(accountOptions[0]?.value ?? "");

  function openApprove(id: string) {
    if (accountOptions.length === 0) { alert(t("expense.reimburseNoAccount", lang)); return; }
    setApproveAccount(accountOptions[0].value);
    setApproveTarget(id);
  }

  async function confirmApprove() {
    if (!approveTarget || !approveAccount) return;
    setBusyId(approveTarget);
    const r = await fetch(`/api/finance/expenses/${approveTarget}/reimburse`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bankAccountId: approveAccount }),
    });
    setBusyId(null);
    setApproveTarget(null);
    if (r.ok) router.refresh(); else alert(t("expense.reimburseFailed", lang));
  }

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState(30);
  const [page, setPage] = useState(1);

  const baseFiltered = (() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "ALL" && r.paymentStatus !== filter) return false;
      if (typeFilter !== "all" && r.expenseType !== typeFilter) return false;
      if (dateFrom && r.incurredAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && r.incurredAt.slice(0, 10) > dateTo) return false;
      if (!ql) return true;
      return r.expenseCode.toLowerCase().includes(ql) || (r.note ?? "").toLowerCase().includes(ql) || r.expenseType.toLowerCase().includes(ql);
    });
  })();
  const totalPages = Math.max(1, Math.ceil(baseFiltered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const filtered = baseFiltered.slice((safePage - 1) * pageSize, safePage * pageSize);

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
            <Button size="sm" variant="ghost" onClick={() => openApprove(r.id)} disabled={busyId === r.id}>
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
          <button key={s} onClick={() => { setFilter(s); setPage(1); }} className={`rounded px-2 py-1 ${filter === s ? "bg-[color:var(--tts-primary)] text-white" : "border border-[color:var(--tts-border)]"}`}>
            {s === "ALL" ? "전체" : t(`expense.payStatus.${s}`, lang)}
          </button>
        ))}
        <span className="ml-auto text-[color:var(--tts-muted)]">{baseFiltered.length} 건</span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="🔎 코드/메모/타입"
          className="w-[220px] rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2" />
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-2">
          <option value="all">전체 타입</option>
          {["TRANSPORT","MEAL","ENTERTAINMENT","RENT","UTILITY","GENERAL","SALES","PURCHASE","OTHER"].map((tp) => <option key={tp} value={tp}>{tp}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-2" title="시작일" />
        <span className="text-[color:var(--tts-muted)]">~</span>
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-2" title="종료일" />
      </div>
      <DataTable columns={cols} data={filtered} rowKey={(r) => r.id} emptyMessage={t("empty.expenses", lang)} />
      <div className="mt-3 flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-2">
          <span className="text-[color:var(--tts-sub)]">{t("page.size", lang)}</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1">
            {[10,30,50,100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>← {t("page.prev", lang)}</Button>
          <span className="font-mono">{safePage} / {totalPages}</span>
          <Button variant="ghost" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>{t("page.next", lang)} →</Button>
        </div>
      </div>

      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setApproveTarget(null)}>
          <div className="w-[420px] rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-[14px] font-bold">{t("expense.reimburseModalTitle", lang)}</h3>
            <div className="text-[12px] text-[color:var(--tts-sub)] mb-2">{t("expense.reimburseAccount", lang)}</div>
            <select
              value={approveAccount}
              onChange={(e) => setApproveAccount(e.target.value)}
              className="w-full rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px]"
            >
              {accountOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setApproveTarget(null)}>{t("common.cancel", lang)}</Button>
              <Button variant="primary" onClick={confirmApprove} disabled={!approveAccount || busyId === approveTarget}>
                {busyId === approveTarget ? "..." : t("expense.reimburseConfirm", lang)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
