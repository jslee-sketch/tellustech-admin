"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

const KINDS = [
  { v: "PRAISE", emoji: "🌟" },
  { v: "IMPROVE", emoji: "🔧" },
  { v: "SUGGEST", emoji: "💡" },
] as const;

export function FeedbackClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ kind: "PRAISE" as "PRAISE" | "IMPROVE" | "SUGGEST", contentKo: "", contentVi: "", contentEn: "", originalLang: lang, targetEmployeeId: "" });

  async function refetch() {
    const r = await fetch("/api/portal/feedback", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function submit() {
    setSubmitting(true); setMsg(null);
    try {
      const r = await fetch("/api/portal/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({
          kind: form.kind,
          contentKo: form.contentKo || null, contentVi: form.contentVi || null, contentEn: form.contentEn || null,
          originalLang: form.originalLang,
          targetEmployeeId: form.targetEmployeeId || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j?.error ?? "fail"); return; }
      setForm({ ...form, contentKo: "", contentVi: "", contentEn: "" });
      if (j.pointsEarned) setMsg(`🏆 +${j.pointsEarned}d`);
      refetch();
    } finally { setSubmitting(false); }
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-extrabold">🌟 {t("portal.sidebar.feedback", lang)}</h1>

        <Card>
          <div className="mb-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--tts-muted)]">{t("portal.feedback.kind", lang)}</label>
            <div className="flex gap-3">
              {KINDS.map((k) => (
                <label key={k.v} className="flex cursor-pointer items-center gap-1 text-[13px]">
                  <input type="radio" checked={form.kind === k.v} onChange={() => setForm({ ...form, kind: k.v })} />
                  {k.emoji} {t(`portal.feedback.${k.v.toLowerCase()}`, lang)}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <textarea rows={2} value={form.contentKo} placeholder={"KO " + t("portal.feedback.placeholder", lang)} onChange={(e) => setForm({ ...form, contentKo: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
            <textarea rows={2} value={form.contentVi} placeholder="VI" onChange={(e) => setForm({ ...form, contentVi: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
            <textarea rows={2} value={form.contentEn} placeholder="EN" onChange={(e) => setForm({ ...form, contentEn: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={submit} disabled={submitting || !(form.contentKo || form.contentVi || form.contentEn)} className="rounded bg-[color:var(--tts-accent)] px-4 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">{submitting ? "..." : t("portal.feedback.submit", lang)}</button>
            {msg && <span className="text-[12px] text-[color:var(--tts-success)]">{msg}</span>}
          </div>
        </Card>

        <div className="mt-4">
          <Card title={t("portal.feedback.history", lang)} count={items.length}>
            {items.length === 0 ? <p className="text-[13px] text-[color:var(--tts-muted)]">{t("portal.feedback.empty", lang)}</p> : (
              <ul className="space-y-2">
                {items.map((f) => (
                  <li key={f.id} className="rounded border border-[color:var(--tts-border)] p-3 text-[12px]">
                    <div className="mb-1 flex items-center justify-between">
                      <Badge tone={f.kind === "PRAISE" ? "success" : f.kind === "IMPROVE" ? "warn" : "primary"}>{KINDS.find((k) => k.v === f.kind)?.emoji} {f.kind}</Badge>
                      <span className="text-[10px] text-[color:var(--tts-muted)]">{f.feedbackCode} · {String(f.createdAt).slice(0, 10)}</span>
                    </div>
                    <div className="text-[12px]">{f.contentKo || f.contentVi || f.contentEn}</div>
                    {f.replyKo && <div className="mt-2 rounded bg-[color:var(--tts-card-hover)] p-2 text-[12px]"><span className="text-[10px] font-bold text-[color:var(--tts-muted)]">{t("portal.feedback.reply", lang)}:</span> {f.replyKo}</div>}
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
