"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, DataTable, ClientCombobox } from "@/components/ui";
import type { DataTableColumn, SortDir } from "@/components/ui/table";
import { t, type Lang } from "@/lib/i18n";

export type PayableRow = {
  id: string;
  kind: "RECEIVABLE" | "PAYABLE";
  status: string;
  clientId: string | null;
  clientLabel: string;
  clientBlocked: boolean;
  ref: string;
  amount: string;
  paidAmount: string;
  outstanding: string;
  dueDate: string | null;          // 예정일 — 최초 발행 시 셋팅, 불변
  revisedDueDate: string | null;   // 변경일 — 상세에서 수정. null 이면 dueDate 와 동일하게 표시
  createdAt: string;
};

type Filters = {
  kind: "ALL" | "RECEIVABLE" | "PAYABLE";
  status: "ALL" | "OPEN" | "PARTIAL" | "PAID" | "OVERDUE";
  code: string;
  clientId: string;
  createdFrom: string;
  createdTo: string;
  dueFrom: string;
  dueTo: string;
};

const EMPTY_FILTERS: Filters = {
  kind: "ALL",
  status: "ALL",
  code: "",
  clientId: "",
  createdFrom: "",
  createdTo: "",
  dueFrom: "",
  dueTo: "",
};

function daysBetween(targetIso: string | null): number | null {
  if (!targetIso) return null;
  const target = new Date(targetIso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // 양수 = 연체일수 (오늘 - 변경일), 음수 = 남은일수
  return Math.round((today.getTime() - target.getTime()) / 86400000);
}

function effectiveDueDate(row: PayableRow): string | null {
  // 잔여일 / 변경일 표시 기준 — 변경일(revisedDueDate) 우선, 없으면 예정일(dueDate)
  return row.revisedDueDate ?? row.dueDate;
}

export function PayablesListClient({ initialRows, lang }: { initialRows: PayableRow[]; lang: Lang }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [rows, setRows] = useState<PayableRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<string>("daysRemaining");
  const [sortDir, setSortDir] = useState<SortDir>("desc"); // 기본: 잔여일 내림차순 (연체일수가 큰 것이 위)

  async function refetch(next: Filters) {
    const qs = new URLSearchParams();
    if (next.kind !== "ALL") qs.set("kind", next.kind);
    if (next.status !== "ALL") qs.set("status", next.status);
    if (next.code.trim()) qs.set("code", next.code.trim());
    if (next.clientId) qs.set("clientId", next.clientId);
    if (next.createdFrom) qs.set("createdFrom", next.createdFrom);
    if (next.createdTo) qs.set("createdTo", next.createdTo);
    if (next.dueFrom) qs.set("dueFrom", next.dueFrom);
    if (next.dueTo) qs.set("dueTo", next.dueTo);
    setLoading(true);
    try {
      const r = await fetch(`/api/finance/payables?${qs.toString()}`, { credentials: "same-origin" });
      const j = await r.json();
      if (Array.isArray(j?.rows)) setRows(j.rows);
    } finally {
      setLoading(false);
    }
  }

  function onSearch() {
    refetch(filters);
  }
  function onReset() {
    setFilters(EMPTY_FILTERS);
    refetch(EMPTY_FILTERS);
  }

  // 정렬된 행 (클라이언트측). 금액/잔액/예정일/잔여일.
  const sortedRows = useMemo(() => {
    const arr = [...rows];
    const dirMul = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let av: number;
      let bv: number;
      if (sortBy === "amount") {
        av = Number(a.amount); bv = Number(b.amount);
      } else if (sortBy === "outstanding") {
        av = Number(a.outstanding); bv = Number(b.outstanding);
      } else if (sortBy === "dueDate") {
        av = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        bv = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      } else if (sortBy === "revisedDueDate") {
        const ax = effectiveDueDate(a);
        const bx = effectiveDueDate(b);
        av = ax ? new Date(ax).getTime() : Number.MAX_SAFE_INTEGER;
        bv = bx ? new Date(bx).getTime() : Number.MAX_SAFE_INTEGER;
      } else if (sortBy === "daysRemaining") {
        // PAID 면 정렬 끝으로 보냄. 잔여일 = 변경일(없으면 예정일) 기준.
        const ax = a.status === "PAID" ? null : daysBetween(effectiveDueDate(a));
        const bx = b.status === "PAID" ? null : daysBetween(effectiveDueDate(b));
        av = ax === null ? Number.NEGATIVE_INFINITY : ax;
        bv = bx === null ? Number.NEGATIVE_INFINITY : bx;
      } else {
        return 0;
      }
      if (av < bv) return -1 * dirMul;
      if (av > bv) return 1 * dirMul;
      return 0;
    });
    return arr;
  }, [rows, sortBy, sortDir]);

  const cols: DataTableColumn<PayableRow>[] = [
    { key: "kind", label: t("col.kind", lang), width: "100px",
      render: (v, r) => <Link href={`/finance/payables/${r.id}`} className="hover:underline">
        <Badge tone={v === "RECEIVABLE" ? "success" : "warn"}>{v === "RECEIVABLE" ? t("kind.AR", lang) : t("kind.AP", lang)}</Badge>
      </Link> },
    { key: "status", label: t("col.statusShort", lang), width: "110px",
      render: (v) => <Badge tone={v === "PAID" ? "success" : v === "PARTIAL" ? "accent" : v === "WRITTEN_OFF" ? "neutral" : "warn"}>{String(v)}</Badge> },
    { key: "ref", label: t("col.refReceipt", lang), width: "160px",
      render: (v, r) => <Link href={`/finance/payables/${r.id}`} className="font-mono text-[11px] text-[color:var(--tts-accent)] hover:underline">{String(v)}</Link> },
    { key: "clientLabel", label: t("col.client", lang), width: "240px",
      render: (_, r) => (
        <span className="block max-w-[230px] truncate" title={r.clientLabel}>
          {r.clientLabel}
          {r.clientBlocked && <span className="ml-2"><Badge tone="danger">{t("label.AR_blocked", lang)}</Badge></span>}
        </span>
      ) },
    { key: "amount", label: t("field.amount", lang), width: "115px", align: "right", sortable: true,
      render: (v) => <span className="font-mono text-[12px]">{new Intl.NumberFormat("vi-VN").format(Number(v))}</span> },
    { key: "paidAmount", label: t("col.paidVnd", lang), width: "115px", align: "right",
      render: (v) => <span className="font-mono text-[12px] text-[color:var(--tts-success)]">{new Intl.NumberFormat("vi-VN").format(Number(v))}</span> },
    { key: "outstanding", label: t("field.outstanding", lang), width: "115px", align: "right", sortable: true,
      render: (v) => {
        const n = Number(v);
        return <span className={`font-mono text-[13px] font-bold ${n > 0 ? "text-[color:var(--tts-danger)]" : ""}`}>{new Intl.NumberFormat("vi-VN").format(n)}</span>;
      } },
    { key: "dueDate", label: t("col.dueDateShort", lang), width: "110px", sortable: true,
      render: (v) => <span>{typeof v === "string" ? v : "—"}</span> },
    { key: "revisedDueDate", label: t("col.revisedDueDate", lang), width: "110px", sortable: true,
      render: (_, r) => {
        // 변경일 — 상세 업데이트가 없으면 예정일과 같은 값으로 표시
        const v = effectiveDueDate(r);
        return <span>{v ?? "—"}</span>;
      } },
    { key: "daysRemaining", label: t("col.daysRemaining", lang), width: "100px", align: "right", sortable: true,
      render: (_, r) => {
        if (r.status === "PAID") return <span className="text-[color:var(--tts-muted)]">—</span>;
        // 잔여일 = 변경일(없으면 예정일) 기준
        const d = daysBetween(effectiveDueDate(r));
        if (d === null) return <span className="text-[color:var(--tts-muted)]">—</span>;
        // d > 0: 연체 (빨강), d == 0: 오늘 (노랑), d < 0: 남음 (초록)
        const color = d > 0 ? "var(--tts-danger)" : d === 0 ? "var(--tts-warn)" : "var(--tts-success)";
        const display = d > 0 ? `+${d}` : `${d}`;
        return <span className="font-mono text-[12px] font-bold" style={{ color }}>{display}</span>;
      } },
  ];

  return (
    <div className="space-y-3">
      {/* 필터 바 */}
      <div className="rounded-lg border border-[color:var(--tts-border)] bg-[color:var(--tts-card)]/50 p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[color:var(--tts-muted)]">{t("col.kind", lang)}</label>
            <select
              value={filters.kind}
              onChange={(e) => setFilters({ ...filters, kind: e.target.value as Filters["kind"] })}
              className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]"
            >
              <option value="ALL">{t("filter.kind.all", lang)}</option>
              <option value="RECEIVABLE">{t("kind.AR", lang)}</option>
              <option value="PAYABLE">{t("kind.AP", lang)}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[color:var(--tts-muted)]">{t("col.statusShort", lang)}</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as Filters["status"] })}
              className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]"
            >
              <option value="ALL">{t("filter.status.all", lang)}</option>
              <option value="OPEN">{t("status.OPEN", lang)}</option>
              <option value="PARTIAL">{t("status.PARTIAL", lang)}</option>
              <option value="PAID">{t("status.PAID", lang)}</option>
              <option value="OVERDUE">{t("status.OVERDUE", lang)}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[color:var(--tts-muted)]">{t("col.refReceipt", lang)}</label>
            <input
              type="text"
              value={filters.code}
              onChange={(e) => setFilters({ ...filters, code: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }}
              placeholder={t("filter.code.placeholder", lang)}
              className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[color:var(--tts-muted)]">{t("filter.client", lang)}</label>
            <ClientCombobox
              value={filters.clientId}
              onChange={(id) => setFilters({ ...filters, clientId: id })}
              lang={lang}
              limit={20}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[color:var(--tts-muted)]">{t("filter.createdRange", lang)}</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.createdFrom}
                onChange={(e) => setFilters({ ...filters, createdFrom: e.target.value })}
                className="flex-1 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]"
              />
              <span className="text-[color:var(--tts-muted)]">~</span>
              <input
                type="date"
                value={filters.createdTo}
                onChange={(e) => setFilters({ ...filters, createdTo: e.target.value })}
                className="flex-1 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]"
              />
            </div>
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[color:var(--tts-muted)]">{t("filter.dueRange", lang)}</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dueFrom}
                onChange={(e) => setFilters({ ...filters, dueFrom: e.target.value })}
                className="flex-1 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]"
              />
              <span className="text-[color:var(--tts-muted)]">~</span>
              <input
                type="date"
                value={filters.dueTo}
                onChange={(e) => setFilters({ ...filters, dueTo: e.target.value })}
                className="flex-1 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="rounded border border-[color:var(--tts-border)] px-3 py-1.5 text-[12px] hover:bg-[color:var(--tts-card-hover)] disabled:opacity-50"
          >
            {t("filter.reset", lang)}
          </button>
          <button
            type="button"
            onClick={onSearch}
            disabled={loading}
            className="rounded bg-[color:var(--tts-accent)] px-4 py-1.5 text-[12px] font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : t("filter.search", lang)}
          </button>
        </div>
      </div>

      <DataTable
        columns={cols}
        data={sortedRows}
        rowKey={(r) => r.id}
        emptyMessage={t("empty.payables", lang)}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={(k, d) => { setSortBy(k); setSortDir(d); }}
      />
    </div>
  );
}
