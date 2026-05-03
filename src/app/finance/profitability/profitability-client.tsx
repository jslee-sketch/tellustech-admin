"use client";
import { useEffect, useState } from "react";
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

export function ProfitabilityClient({ lang }: { lang: Lang }) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/finance/profitability?period=${period}`);
    const j = await r.json();
    setRows(j.data?.rows ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const totals = rows.reduce((acc, r) => ({
    revenue: acc.revenue + r.revenue,
    directCost: acc.directCost + r.directCost.total,
    netProfit: acc.netProfit + r.netProfit,
  }), { revenue: 0, directCost: 0, netProfit: 0 });

  return (
    <div>
      <Row>
        <Field label={t("finance.period", lang)} width="180px"><TextInput value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="YYYY-MM" /></Field>
        <Field label=" " width="100px"><Button onClick={load} disabled={loading}>{loading ? "..." : "조회"}</Button></Field>
        <Field label=" ">
          <ExcelDownload
            rows={rows.map((r) => ({
              client: r.clientLabel,
              revenue: Math.round(r.revenue),
              transport: Math.round(r.directCost.transport),
              parts: Math.round(r.directCost.consumable),
              other: Math.round(r.directCost.other),
              directCost: Math.round(r.directCost.total),
              contributionMargin: Math.round(r.contributionMargin),
              indirectCost: Math.round(r.indirectCostAlloc),
              netProfit: Math.round(r.netProfit),
              profitRate: r.profitRate.toFixed(1) + "%",
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

      {rows.length > 0 && (
        <div className="my-3 grid grid-cols-3 gap-3">
          <div className="rounded-md border border-[color:var(--tts-border)] p-3"><div className="text-[11px] text-[color:var(--tts-sub)]">{t("finance.revenue", lang)}</div><div className="font-mono text-[15px] font-bold">{Math.round(totals.revenue).toLocaleString()}</div></div>
          <div className="rounded-md border border-[color:var(--tts-border)] p-3"><div className="text-[11px] text-[color:var(--tts-sub)]">{t("finance.directCost", lang)}</div><div className="font-mono text-[15px] font-bold text-rose-500">{Math.round(totals.directCost).toLocaleString()}</div></div>
          <div className="rounded-md border border-[color:var(--tts-border)] p-3"><div className="text-[11px] text-[color:var(--tts-sub)]">{t("finance.netProfit", lang)}</div><div className="font-mono text-[15px] font-bold text-emerald-500">{Math.round(totals.netProfit).toLocaleString()}</div></div>
        </div>
      )}

      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
          <tr>
            <th className="py-2 text-left">Client</th>
            <th className="text-right">{t("finance.revenue", lang)}</th>
            <th className="text-right">{t("finance.transportCost", lang)}</th>
            <th className="text-right">{t("finance.partsCost", lang)}</th>
            <th className="text-right">기타비</th>
            <th className="text-right">{t("finance.directCost", lang)}</th>
            <th className="text-right">{t("finance.contributionMargin", lang)}</th>
            <th className="text-right">{t("finance.netProfit", lang)}</th>
            <th className="text-right">{t("finance.profitRate", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
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
          {rows.length === 0 && !loading && <tr><td colSpan={9} className="py-4 text-center text-[color:var(--tts-muted)]">no data</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
