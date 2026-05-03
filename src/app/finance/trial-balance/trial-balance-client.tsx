"use client";
import { useEffect, useState } from "react";
import { Button, ExcelDownload, Field, Row, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Row = {
  code: string;
  nameVi: string; nameEn: string; nameKo: string;
  type: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
};

const TYPE_TONES: Record<string, string> = {
  ASSET: "text-blue-500",
  LIABILITY: "text-amber-500",
  EQUITY: "text-purple-500",
  REVENUE: "text-emerald-500",
  EXPENSE: "text-rose-500",
};

export function TrialBalanceClient({ lang }: { lang: Lang }) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  useEffect(() => {
    const u = new URL(window.location.href);
    const q = u.searchParams.get("period");
    if (q && /^\d{4}-\d{2}$/.test(q)) setPeriod(q);
  }, []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/finance/trial-balance?period=${period}`, { cache: "no-store" });
    const j = await r.json();
    setRows(j.rows ?? j.data?.rows ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [period]);

  const localizedName = (r: Row) => lang === "VI" ? r.nameVi : lang === "EN" ? r.nameEn : r.nameKo;
  const visible = rows.filter((r) => r.totalDebit !== 0 || r.totalCredit !== 0);

  const totalDebit = visible.reduce((s, r) => s + r.totalDebit, 0);
  const totalCredit = visible.reduce((s, r) => s + r.totalCredit, 0);

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
          <ExcelDownload
            rows={visible.map((r) => ({
              code: r.code, name: localizedName(r), type: t(`coa.type.${r.type}`, lang),
              debit: Math.round(r.totalDebit), credit: Math.round(r.totalCredit), balance: Math.round(r.balance),
            }))}
            columns={[
              { key: "code", header: t("coa.code", lang) },
              { key: "name", header: t("coa.name", lang) },
              { key: "type", header: t("coa.type", lang) },
              { key: "debit", header: t("journal.totalDebit", lang) },
              { key: "credit", header: t("journal.totalCredit", lang) },
              { key: "balance", header: t("fs.balance", lang) },
            ]}
            filename={`trial-balance-${period}.xlsx`}
          />
        </Field>
      </Row>

      <table className="mt-3 w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
          <tr>
            <th className="py-2 text-left">{t("coa.code", lang)}</th>
            <th className="text-left">{t("coa.name", lang)}</th>
            <th className="text-left">{t("coa.type", lang)}</th>
            <th className="text-right">{t("journal.totalDebit", lang)}</th>
            <th className="text-right">{t("journal.totalCredit", lang)}</th>
            <th className="text-right">{t("fs.balance", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.code} className="border-b border-[color:var(--tts-border)]/40">
              <td className="py-2 font-mono">{r.code}</td>
              <td>{localizedName(r)}</td>
              <td className={TYPE_TONES[r.type] ?? ""}>{t(`coa.type.${r.type}`, lang)}</td>
              <td className="text-right font-mono">{Math.round(r.totalDebit).toLocaleString()}</td>
              <td className="text-right font-mono">{Math.round(r.totalCredit).toLocaleString()}</td>
              <td className={`text-right font-mono ${r.balance >= 0 ? "" : "text-rose-500"}`}>{Math.round(r.balance).toLocaleString()}</td>
            </tr>
          ))}
          {visible.length === 0 && !loading && (
            <tr><td colSpan={6} className="py-4 text-center text-[color:var(--tts-muted)]">{t("common.noData", lang)}</td></tr>
          )}
          {visible.length > 0 && (
            <tr className="border-t-2 border-[color:var(--tts-border)] font-bold">
              <td colSpan={3} className="py-2 text-right">{t("fs.total", lang)}</td>
              <td className="text-right font-mono">{Math.round(totalDebit).toLocaleString()}</td>
              <td className="text-right font-mono">{Math.round(totalCredit).toLocaleString()}</td>
              <td className={`text-right font-mono ${Math.abs(totalDebit - totalCredit) < 0.01 ? "text-emerald-500" : "text-rose-500"}`}>
                {Math.abs(totalDebit - totalCredit) < 0.01 ? "✓" : (totalDebit - totalCredit).toLocaleString()}
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
