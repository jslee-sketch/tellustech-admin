"use client";
import { useEffect, useState } from "react";
import { Button, ExcelDownload, Field, Row, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Line = { code: string; name: string; amount: number };
type BS = {
  asOf: string;
  asset: Line[]; totalAsset: number;
  liability: Line[]; totalLiability: number;
  equity: Line[]; totalEquity: number;
  retainedEarnings: number;
};

export function BalanceSheetClient({ lang }: { lang: Lang }) {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 7));
  useEffect(() => {
    const u = new URL(window.location.href);
    const q = u.searchParams.get("asOf") ?? u.searchParams.get("period");
    if (q && /^\d{4}-\d{2}$/.test(q)) setAsOf(q);
  }, []);
  const [data, setData] = useState<BS | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/finance/balance-sheet?asOf=${asOf}&lang=${lang}`, { cache: "no-store" });
    const j = await r.json();
    setData(j.result ?? j.data?.result ?? null);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [asOf, lang]);

  const balanced = data ? Math.abs(data.totalAsset - (data.totalLiability + data.totalEquity)) < 0.01 : false;

  return (
    <div>
      <Row>
        <Field label={t("fs.asOf", lang)} width="180px">
          <TextInput value={asOf} onChange={(e) => setAsOf(e.target.value)} placeholder="YYYY-MM or YYYY-MM-DD" />
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
                ...data.asset.map((r) => ({ section: t("coa.type.ASSET", lang), code: r.code, name: r.name, amount: Math.round(r.amount) })),
                { section: t("fs.totalAsset", lang), code: "", name: "", amount: Math.round(data.totalAsset) },
                ...data.liability.map((r) => ({ section: t("coa.type.LIABILITY", lang), code: r.code, name: r.name, amount: Math.round(r.amount) })),
                { section: t("fs.totalLiability", lang), code: "", name: "", amount: Math.round(data.totalLiability) },
                ...data.equity.map((r) => ({ section: t("coa.type.EQUITY", lang), code: r.code, name: r.name, amount: Math.round(r.amount) })),
                { section: t("fs.retainedEarnings", lang), code: "", name: "", amount: Math.round(data.retainedEarnings) },
                { section: t("fs.totalEquity", lang), code: "", name: "", amount: Math.round(data.totalEquity) },
              ]}
              columns={[
                { key: "section", header: t("fs.section", lang) },
                { key: "code", header: t("coa.code", lang) },
                { key: "name", header: t("coa.name", lang) },
                { key: "amount", header: t("fs.amount", lang) },
              ]}
              filename={`balance-sheet-${asOf}.xlsx`}
            />
          </Field>
        )}
      </Row>

      {data && (
        <div className="mt-4 print:mt-0">
          <div className="mb-3 text-center">
            <div className="text-[18px] font-extrabold">{t("nav.balanceSheet", lang)}</div>
            <div className="text-[12px] text-[color:var(--tts-sub)]">{t("fs.asOf", lang)}: {asOf}</div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <table className="w-full text-[13px]">
              <thead>
                <tr><th colSpan={3} className="border-b-2 border-[color:var(--tts-border)] py-2 text-left text-blue-500">{t("coa.type.ASSET", lang)}</th></tr>
              </thead>
              <tbody>
                {data.asset.map((r) => (
                  <tr key={`a-${r.code}`} className="border-b border-[color:var(--tts-border)]/30">
                    <td className="py-1.5 font-mono text-[11px]">{r.code}</td>
                    <td>{r.name}</td>
                    <td className="text-right font-mono">{Math.round(r.amount).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="border-t border-[color:var(--tts-border)] font-bold">
                  <td colSpan={2} className="py-2">{t("fs.totalAsset", lang)}</td>
                  <td className="text-right font-mono text-blue-500">{Math.round(data.totalAsset).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr><th colSpan={3} className="border-b-2 border-[color:var(--tts-border)] py-2 text-left text-amber-500">{t("coa.type.LIABILITY", lang)}</th></tr>
                </thead>
                <tbody>
                  {data.liability.map((r) => (
                    <tr key={`l-${r.code}`} className="border-b border-[color:var(--tts-border)]/30">
                      <td className="py-1.5 font-mono text-[11px]">{r.code}</td>
                      <td>{r.name}</td>
                      <td className="text-right font-mono">{Math.round(r.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-[color:var(--tts-border)] font-bold">
                    <td colSpan={2} className="py-2">{t("fs.totalLiability", lang)}</td>
                    <td className="text-right font-mono text-amber-500">{Math.round(data.totalLiability).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <table className="mt-4 w-full text-[13px]">
                <thead>
                  <tr><th colSpan={3} className="border-b-2 border-[color:var(--tts-border)] py-2 text-left text-purple-500">{t("coa.type.EQUITY", lang)}</th></tr>
                </thead>
                <tbody>
                  {data.equity.map((r) => (
                    <tr key={`q-${r.code}`} className="border-b border-[color:var(--tts-border)]/30">
                      <td className="py-1.5 font-mono text-[11px]">{r.code}</td>
                      <td>{r.name}</td>
                      <td className="text-right font-mono">{Math.round(r.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-[color:var(--tts-border)]/30">
                    <td className="py-1.5 italic text-[color:var(--tts-sub)]">—</td>
                    <td className="italic">{t("fs.retainedEarnings", lang)}</td>
                    <td className={`text-right font-mono ${data.retainedEarnings >= 0 ? "" : "text-rose-500"}`}>{Math.round(data.retainedEarnings).toLocaleString()}</td>
                  </tr>
                  <tr className="border-t border-[color:var(--tts-border)] font-bold">
                    <td colSpan={2} className="py-2">{t("fs.totalEquity", lang)}</td>
                    <td className="text-right font-mono text-purple-500">{Math.round(data.totalEquity).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className={`mt-4 rounded-md border p-3 text-center text-[13px] font-bold ${balanced ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" : "border-rose-500/50 bg-rose-500/10 text-rose-500"}`}>
            {t("fs.balanceCheck", lang)}: {balanced ? "✓ A = L + E" : `✗ ${(data.totalAsset - data.totalLiability - data.totalEquity).toLocaleString()}`}
          </div>
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
