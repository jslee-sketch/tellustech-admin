"use client";
import { useEffect, useState } from "react";
import { Button, ExcelDownload, Field, Row, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type CFLine = { source: string; inflow: number; outflow: number; net: number };
type CF = {
  period: string;
  operating: CFLine[]; investing: CFLine[]; financing: CFLine[];
  netCashFlow: number; openingCash: number; closingCash: number;
};

export function CashFlowClient({ lang }: { lang: Lang }) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<CF | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/finance/cash-flow?period=${period}`);
    const j = await r.json();
    setData(j.data?.result ?? null);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div>
      <Row>
        <Field label={t("finance.period", lang)} width="180px">
          <TextInput value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="YYYY-MM" />
        </Field>
        <Field label=" " width="100px">
          <Button onClick={load} disabled={loading}>{loading ? "..." : t("common.search", lang)}</Button>
        </Field>
        {data && (
          <Field label=" ">
            <ExcelDownload
              rows={[
                { section: t("fs.openingCash", lang), source: "", inflow: "", outflow: "", net: Math.round(data.openingCash) },
                ...data.operating.map((r) => ({ section: t("fs.operating", lang), source: t(`journal.source.${r.source}`, lang), inflow: Math.round(r.inflow), outflow: Math.round(r.outflow), net: Math.round(r.net) })),
                { section: t("fs.netCashFlow", lang), source: "", inflow: "", outflow: "", net: Math.round(data.netCashFlow) },
                { section: t("fs.closingCash", lang), source: "", inflow: "", outflow: "", net: Math.round(data.closingCash) },
              ]}
              columns={[
                { key: "section", header: t("fs.section", lang) },
                { key: "source", header: t("journal.source", lang) },
                { key: "inflow", header: t("fs.inflow", lang) },
                { key: "outflow", header: t("fs.outflow", lang) },
                { key: "net", header: t("fs.net", lang) },
              ]}
              filename={`cash-flow-${period}.xlsx`}
            />
          </Field>
        )}
      </Row>

      {data && (
        <div className="mt-4">
          <div className="mb-3 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-[color:var(--tts-border)] p-3">
              <div className="text-[11px] text-[color:var(--tts-sub)]">{t("fs.openingCash", lang)}</div>
              <div className="font-mono text-[15px] font-bold">{Math.round(data.openingCash).toLocaleString()}</div>
            </div>
            <div className="rounded-md border border-[color:var(--tts-border)] p-3">
              <div className="text-[11px] text-[color:var(--tts-sub)]">{t("fs.netCashFlow", lang)}</div>
              <div className={`font-mono text-[15px] font-bold ${data.netCashFlow >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{Math.round(data.netCashFlow).toLocaleString()}</div>
            </div>
            <div className="rounded-md border border-[color:var(--tts-border)] p-3">
              <div className="text-[11px] text-[color:var(--tts-sub)]">{t("fs.closingCash", lang)}</div>
              <div className="font-mono text-[15px] font-bold text-blue-500">{Math.round(data.closingCash).toLocaleString()}</div>
            </div>
          </div>

          <table className="w-full text-[13px]">
            <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
              <tr>
                <th className="py-2 text-left">{t("journal.source", lang)}</th>
                <th className="text-right">{t("fs.inflow", lang)}</th>
                <th className="text-right">{t("fs.outflow", lang)}</th>
                <th className="text-right">{t("fs.net", lang)}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[color:var(--tts-bg)]/40 font-bold">
                <td colSpan={4} className="py-2 text-emerald-500">{t("fs.operating", lang)}</td>
              </tr>
              {data.operating.map((r) => (
                <tr key={r.source} className="border-b border-[color:var(--tts-border)]/30">
                  <td className="py-1.5 pl-4">{t(`journal.source.${r.source}`, lang)}</td>
                  <td className="text-right font-mono">{Math.round(r.inflow).toLocaleString()}</td>
                  <td className="text-right font-mono text-rose-500">{r.outflow ? `(${Math.round(r.outflow).toLocaleString()})` : "—"}</td>
                  <td className={`text-right font-mono ${r.net >= 0 ? "" : "text-rose-500"}`}>{Math.round(r.net).toLocaleString()}</td>
                </tr>
              ))}
              {data.operating.length === 0 && (
                <tr><td colSpan={4} className="py-3 text-center text-[color:var(--tts-muted)]">{t("common.noData", lang)}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
