"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

const KINDS = [
  { v: "PRAISE", emoji: "🌟" },
  { v: "IMPROVE", emoji: "🔧" },
  { v: "SUGGEST", emoji: "💡" },
] as const;

function pick3<T extends Record<string, unknown>>(rec: T | null | undefined, lang: Lang, base: string): string {
  if (!rec) return "";
  const order: Lang[] = lang === "VI" ? ["VI", "EN", "KO"] : lang === "EN" ? ["EN", "VI", "KO"] : ["KO", "VI", "EN"];
  for (const l of order) {
    const k = `${base}${l[0]}${l[1].toLowerCase()}`;
    const v = rec[k as keyof T];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

export function FeedbackClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [kind, setKind] = useState<"PRAISE" | "IMPROVE" | "SUGGEST">("PRAISE");
  const [content, setContent] = useState("");

  async function refetch() {
    const r = await fetch("/api/portal/feedback", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function submit() {
    if (!content.trim()) return;
    setSubmitting(true); setMsg(null);
    try {
      const body: Record<string, unknown> = {
        kind,
        originalLang: lang,
        contentKo: lang === "KO" ? content : null,
        contentVi: lang === "VI" ? content : null,
        contentEn: lang === "EN" ? content : null,
      };
      const r = await fetch("/api/portal/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j?.error ?? "fail"); return; }
      setContent("");
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
                  <input type="radio" checked={kind === k.v} onChange={() => setKind(k.v)} />
                  {k.emoji} {t(`portal.feedback.${k.v.toLowerCase()}`, lang)}
                </label>
              ))}
            </div>
          </div>
          <textarea rows={3} value={content} placeholder={t("portal.feedback.placeholder", lang)} onChange={(e) => setContent(e.target.value)} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
          <div className="mt-1 text-[10px] text-[color:var(--tts-muted)]">{t("portal.autoTranslateHint", lang)}</div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={submit} disabled={submitting || !content.trim()} className="rounded bg-[color:var(--tts-accent)] px-4 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">{submitting ? "..." : t("portal.feedback.submit", lang)}</button>
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
                    <div className="text-[12px]">{pick3(f, lang, "content")}</div>
                    {(f.replyKo || f.replyVi || f.replyEn) && <div className="mt-2 rounded bg-[color:var(--tts-card-hover)] p-2 text-[12px]"><span className="text-[10px] font-bold text-[color:var(--tts-muted)]">{t("portal.feedback.reply", lang)}:</span> {pick3(f, lang, "reply")}</div>}
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
