"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button, Checkbox, Field, Note, Row, Select, Textarea } from "@/components/ui";

export function IncidentNewForm({ defaultLang, subjectOptions }: { defaultLang: string; subjectOptions: { value: string; label: string }[] }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState("");
  const [type, setType] = useState("PRAISE");
  const [originalLang, setOriginalLang] = useState(defaultLang);
  const [contentVi, setContentVi] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [contentKo, setContentKo] = useState("");
  const [visibilityManagerOnly, setVisibilityManagerOnly] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxLen = useMemo(() => Math.max(contentVi.length, contentEn.length, contentKo.length), [contentVi, contentEn, contentKo]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/hr/incidents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId, type, originalLang,
          contentVi: contentVi || null, contentEn: contentEn || null, contentKo: contentKo || null,
          visibilityManagerOnly,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.details?.message ?? "저장 실패"); return; }
      router.push("/hr/incidents"); router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">작성자는 현재 로그인 사용자. 최소 한 언어로 <strong>50자 이상</strong> 서술. 대상자 본인은 기본 비공개.</Note>
      <Row>
        <Field label="대상자" required><Select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="선택" options={subjectOptions} /></Field>
        <Field label="유형" required width="180px">
          <Select required value={type} onChange={(e) => setType(e.target.value)} options={[
            { value: "PRAISE", label: "칭찬" },
            { value: "IMPROVEMENT", label: "개선 필요" },
          ]} />
        </Field>
        <Field label="기본 언어" required width="160px">
          <Select required value={originalLang} onChange={(e) => setOriginalLang(e.target.value)} options={[
            { value: "VI", label: "Tiếng Việt" }, { value: "KO", label: "한국어" }, { value: "EN", label: "English" },
          ]} />
        </Field>
      </Row>
      <Row><Field label="내용 (VI)"><Textarea rows={4} value={contentVi} onChange={(e) => setContentVi(e.target.value)} /></Field></Row>
      <Row><Field label="내용 (KO)"><Textarea rows={4} value={contentKo} onChange={(e) => setContentKo(e.target.value)} /></Field></Row>
      <Row><Field label="내용 (EN)"><Textarea rows={4} value={contentEn} onChange={(e) => setContentEn(e.target.value)} /></Field></Row>
      <Row>
        <Field label="공개 범위" width="220px">
          <Checkbox checked={visibilityManagerOnly} onChange={(e) => setVisibilityManagerOnly(e.target.checked)} label="관리자만 열람" />
        </Field>
        <div className="flex items-end pb-1 text-[12px] text-[color:var(--tts-muted)]">최장 서술 길이: <span className={`ml-1 font-bold ${maxLen >= 50 ? "text-[color:var(--tts-success)]" : "text-[color:var(--tts-danger)]"}`}>{maxLen}자</span> / 50자</div>
      </Row>
      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting || maxLen < 50}>{submitting ? "저장 중..." : "사건 등록"}</Button><Button type="button" variant="ghost" onClick={() => router.push("/hr/incidents")}>취소</Button></div>
    </form>
  );
}
