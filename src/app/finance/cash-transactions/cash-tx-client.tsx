"use client";
import { useMemo, useState } from "react";
import { Card, Button } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";
import Link from "next/link";

export type CashTxRow = {
  id: string; txnCode: string; txnDate: string;
  accountCode: string; accountName: string;
  txnType: string; category: string;
  amount: string | number; currency: string;
  description: string; status: string;
};

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100];

export function CashTxClient({ rows, lang }: { rows: CashTxRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pageSize, setPageSize] = useState(30);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<keyof CashTxRow>("txnDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (type !== "all" && r.txnType !== type) return false;
      if (status !== "all" && r.status !== status) return false;
      if (from && r.txnDate < from) return false;
      if (to && r.txnDate > to) return false;
      if (!ql) return true;
      return (
        r.txnCode.toLowerCase().includes(ql) ||
        r.accountCode.toLowerCase().includes(ql) ||
        r.accountName.toLowerCase().includes(ql) ||
        r.description.toLowerCase().includes(ql) ||
        r.category.toLowerCase().includes(ql)
      );
    });
    out = [...out].sort((a, b) => {
      const va = a[sortBy] as any; const vb = b[sortBy] as any;
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, q, type, status, from, to, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(k: keyof CashTxRow) {
    if (sortBy === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(k); setSortDir("asc"); }
  }
  const arrow = (k: keyof CashTxRow) => sortBy === k ? (sortDir === "asc" ? "▲" : "▼") : "▲▼";

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-[color:var(--tts-text)]">{t("nav.cashTransactions", lang)}</h1>
          <Link href="/finance/accounts">
            <Button variant="primary">+ {t("finance.newCashTxn", lang)}</Button>
          </Link>
        </div>
        <Card>
          {/* 필터 */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="🔎 코드/계좌/설명/카테고리"
              className="w-[260px] rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2" />
            <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}
              className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2">
              <option value="all">전체 거래유형</option>
              <option value="DEPOSIT">+ DEPOSIT (입금)</option>
              <option value="WITHDRAWAL">− WITHDRAWAL (출금)</option>
              <option value="TRANSFER">↔ TRANSFER (이체)</option>
            </select>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2">
              <option value="all">전체 상태</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="VOIDED">VOIDED</option>
            </select>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-2" title="시작일" />
            <span className="text-[color:var(--tts-muted)]">~</span>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-2" title="종료일" />
            <span className="ml-auto text-[color:var(--tts-sub)]">{filtered.length} 건</span>
          </div>

          <table className="w-full text-[12px]">
            <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
              <tr>
                <th className="py-2 text-left cursor-pointer hover:text-[color:var(--tts-text)]" onClick={() => toggleSort("txnCode")}>Code {arrow("txnCode")}</th>
                <th className="text-left cursor-pointer hover:text-[color:var(--tts-text)]" onClick={() => toggleSort("txnDate")}>{t("finance.txnDate", lang)} {arrow("txnDate")}</th>
                <th className="text-left cursor-pointer hover:text-[color:var(--tts-text)]" onClick={() => toggleSort("accountCode")}>{t("finance.account", lang)} {arrow("accountCode")}</th>
                <th className="text-left cursor-pointer hover:text-[color:var(--tts-text)]" onClick={() => toggleSort("txnType")}>{t("finance.txnType", lang)} {arrow("txnType")}</th>
                <th className="text-left">{t("finance.category", lang)}</th>
                <th className="text-right cursor-pointer hover:text-[color:var(--tts-text)]" onClick={() => toggleSort("amount")}>{t("finance.amount", lang)} {arrow("amount")}</th>
                <th className="text-left">{t("finance.description", lang)}</th>
                <th className="text-left cursor-pointer hover:text-[color:var(--tts-text)]" onClick={() => toggleSort("status")}>Status {arrow("status")}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((tx) => (
                <tr key={tx.id} className="border-b border-[color:var(--tts-border)]/50">
                  <td className="py-2 font-mono text-[11px]">{tx.txnCode}</td>
                  <td className="text-[11px]">{tx.txnDate.slice(0, 10)}</td>
                  <td className="font-mono text-[11px]">{tx.accountCode}</td>
                  <td>{tx.txnType}</td>
                  <td className="text-[11px]">{tx.category}</td>
                  <td className={`text-right font-mono font-bold ${tx.txnType === "DEPOSIT" ? "text-emerald-500" : tx.txnType === "WITHDRAWAL" ? "text-rose-500" : ""}`}>
                    {tx.txnType === "DEPOSIT" ? "+" : tx.txnType === "WITHDRAWAL" ? "−" : "↔"} {Number(tx.amount).toLocaleString()} {tx.currency}
                  </td>
                  <td className="text-[11px]">{tx.description}</td>
                  <td className="text-[11px]">{tx.status}</td>
                </tr>
              ))}
              {pageRows.length === 0 && (<tr><td colSpan={8} className="py-4 text-center text-[color:var(--tts-muted)]">no transactions</td></tr>)}
            </tbody>
          </table>

          {/* 페이징 */}
          <div className="mt-3 flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-2">
              <span className="text-[color:var(--tts-sub)]">{t("page.size", lang)}</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1">
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>← {t("page.prev", lang)}</Button>
              <span className="font-mono">{safePage} / {totalPages}</span>
              <Button variant="ghost" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>{t("page.next", lang)} →</Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
