"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Q = { id: string; question: string; score: number };

const SCORE_OPTION_KEYS = [
  { value: "10", key: "scoreOpt.10" },
  { value: "8", key: "scoreOpt.8" },
  { value: "6", key: "scoreOpt.6" },
  { value: "4", key: "scoreOpt.4" },
  { value: "2", key: "scoreOpt.2" },
];

export function EvaluationNewForm({ employees, lang }: { employees: { value: string; label: string }[]; lang: Lang }) {
  const router = useRouter();
  const [reviewerId, setReviewerId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [questions, setQuestions] = useState<Q[]>([
    { id: "q1", question: t("evalDefault.q1", lang), score: 6 },
    { id: "q2", question: t("evalDefault.q2", lang), score: 6 },
    { id: "q3", question: t("evalDefault.q3", lang), score: 6 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addQ() { setQuestions((p) => [...p, { id: `q${p.length + 1}`, question: "", score: 6 }]); }
  function rmQ(id: string) { setQuestions((p) => p.length <= 1 ? p : p.filter((q) => q.id !== id)); }
  function setQ<K extends keyof Q>(id: string, k: K, v: Q[K]) {
    setQuestions((p) => p.map((q) => q.id === id ? { ...q, [k]: v } : q));
  }

  const totalPossible = questions.length * 10;
  const actual = questions.reduce((s, q) => s + q.score, 0);
  const score100 = totalPossible > 0 ? (actual / totalPossible) * 100 : 0;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSubmitting(true); setError(null);
    try {
      const answersJson: Record<string, number> = {};
      for (const q of questions) answersJson[q.question || q.id] = q.score;
      const res = await fetch("/api/hr/evaluations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId, subjectId, deadline, answersJson }),
      });
      if (!res.ok) { setError(t("msg.saveFailedGeneric", lang)); return; }
      router.push("/hr/evaluations"); router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">{t("note.evalAuto", lang)}<span className="font-mono">EVAL-YYMMDD-###</span>{t("note.evalAutoSuffix", lang)}</Note>
      <Row>
        <Field label={t("field.reviewerField", lang)} required><Select required value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} placeholder={t("placeholder.select", lang)} options={employees} /></Field>
        <Field label={t("field.subjectEvalField", lang)} required><Select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder={t("placeholder.select", lang)} options={employees} /></Field>
        <Field label={t("field.deadlineField", lang)} required width="200px"><TextInput type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
      </Row>
      <div className="mt-3">
        <div className="mb-1 text-[12px] font-semibold text-[color:var(--tts-sub)]">{t("label.questionsList", lang)}</div>
        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.id} className="flex gap-2 items-end">
              <Field label={t("field.questionField", lang)}><TextInput value={q.question} onChange={(e) => setQ(q.id, "question", e.target.value)} placeholder={t("placeholder.qExample", lang)} /></Field>
              <Field label={t("field.answerField", lang)} width="200px">
                <Select value={String(q.score)} onChange={(e) => setQ(q.id, "score", Number(e.target.value))} options={SCORE_OPTION_KEYS.map((o) => ({ value: o.value, label: t(o.key, lang) }))} />
              </Field>
              <Button type="button" size="sm" variant="ghost" onClick={() => rmQ(q.id)} disabled={questions.length <= 1}>×</Button>
            </div>
          ))}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addQ} className="mt-2">{t("btn.addQuestion", lang)}</Button>
      </div>
      <div className="mt-3 rounded-md bg-[color:var(--tts-card-hover)] p-3 text-[13px]">
        {t("label.totalConvert", lang).replace("{actual}", String(actual)).replace("{total}", String(totalPossible))}<span className="ml-1 font-mono text-[16px] font-extrabold text-[color:var(--tts-primary)]">{t("label.scorePts", lang).replace("{score}", score100.toFixed(1))}</span>
      </div>
      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting}>{submitting ? t("action.saving", lang) : t("btn.evalRegister", lang)}</Button><Button type="button" variant="ghost" onClick={() => router.push("/hr/evaluations")}>{t("action.cancel", lang)}</Button></div>
    </form>
  );
}
