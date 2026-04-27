"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

const STATUS_TONE: Record<string, "warn" | "primary" | "success" | "danger" | "neutral"> = {
  SUBMITTED: "warn", CONTACTED: "primary", MEETING: "primary", CONTRACTED: "success", PAID: "success", DECLINED: "danger",
};

export function ReferralsClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ companyName: "", contactName: "", contactPhone: "", contactEmail: "", note: "" });

  async function refetch() {
    const r = await fetch("/api/portal/referrals", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function submit() {
    setSubmitting(true); setMsg(null);
    try {
      const r = await fetch("/api/portal/referrals", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(form) });
      const j = await r.json();
      if (!r.ok) { setMsg(j?.error ?? "fail"); return; }
      setForm({ companyName: "", contactName: "", contactPhone: "", contactEmail: "", note: "" });
      setMsg("✓");
      refetch();
    } finally { setSubmitting(false); }
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-2xl font-extrabold">🤝 {t("portal.referrals.formTitle", lang)}</h1>
        <div className="mb-3 rounded bg-[color:var(--tts-warn-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-warn)]">{t("portal.referrals.rewardNote", lang)}</div>

        <Card>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div><label className="text-[11px] text-[color:var(--tts-muted)]">{t("portal.referrals.companyName", lang)}</label><input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" /></div>
            <div><label className="text-[11px] text-[color:var(--tts-muted)]">{t("portal.referrals.contactName", lang)}</label><input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" /></div>
            <div><label className="text-[11px] text-[color:var(--tts-muted)]">{t("portal.referrals.contactPhone", lang)}</label><input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" /></div>
            <div><label className="text-[11px] text-[color:var(--tts-muted)]">{t("portal.referrals.contactEmail", lang)}</label><input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" /></div>
            <div className="md:col-span-2"><label className="text-[11px] text-[color:var(--tts-muted)]">{t("portal.referrals.note", lang)}</label><textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" /></div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={submit} disabled={submitting || !form.companyName || !form.contactName || !form.contactPhone} className="rounded bg-[color:var(--tts-accent)] px-4 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">{submitting ? "..." : t("portal.referrals.submit", lang)}</button>
            {msg && <span className="text-[12px] text-[color:var(--tts-success)]">{msg}</span>}
          </div>
        </Card>

        <div className="mt-4">
          <Card title={t("portal.referrals.history", lang)} count={items.length}>
            {items.length === 0 ? <p className="text-[13px] text-[color:var(--tts-muted)]">{t("portal.referrals.empty", lang)}</p> : (
              <ul className="space-y-2">
                {items.map((r) => (
                  <li key={r.id} className="rounded border border-[color:var(--tts-border)] p-3 text-[12px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge><span className="font-bold">{r.companyName}</span> · {r.contactName} ({r.contactPhone})</div>
                      <span className="text-[10px] text-[color:var(--tts-muted)]">{r.referralCode} · {String(r.createdAt).slice(0, 10)}</span>
                    </div>
                    {r.note && <div className="mt-1 text-[11px] text-[color:var(--tts-sub)]">{r.note}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
