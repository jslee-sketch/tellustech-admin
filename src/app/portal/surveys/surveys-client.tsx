"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Question = { id: string; type: "RATING" | "CHOICE" | "TEXT"; textKo?: string; textVi?: string; textEn?: string; options?: { value: string; textKo?: string; textVi?: string; textEn?: string }[] };

export function SurveysClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  const [openSurvey, setOpenSurvey] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function refetch() {
    const r = await fetch("/api/portal/surveys", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function submit() {
    if (!openSurvey) return;
    setSubmitting(true);
    try {
      const arr = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
      const r = await fetch(`/api/portal/surveys/${openSurvey.id}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ answers: arr }) });
      const j = await r.json();
      if (r.ok) {
        if (j.pointsEarned) setToast(`🏆 +${j.pointsEarned}d`);
        setOpenSurvey(null); setAnswers({}); refetch();
      } else setToast(j?.error ?? "fail");
    } finally { setSubmitting(false); }
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-extrabold">📊 {t("portal.sidebar.surveys", lang)}</h1>
        {toast && <div className="mb-3 rounded bg-[color:var(--tts-success-dim)] px-3 py-1.5 text-[13px] text-[color:var(--tts-success)]">{toast}</div>}
        {items.length === 0 ? (
          <Card><p className="text-center text-[13px] text-[color:var(--tts-muted)]">{t("portal.surveys.empty", lang)}</p></Card>
        ) : (
          <div className="space-y-3">
            {items.map((s) => (
              <Card key={s.id} title={s.titleKo || s.titleVi || s.titleEn}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[color:var(--tts-sub)]">{String(s.startDate).slice(0, 10)} ~ {String(s.endDate).slice(0, 10)}</span>
                  <span className="font-bold text-[color:var(--tts-warn)]">🏆 +{s.rewardPoints}d</span>
                </div>
                <div className="mt-2">
                  {s.alreadyDone ? (
                    <span className="text-[12px] text-[color:var(--tts-muted)]">{t("portal.surveys.alreadyDone", lang)}</span>
                  ) : (
                    <button onClick={() => { setOpenSurvey(s); setAnswers({}); }} className="rounded bg-[color:var(--tts-accent)] px-3 py-1 text-[12px] font-bold text-white">{t("portal.surveys.participate", lang)}</button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {openSurvey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpenSurvey(null)}>
            <div className="w-full max-w-lg rounded-lg bg-[color:var(--tts-card)] p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-3 text-lg font-bold">{openSurvey.titleKo || openSurvey.titleVi || openSurvey.titleEn}</h2>
              <div className="max-h-96 space-y-3 overflow-y-auto">
                {(openSurvey.questions as Question[]).map((q) => (
                  <div key={q.id}>
                    <div className="mb-1 text-[13px] font-bold">{q.textKo || q.textVi || q.textEn}</div>
                    {q.type === "RATING" && (
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} onClick={() => setAnswers({ ...answers, [q.id]: n })} className={`flex h-8 w-8 items-center justify-center rounded ${answers[q.id] === n ? "bg-[color:var(--tts-accent)] text-white" : "border border-[color:var(--tts-border)]"}`}>{n}</button>
                        ))}
                      </div>
                    )}
                    {q.type === "CHOICE" && q.options && (
                      <div className="space-y-1">
                        {q.options.map((o) => (
                          <label key={o.value} className="flex items-center gap-2 text-[12px]">
                            <input type="radio" name={q.id} checked={answers[q.id] === o.value} onChange={() => setAnswers({ ...answers, [q.id]: o.value })} />
                            {o.textKo || o.textVi || o.textEn}
                          </label>
                        ))}
                      </div>
                    )}
                    {q.type === "TEXT" && (
                      <textarea rows={2} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setOpenSurvey(null)} className="rounded border border-[color:var(--tts-border)] px-3 py-1.5 text-[12px]">{t("common.cancel", lang)}</button>
                <button onClick={submit} disabled={submitting} className="rounded bg-[color:var(--tts-accent)] px-4 py-1.5 text-[12px] font-bold text-white">{submitting ? "..." : t("portal.surveys.participate", lang)}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
