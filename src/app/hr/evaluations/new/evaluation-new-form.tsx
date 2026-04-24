"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput } from "@/components/ui";

type Q = { id: string; question: string; score: number };

const SCORE_OPTS = [
  { value: "10", label: "매우잘함 (10)" },
  { value: "8", label: "잘함 (8)" },
  { value: "6", label: "보통 (6)" },
  { value: "4", label: "노력요함 (4)" },
  { value: "2", label: "많은노력 필요 (2)" },
];

export function EvaluationNewForm({ employees }: { employees: { value: string; label: string }[] }) {
  const router = useRouter();
  const [reviewerId, setReviewerId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [questions, setQuestions] = useState<Q[]>([
    { id: "q1", question: "업무 역량", score: 6 },
    { id: "q2", question: "협업 태도", score: 6 },
    { id: "q3", question: "책임감", score: 6 },
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
      if (!res.ok) { setError("저장 실패"); return; }
      router.push("/hr/evaluations"); router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">코드 자동 발급 <span className="font-mono">EVAL-YYMMDD-###</span>. 5단계 답변 (10/8/6/4/2). 질문수 × 답변 합계 → 100점 환산.</Note>
      <Row>
        <Field label="평가자" required><Select required value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} placeholder="선택" options={employees} /></Field>
        <Field label="피평가자" required><Select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="선택" options={employees} /></Field>
        <Field label="마감일" required width="200px"><TextInput type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
      </Row>
      <div className="mt-3">
        <div className="mb-1 text-[12px] font-semibold text-[color:var(--tts-sub)]">질문 목록</div>
        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.id} className="flex gap-2 items-end">
              <Field label="질문"><TextInput value={q.question} onChange={(e) => setQ(q.id, "question", e.target.value)} placeholder="예: 업무 역량" /></Field>
              <Field label="답변" width="200px">
                <Select value={String(q.score)} onChange={(e) => setQ(q.id, "score", Number(e.target.value))} options={SCORE_OPTS} />
              </Field>
              <Button type="button" size="sm" variant="ghost" onClick={() => rmQ(q.id)} disabled={questions.length <= 1}>×</Button>
            </div>
          ))}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addQ} className="mt-2">+ 질문 추가</Button>
      </div>
      <div className="mt-3 rounded-md bg-[color:var(--tts-card-hover)] p-3 text-[13px]">
        합계: {actual}/{totalPossible} → 환산 <span className="ml-1 font-mono text-[16px] font-extrabold text-[color:var(--tts-primary)]">{score100.toFixed(1)}점</span>
      </div>
      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting}>{submitting ? "저장 중..." : "평가 등록"}</Button><Button type="button" variant="ghost" onClick={() => router.push("/hr/evaluations")}>취소</Button></div>
    </form>
  );
}
