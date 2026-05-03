"use client";
import { useEffect, useState } from "react";
import { Button, ExcelDownload, Field, Row, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Line = { code: string; name: string; amount: number };
type IS = {
  period: string;
  revenue: Line[]; totalRevenue: number;
  expense: Line[]; totalExpense: number;
  netIncome: number;
};

export function IncomeStatementClient({ lang }: { lang: Lang }) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  useEffect(() => {
    const u = new URL(window.location.href);
    const q = u.searchParams.get("period");
    if (q && /^\d{4}-\d{2}$/.test(q)) setPeriod(q);
  }, []);
  const [data, setData] = useState<IS | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/finance/income-statement?period=${period}&lang=${lang}`, { cache: "no-store" });
    const j = await r.json();
    setData(j.result ?? j.data?.result ?? null);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [period, lang]);

  return (
    <div>
      <Row>
        <Field label={t("fs.cumulative", lang)} width="220px">
          <TextInput value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="YYYY-MM" />
        </Field>
        <Field label=" " width="100px">
          <Button onClick={load} disabled={loading}>{loading ? "..." : t("common.search", lang)}</Button>
        </Field>
        <Field label=" ">
          <Button variant="ghost" onClick={() => window.print()}>🖨 {t("fs.print", lang)}</Button>
        </Field>
        {data && (
          <Field label=" ">
            <ExcelDownload
              rows={[
                ...data.revenue.map((r) => ({ section: t("coa.type.REVENUE", lang), code: r.code, name: r.name, amount: Math.round(r.amount) })),
                { section: t("fs.subtotalRevenue", lang), code: "", name: "", amount: Math.round(data.totalRevenue) },
                ...data.expense.map((r) => ({ section: t("coa.type.EXPENSE", lang), code: r.code, name: r.name, amount: Math.round(r.amount) })),
                { section: t("fs.subtotalExpense", lang), code: "", name: "", amount: Math.round(data.totalExpense) },
                { section: t("fs.netIncome", lang), code: "", name: "", amount: Math.round(data.netIncome) },
              ]}
              columns={[
                { key: "section", header: t("fs.section", lang) },
                { key: "code", header: t("coa.code", lang) },
                { key: "name", header: t("coa.name", lang) },
                { key: "amount", header: t("fs.amount", lang) },
              ]}
              filename={`income-statement-${period}.xlsx`}
            />
          </Field>
        )}
      </Row>

      {data && (
        <div className="mt-4 print:mt-0">
          <div className="mb-3 text-center print:mb-6">
            <div className="text-[18px] font-extrabold">{t("nav.incomeStatement", lang)}</div>
            <div className="text-[12px] text-[color:var(--tts-sub)]">{t("finance.period", lang)}: {period}</div>
          </div>

          <table className="w-full text-[13px]">
            <tbody>
              <tr className="bg-[color:var(--tts-bg)]/40 font-bold">
                <td colSpan={3} className="border-y border-[color:var(--tts-border)] py-2 text-emerald-500">{t("coa.type.REVENUE", lang)}</td>
              </tr>
              {data.revenue.map((r) => (
                <tr key={`r-${r.code}`} className="border-b border-[color:var(--tts-border)]/30">
                  <td className="py-1.5 pl-4 font-mono text-[11px]">{r.code}</td>
                  <td>{r.name}</td>
                  <td className="text-right font-mono">{Math.round(r.amount).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t border-[color:var(--tts-border)] font-bold">
                <td colSpan={2} className="py-2 pl-4">{t("fs.subtotalRevenue", lang)}</td>
                <td className="text-right font-mono text-emerald-500">{Math.round(data.totalRevenue).toLocaleString()}</td>
              </tr>

              <tr className="bg-[color:var(--tts-bg)]/40 font-bold">
                <td colSpan={3} className="border-y border-[color:var(--tts-border)] py-2 pt-4 text-rose-500">{t("coa.type.EXPENSE", lang)}</td>
              </tr>
              {data.expense.map((r) => (
                <tr key={`e-${r.code}`} className="border-b border-[color:var(--tts-border)]/30">
                  <td className="py-1.5 pl-4 font-mono text-[11px]">{r.code}</td>
                  <td>{r.name}</td>
                  <td className="text-right font-mono">{Math.round(r.amount).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t border-[color:var(--tts-border)] font-bold">
                <td colSpan={2} className="py-2 pl-4">{t("fs.subtotalExpense", lang)}</td>
                <td className="text-right font-mono text-rose-500">({Math.round(data.totalExpense).toLocaleString()})</td>
              </tr>

              <tr className="border-t-2 border-[color:var(--tts-border)] text-[15px] font-extrabold">
                <td colSpan={2} className="py-3 pl-4">{t("fs.netIncome", lang)}</td>
                <td className={`text-right font-mono ${data.netIncome >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{Math.round(data.netIncome).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <style jsx global>{`
        @media print {
          @page { margin: 12mm; }
          aside, header, button, nav, .no-print { display: none !important; }
          html, body { background: #fff !important; }
          body *, main *, table * { color: #000 !important; background: transparent !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { border-collapse: collapse !important; width: 100% !important; }
          table td, table th { color: #000 !important; font-family: ui-monospace, "Roboto Mono", "Consolas", monospace !important; }
          .text-emerald-500, .text-rose-500, .text-blue-500, .text-amber-500, .text-purple-500 { color: #000 !important; }
        }
      `}</style>
    </div>
  );
}
