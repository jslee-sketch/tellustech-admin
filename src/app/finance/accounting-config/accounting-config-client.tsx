"use client";
import { useEffect, useState } from "react";
import { Button, Field, Row, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Cfg = {
  standard: "VAS" | "K_IFRS" | "IFRS";
  fiscalYearStart: "JAN" | "APR" | "JUL" | "OCT";
  reportingCurrency: "VND" | "KRW" | "USD";
  defaultVatRate: number | string;
  defaultReportLang: "VI" | "EN" | "KO";
  enableAccrual: boolean;
  enableAutoJournal: boolean;
  enforcePeriodClose: boolean;
};

type Preset = {
  standard: string;
  defaultVatRate: number;
  fiscalYearStart: string;
  reportingCurrency: string;
  defaultReportLang: string;
  enableAccrual: boolean;
  description: { vi: string; en: string; ko: string };
};

export function AccountingConfigClient({ lang }: { lang: Lang }) {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [presets, setPresets] = useState<Record<string, Preset>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/finance/accounting-config");
    const j = await r.json();
    setCfg(j.config);
    setPresets(j.presets ?? {});
  }
  useEffect(() => { load(); }, []);

  async function applyPreset(key: string) {
    if (!confirm(t("acfg.confirmPreset", lang).replace("{p}", key))) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/finance/accounting-config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: key }),
      });
      const j = await r.json();
      if (r.ok) { setMsg(t("acfg.presetApplied", lang).replace("{p}", key)); await load(); }
      else setMsg(`failed: ${j.error}`);
    } finally { setBusy(false); }
  }

  async function save() {
    if (!cfg) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/finance/accounting-config", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          standard: cfg.standard,
          fiscalYearStart: cfg.fiscalYearStart,
          reportingCurrency: cfg.reportingCurrency,
          defaultVatRate: Number(cfg.defaultVatRate),
          defaultReportLang: cfg.defaultReportLang,
          enableAccrual: cfg.enableAccrual,
          enableAutoJournal: cfg.enableAutoJournal,
          enforcePeriodClose: cfg.enforcePeriodClose,
        }),
      });
      const j = await r.json();
      setMsg(r.ok ? t("acfg.saved", lang) : `failed: ${j.error}`);
      if (r.ok) await load();
    } finally { setBusy(false); }
  }

  if (!cfg) return <div className="text-[color:var(--tts-muted)]">…loading</div>;
  const desc = (key: string) => lang === "VI" ? presets[key]?.description.vi : lang === "EN" ? presets[key]?.description.en : presets[key]?.description.ko;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-[13px] font-bold">{t("acfg.presetTitle", lang)}</div>
        <div className="grid grid-cols-3 gap-3">
          {(["VAS", "K_IFRS", "IFRS"] as const).map((k) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              disabled={busy}
              className={`rounded-md border p-3 text-left transition ${cfg.standard === k ? "border-[color:var(--tts-primary)] bg-[color:var(--tts-primary)]/10" : "border-[color:var(--tts-border)] hover:bg-[color:var(--tts-card-hover)]"}`}
            >
              <div className="text-[14px] font-extrabold">{k}</div>
              <div className="mt-1 text-[11px] text-[color:var(--tts-sub)]">{desc(k)}</div>
              {cfg.standard === k && <div className="mt-2 text-[10px] font-bold text-emerald-500">✓ {t("acfg.active", lang)}</div>}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[13px] font-bold">{t("acfg.settingsTitle", lang)}</div>
        <Row>
          <Field label={t("acfg.standard", lang)} width="180px">
            <select value={cfg.standard} onChange={(e) => setCfg({ ...cfg, standard: e.target.value as Cfg["standard"] })} className="w-full rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[12px]">
              <option value="VAS">VAS</option><option value="K_IFRS">K-IFRS</option><option value="IFRS">IFRS</option>
            </select>
          </Field>
          <Field label={t("acfg.fiscalYear", lang)} width="180px">
            <select value={cfg.fiscalYearStart} onChange={(e) => setCfg({ ...cfg, fiscalYearStart: e.target.value as Cfg["fiscalYearStart"] })} className="w-full rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[12px]">
              <option value="JAN">{t("acfg.fy.JAN", lang)}</option>
              <option value="APR">{t("acfg.fy.APR", lang)}</option>
              <option value="JUL">{t("acfg.fy.JUL", lang)}</option>
              <option value="OCT">{t("acfg.fy.OCT", lang)}</option>
            </select>
          </Field>
          <Field label={t("acfg.reportCurrency", lang)} width="140px">
            <select value={cfg.reportingCurrency} onChange={(e) => setCfg({ ...cfg, reportingCurrency: e.target.value as Cfg["reportingCurrency"] })} className="w-full rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[12px]">
              <option value="VND">VND</option><option value="KRW">KRW</option><option value="USD">USD</option>
            </select>
          </Field>
          <Field label={t("acfg.vatRate", lang)} width="140px">
            <TextInput value={String(cfg.defaultVatRate)} onChange={(e) => setCfg({ ...cfg, defaultVatRate: e.target.value })} placeholder="0.10" />
          </Field>
          <Field label={t("acfg.reportLang", lang)} width="120px">
            <select value={cfg.defaultReportLang} onChange={(e) => setCfg({ ...cfg, defaultReportLang: e.target.value as Cfg["defaultReportLang"] })} className="w-full rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[12px]">
              <option value="VI">Tiếng Việt</option><option value="EN">English</option><option value="KO">한국어</option>
            </select>
          </Field>
        </Row>

        <div className="mt-3 grid grid-cols-3 gap-3 rounded-md border border-[color:var(--tts-border)] p-3 text-[12px]">
          <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.enableAccrual} onChange={(e) => setCfg({ ...cfg, enableAccrual: e.target.checked })} /> {t("acfg.accrual", lang)}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.enableAutoJournal} onChange={(e) => setCfg({ ...cfg, enableAutoJournal: e.target.checked })} /> {t("acfg.autoJournal", lang)}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.enforcePeriodClose} onChange={(e) => setCfg({ ...cfg, enforcePeriodClose: e.target.checked })} /> {t("acfg.enforceClose", lang)}</label>
        </div>

        <div className="mt-3 flex gap-2">
          <Button onClick={save} disabled={busy} variant="primary">{t("common.save", lang)}</Button>
          {msg && <span className="self-center text-[12px] text-[color:var(--tts-sub)]">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
