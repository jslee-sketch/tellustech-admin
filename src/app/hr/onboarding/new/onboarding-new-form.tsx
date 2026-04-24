"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, SignatureCanvas, TextInput, Textarea } from "@/components/ui";

export function OnboardingNewForm({ employees }: { employees: { value: string; label: string }[] }) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [personal, setPersonal] = useState({ fullName: "", idNumber: "", birthDate: "", address: "", emergencyContact: "" });
  const [education, setEducation] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadPhoto(file: File) {
    const fd = new FormData();
    fd.append("file", file); fd.append("category", "PHOTO");
    const res = await fetch("/api/files", { method: "POST", body: fd });
    if (res.ok) {
      const d = await res.json() as { id: string };
      setPhotoId(d.id); setPhotoName(file.name);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/hr/onboarding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          personalInfo: personal,
          education: education ? { text: education } : null,
          consentSignature: signature,
          profilePhotoId: photoId,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.details?.message ?? "저장 실패"); return; }
      router.push("/hr/onboarding"); router.refresh();
    } finally { setSubmitting(false); }
  }

  const setP = <K extends keyof typeof personal>(k: K, v: typeof personal[K]) => setPersonal((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">코드 자동 발급 <span className="font-mono">ONB-YYMMDD-###</span>. 이미 입사카드가 있는 직원은 목록에서 제외.</Note>
      <SectionTitle icon="👤" title="직원 선택" />
      <Row><Field label="직원" required><Select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="선택" options={employees} /></Field></Row>
      <SectionTitle icon="📇" title="개인 정보" />
      <Row>
        <Field label="성명"><TextInput value={personal.fullName} onChange={(e) => setP("fullName", e.target.value)} /></Field>
        <Field label="신분증 번호"><TextInput value={personal.idNumber} onChange={(e) => setP("idNumber", e.target.value)} /></Field>
        <Field label="생년월일" width="200px"><TextInput type="date" value={personal.birthDate} onChange={(e) => setP("birthDate", e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label="주소"><TextInput value={personal.address} onChange={(e) => setP("address", e.target.value)} /></Field>
        <Field label="비상연락처"><TextInput value={personal.emergencyContact} onChange={(e) => setP("emergencyContact", e.target.value)} /></Field>
      </Row>
      <SectionTitle icon="🎓" title="학력·경력" />
      <Row><Field label="내용 (자유서술)"><Textarea rows={3} value={education} onChange={(e) => setEducation(e.target.value)} placeholder="학력 / 이전 경력 / 자격증 등" /></Field></Row>
      <SectionTitle icon="🖼️" title="증명사진" />
      <Row>
        <Field label="사진">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
            📎 {photoName || "사진 선택"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} />
          </label>
        </Field>
      </Row>
      <SectionTitle icon="✍️" title="동의서 서명" />
      <SignatureCanvas value={signature} onChange={setSignature} />
      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting}>{submitting ? "저장 중..." : "입사카드 등록"}</Button><Button type="button" variant="ghost" onClick={() => router.push("/hr/onboarding")}>취소</Button></div>
    </form>
  );
}
