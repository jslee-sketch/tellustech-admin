"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export function SurveysAdminClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<{ titleKo: string; startDate: string; endDate: string; rewardPoints: number; questions: any[] }>({
    titleKo: "", startDate: today, endDate: today, rewardPoints: 10000,
    questions: [{ id: "q1", type: "RATING", textKo: "" }],
  });

  async function refetch() {
    const r = await fetch("/api/admin/surveys", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function create() {
    if (!form.titleKo) return;
    const r = await fetch("/api/admin/surveys", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(form) });
    if (r.ok) { setOpen(false); refetch(); }
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-2xl font-extrabold">📊 {t("admin.surveys.title", lang)}</h1>

        <Card>
          <button onClick={() => setOpen(!open)} className="rounded bg-[color:var(--tts-accent)] px-3 py-1.5 text-[12px] font-bold text-white">+ {t("survey.createBtn", lang)}</button>
          {open && (
            <div className="mt-3 space-y-2 border-t border-[color:var(--tts-border)] pt-3">
              <input value={form.titleKo} onChange={(e) => setForm({ ...form, titleKo: e.target.value })} placeholder={t("survey.titleKoPh", lang)} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
              <div className="flex gap-2">
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="flex-1 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="flex-1 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
                <input type="number" value={form.rewardPoints} onChange={(e) => setForm({ ...form, rewardPoints: Number(e.target.value) })} className="w-32 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
              </div>
              <div className="space-y-1">
                {form.questions.map((q, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select value={q.type} onChange={(e) => setForm({ ...form, questions: form.questions.map((x, i) => i === idx ? { ...x, type: e.target.value } : x) })} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]">
                      <option value="RATING">RATING</option>
                      <option value="CHOICE">CHOICE</option>
                      <option value="TEXT">TEXT</option>
                    </select>
                    <input value={q.textKo} onChange={(e) => setForm({ ...form, questions: form.questions.map((x, i) => i === idx ? { ...x, textKo: e.target.value } : x) })} placeholder={t("survey.questionKoPh", lang)} className="flex-1 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]" />
                  </div>
                ))}
                <button onClick={() => setForm({ ...form, questions: [...form.questions, { id: `q${form.questions.length + 1}`, type: "RATING", textKo: "" }] })} className="text-[11px] text-[color:var(--tts-accent)]">+ {t("survey.addQuestion", lang)}</button>
              </div>
              <button onClick={create} className="rounded bg-[color:var(--tts-accent)] px-3 py-1 text-[12px] font-bold text-white">{t("survey.createBtnShort", lang)}</button>
            </div>
          )}
        </Card>

        <div className="mt-4">
          <Card count={items.length}>
            <table className="w-full text-[12px]">
              <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
                <tr>
                  <th className="px-2 py-1 text-left">{t("col.refReceipt", lang)}</th>
                  <th className="px-2 py-1 text-left">제목</th>
                  <th className="px-2 py-1 text-left">기간</th>
                  <th className="px-2 py-1 text-right">포인트</th>
                  <th className="px-2 py-1 text-right">참여</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b border-[color:var(--tts-border)]/50">
                    <td className="px-2 py-1.5 font-mono">{s.surveyCode}</td>
                    <td className="px-2 py-1.5">{s.titleKo || s.titleVi || s.titleEn}</td>
                    <td className="px-2 py-1.5">{String(s.startDate).slice(0, 10)} ~ {String(s.endDate).slice(0, 10)}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{s.rewardPoints.toLocaleString()}d</td>
                    <td className="px-2 py-1.5 text-right">{s._count.responses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </main>
  );
}
