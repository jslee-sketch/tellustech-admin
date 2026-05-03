"use client";
import { useEffect, useMemo, useState } from "react";
import { Button, ExcelDownload, Field, Row, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Row = {
  clientId: string;
  clientLabel: string;
  revenue: number;
  directCost: { transport: number; consumable: number; other: number; total: number };
  contributionMargin: number;
  indirectCostAlloc: number;
  netProfit: number;
  profitRate: number;
};

type SortKey = "clientLabel" | "revenue" | "directCostTotal" | "contributionMargin" | "indirectCostAlloc" | "netProfit" | "profitRate";

export function ProfitabilityClient({ lang }: { lang: Lang }) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  useEffect(() => {
    const u = new URL(window.location.href);
    const q = u.searchParams.get("period");
    if (q && /^\d{4}-\d{2}$/.test(q)) setPeriod(q);
  }, []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("netProfit");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [pageSize, setPageSize] = useState(30);
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/finance/profitability?period=${period}`, { cache: "no-store" });
    const j = await r.json();
    setRows((j.rows ?? j.data?.rows) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [period]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let out = rows.filter((r) => !ql || r.clientLabel.toLowerCase().includes(ql));
    out = [...out].sort((a, b) => {
      const get = (r: Row): number | string => sortBy === "clientLabel" ? r.clientLabel
        : sortBy === "directCostTotal" ? r.directCost.total
        : (r as any)[sortBy];
      const va = get(a); const vb = get(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, q, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(k: SortKey) {
    if (sortBy === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(k); setSortDir("desc"); }
  }
  const arrow = (k: SortKey) => sortBy === k ? (sortDir === "asc" ? "▲" : "▼") : "▲▼";

  const totals = filtered.reduce((acc, r) => ({
    revenue: acc.revenue + r.revenue,
    directCost: acc.directCost + r.directCost.total,
    netProfit: acc.netProfit + r.netProfit,
  }), { revenue: 0, directCost: 0, netProfit: 0 });

  return (
    <div>
      <Row>
        <Field label={t("fs.cumulative", lang)} width="220px"><TextInput value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="YYYY-MM" /></Field>
        <Field label=" " width="100px"><Button onClick={load} disabled={loading}>{loading ? "..." : "조회"}</Button></Field>
        <Field label=" ">
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="🔎 거래처 검색"
            className="w-[220px] rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px]" />
        </Field>
        <Field label=" ">
          <ExcelDownload
            rows={filtered.map((r) => ({
              client: r.clientLabel, revenue: Math.round(r.revenue),
              transport: Math.round(r.directCost.transport), parts: Math.round(r.directCost.consumable), other: Math.round(r.directCost.other),
              directCost: Math.round(r.directCost.total), contributionMargin: Math.round(r.contributionMargin),
              indirectCost: Math.round(r.indirectCostAlloc), netProfit: Math.round(r.netProfit), profitRate: r.profitRate.toFixed(1) + "%",
            }))}
            columns={[
              { key: "client", header: "Client" },
              { key: "revenue", header: t("finance.revenue", lang) },
              { key: "transport", header: t("finance.transportCost", lang) },
              { key: "parts", header: t("finance.partsCost", lang) },
              { key: "other", header: "기타비" },
              { key: "directCost", header: t("finance.directCost", lang) },
              { key: "contributionMargin", header: t("finance.contributionMargin", lang) },
              { key: "indirectCost", header: t("finance.indirectCost", lang) },
              { key: "netProfit", header: t("finance.netProfit", lang) },
              { key: "profitRate", header: t("finance.profitRate", lang) },
            ]}
            filename={`profitability-${period}.xlsx`}
          />
        </Field>
      </Row>

      {filtered.length > 0 && (
        <div className="my-3 grid grid-cols-3 gap-3">
          <div className="rounded-md border border-[color:var(--tts-border)] p-3"><div className="text-[11px] text-[color:var(--tts-sub)]">{t("finance.revenue", lang)}</div><div className="font-mono text-[15px] font-bold">{Math.round(totals.revenue).toLocaleString()}</div></div>
          <div className="rounded-md border border-[color:var(--tts-border)] p-3"><div className="text-[11px] text-[color:var(--tts-sub)]">{t("finance.directCost", lang)}</div><div className="font-mono text-[15px] font-bold text-rose-500">{Math.round(totals.directCost).toLocaleString()}</div></div>
          <div className="rounded-md border border-[color:var(--tts-border)] p-3"><div className="text-[11px] text-[color:var(--tts-sub)]">{t("finance.netProfit", lang)}</div><div className={`font-mono text-[15px] font-bold ${totals.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{Math.round(totals.netProfit).toLocaleString()}</div></div>
        </div>
      )}

      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
          <tr>
            <th className="py-2 text-left cursor-pointer hover:text-[color:var(--tts-text)]" onClick={() => toggleSort("clientLabel")}>Client {arrow("clientLabel")}</th>
            <th className="text-right cursor-pointer hover:text-[color:var(--tts-text)]" onClick={() => toggleSort("revenue")}>{t("finance.revenue", lang)} {arrow("revenue")}</th>
            <th className="text-right">{t("finance.transportCost", lang)}</th>
            <th className="text-right">{t("finance.partsCost", lang)}</th>
            <th className="text-right">기타비</th>
            <th className="text-right cursor-pointer hover:text-[color:var(--tts-text)]" onClick={() => toggleSort("directCostTotal")}>{t("finance.directCost", lang)} {arrow("directCostTotal")}</th>
            <th className="text-right cursor-pointer hover:text-[color:var(--tts-text)]" onClick={() => toggleSort("contributionMargin")}>{t("finance.contributionMargin", lang)} {arrow("contributionMargin")}</th>
            <th className="text-right cursor-pointer hover:text-[color:var(--tts-text)]" onClick={() => toggleSort("netProfit")}>{t("finance.netProfit", lang)} {arrow("netProfit")}</th>
            <th className="text-right cursor-pointer hover:text-[color:var(--tts-text)]" onClick={() => toggleSort("profitRate")}>{t("finance.profitRate", lang)} {arrow("profitRate")}</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((r) => (
            <tr key={r.clientId} className="border-b border-[color:var(--tts-border)]/50">
              <td className="py-2">{r.clientLabel}</td>
              <td className="text-right font-mono">{Math.round(r.revenue).toLocaleString()}</td>
              <td className="text-right font-mono text-[11px]">{Math.round(r.directCost.transport).toLocaleString()}</td>
              <td className="text-right font-mono text-[11px]">{Math.round(r.directCost.consumable).toLocaleString()}</td>
              <td className="text-right font-mono text-[11px]">{Math.round(r.directCost.other).toLocaleString()}</td>
              <td className="text-right font-mono text-rose-500">{Math.round(r.directCost.total).toLocaleString()}</td>
              <td className="text-right font-mono">{Math.round(r.contributionMargin).toLocaleString()}</td>
              <td className={`text-right font-mono font-bold ${r.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{Math.round(r.netProfit).toLocaleString()}</td>
              <td className={`text-right font-mono ${r.profitRate >= 0 ? "" : "text-rose-500"}`}>{r.profitRate.toFixed(1)}%</td>
            </tr>
          ))}
          {pageRows.length === 0 && !loading && <tr><td colSpan={9} className="py-4 text-center text-[color:var(--tts-muted)]">no data</td></tr>}
        </tbody>
      </table>

      <div className="mt-3 flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-2">
          <span className="text-[color:var(--tts-sub)]">{t("page.size", lang)}</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1">
            {[10,30,50,100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>← {t("page.prev", lang)}</Button>
          <span className="font-mono">{safePage} / {totalPages} ({filtered.length} 건)</span>
          <Button variant="ghost" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>{t("page.next", lang)} →</Button>
        </div>
      </div>
    </div>
  );
}
