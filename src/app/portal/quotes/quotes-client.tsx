"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

const TYPES = ["RENTAL_IT", "RENTAL_TM", "CALIBRATION", "REPAIR", "PURCHASE", "MAINTENANCE", "OTHER"] as const;

const STATUS_TONE: Record<string, "warn" | "primary" | "success" | "danger" | "neutral" | "accent"> = {
  REQUESTED: "warn", ASSIGNED: "primary", QUOTED: "accent", ACCEPTED: "success", REJECTED: "danger", EXPIRED: "neutral", CONVERTED: "success",
};

export function QuotesClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ quoteType: "RENTAL_IT", titleKo: "", titleVi: "", titleEn: "", descKo: "", descVi: "", descEn: "", originalLang: lang, quantity: 0, desiredStartDate: "", desiredEndDate: "" });

  async function refetch() {
    const r = await fetch("/api/portal/quotes", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function submit() {
    setSubmitting(true); setMsg(null);
    try {
      const r = await fetch("/api/portal/quotes", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({
          quoteType: form.quoteType,
          titleKo: form.titleKo || null, titleVi: form.titleVi || null, titleEn: form.titleEn || null,
          descriptionKo: form.descKo || null, descriptionVi: form.descVi || null, descriptionEn: form.descEn || null,
          originalLang: form.originalLang,
          quantity: form.quantity || null,
          desiredStartDate: form.desiredStartDate || null,
          desiredEndDate: form.desiredEndDate || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j?.error ?? "fail"); return; }
      setForm({ ...form, titleKo: "", titleVi: "", titleEn: "", descKo: "", descVi: "", descEn: "", quantity: 0, desiredStartDate: "", desiredEndDate: "" });
      if (j.pointsEarned) setMsg(`🏆 +${j.pointsEarned}d`);
      refetch();
    } finally { setSubmitting(false); }
  }

  async function action(id: string, act: "accept" | "reject") {
    const r = await fetch(`/api/portal/quotes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action: act }) });
    if (r.ok) refetch();
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-extrabold">💬 {t("portal.sidebar.quoteRequest", lang)}</h1>

        <Card title={t("portal.quotes.requestForm", lang)}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-[11px] text-[color:var(--tts-muted)]">{t("portal.quotes.type", lang)}</label>
              <select value={form.quoteType} onChange={(e) => setForm({ ...form, quoteType: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]">
                {TYPES.map((tt) => <option key={tt} value={tt}>{tt}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[color:var(--tts-muted)]">{t("portal.quotes.quantity", lang)}</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] text-[color:var(--tts-muted)]">{t("portal.quotes.title", lang)} (KO/VI/EN — {t("portal.quotes.atLeastOne", lang)})</label>
              <div className="space-y-1">
                <input value={form.titleKo} placeholder="KO" onChange={(e) => setForm({ ...form, titleKo: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
                <input value={form.titleVi} placeholder="VI" onChange={(e) => setForm({ ...form, titleVi: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
                <input value={form.titleEn} placeholder="EN" onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[color:var(--tts-muted)]">{t("portal.quotes.desiredStart", lang)}</label>
              <input type="date" value={form.desiredStartDate} onChange={(e) => setForm({ ...form, desiredStartDate: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
            </div>
            <div>
              <label className="text-[11px] text-[color:var(--tts-muted)]">{t("portal.quotes.desiredEnd", lang)}</label>
              <input type="date" value={form.desiredEndDate} onChange={(e) => setForm({ ...form, desiredEndDate: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] text-[color:var(--tts-muted)]">{t("portal.quotes.description", lang)}</label>
              <textarea rows={2} value={form.descKo} placeholder="KO" onChange={(e) => setForm({ ...form, descKo: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={submit} disabled={submitting || !(form.titleKo || form.titleVi || form.titleEn)} className="rounded bg-[color:var(--tts-accent)] px-4 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">{submitting ? "..." : t("portal.quotes.submit", lang)}</button>
            {msg && <span className="text-[12px] text-[color:var(--tts-success)]">{msg}</span>}
          </div>
        </Card>

        <div className="mt-4">
          <Card title={t("portal.quotes.history", lang)} count={items.length}>
            {items.length === 0 ? <p className="text-[13px] text-[color:var(--tts-muted)]">{t("portal.quotes.empty", lang)}</p> : (
              <table className="w-full text-[12px]">
                <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
                  <tr>
                    <th className="px-2 py-1 text-left">{t("portal.points.date", lang)}</th>
                    <th className="px-2 py-1 text-left">{t("col.refReceipt", lang)}</th>
                    <th className="px-2 py-1 text-left">{t("portal.quotes.type", lang)}</th>
                    <th className="px-2 py-1 text-left">{t("col.statusShort", lang)}</th>
                    <th className="px-2 py-1 text-right">{t("portal.quotes.quotedAmount", lang)}</th>
                    <th className="px-2 py-1 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((q) => (
                    <tr key={q.id} className="border-b border-[color:var(--tts-border)]/50">
                      <td className="px-2 py-1.5">{String(q.createdAt).slice(0, 10)}</td>
                      <td className="px-2 py-1.5 font-mono">{q.quoteCode}</td>
                      <td className="px-2 py-1.5">{q.quoteType}</td>
                      <td className="px-2 py-1.5"><Badge tone={STATUS_TONE[q.status] ?? "neutral"}>{q.status}</Badge></td>
                      <td className="px-2 py-1.5 text-right font-mono">{q.quotedAmount ? new Intl.NumberFormat("vi-VN").format(Number(q.quotedAmount)) : "—"}</td>
                      <td className="px-2 py-1.5 text-right">
                        {q.status === "QUOTED" && (
                          <>
                            <button onClick={() => action(q.id, "accept")} className="mr-1 rounded bg-[color:var(--tts-success)] px-2 py-0.5 text-[11px] font-bold text-white">{t("portal.quotes.accept", lang)}</button>
                            <button onClick={() => action(q.id, "reject")} className="rounded border border-[color:var(--tts-border)] px-2 py-0.5 text-[11px]">{t("portal.quotes.reject", lang)}</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
