"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput, Textarea } from "@/components/ui";

export function PortalAsRequestForm({ clientId, defaultLang }: { clientId: string; defaultLang: string }) {
  const router = useRouter();
  const [serialNumber, setSerialNumber] = useState("");
  const [originalLang, setOriginalLang] = useState(defaultLang);
  const [symptomVi, setSymptomVi] = useState("");
  const [symptomEn, setSymptomEn] = useState("");
  const [symptomKo, setSymptomKo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/as-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          serialNumber: serialNumber || null,
          originalLang,
          symptomVi: symptomVi || null,
          symptomEn: symptomEn || null,
          symptomKo: symptomKo || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError("요청 저장 실패");
        return;
      }
      setDone(body.ticket?.ticketNumber ?? "접수됨");
      setSerialNumber(""); setSymptomVi(""); setSymptomEn(""); setSymptomKo("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">장비 S/N(선택)과 증상을 입력해 주세요. 접수 후 담당 엔지니어가 연락드립니다.</Note>
      {done && (
        <div className="my-3 rounded-md bg-[color:var(--tts-success-dim)] px-3 py-2 text-[color:var(--tts-success)]">
          ✅ 접수 완료 — 전표번호 {done}
        </div>
      )}
      <Row>
        <Field label="장비 S/N (옵션)">
          <TextInput value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="SN-..." />
        </Field>
        <Field label="기본 언어" required width="160px">
          <Select
            required
            value={originalLang}
            onChange={(e) => setOriginalLang(e.target.value)}
            options={[
              { value: "VI", label: "Tiếng Việt" },
              { value: "KO", label: "한국어" },
              { value: "EN", label: "English" },
            ]}
          />
        </Field>
      </Row>
      <Row>
        <Field label="증상 (VI)">
          <Textarea rows={3} value={symptomVi} onChange={(e) => setSymptomVi(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="증상 (KO)">
          <Textarea rows={3} value={symptomKo} onChange={(e) => setSymptomKo(e.target.value)} />
        </Field>
        <Field label="증상 (EN)">
          <Textarea rows={3} value={symptomEn} onChange={(e) => setSymptomEn(e.target.value)} />
        </Field>
      </Row>
      {error && <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3">
        <Button type="submit" disabled={submitting}>{submitting ? "접수 중..." : "AS 접수"}</Button>
      </div>
    </form>
  );
}
