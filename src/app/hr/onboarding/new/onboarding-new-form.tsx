"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, SignatureCanvas, TextInput, Textarea } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export function OnboardingNewForm({ employees, lang }: { employees: { value: string; label: string }[]; lang: Lang }) {
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
      if (!res.ok) { setError(body.details?.message ?? t("msg.saveFailedGeneric", lang)); return; }
      router.push("/hr/onboarding"); router.refresh();
    } finally { setSubmitting(false); }
  }

  const setP = <K extends keyof typeof personal>(k: K, v: typeof personal[K]) => setPersonal((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">{t("note.onboardingAuto", lang)}<span className="font-mono">ONB-YYMMDD-###</span>{t("note.onboardingAutoSuffix", lang)}</Note>
      <SectionTitle icon="👤" title={t("section.empSelect", lang)} />
      <Row><Field label={t("label.empLabel", lang)} required><Select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder={t("placeholder.select", lang)} options={employees} /></Field></Row>
      <SectionTitle icon="📇" title={t("section.personalInfo", lang)} />
      <Row>
        <Field label={t("field.fullName", lang)}><TextInput value={personal.fullName} onChange={(e) => setP("fullName", e.target.value)} /></Field>
        <Field label={t("field.idNumber", lang)}><TextInput value={personal.idNumber} onChange={(e) => setP("idNumber", e.target.value)} /></Field>
        <Field label={t("field.birthDate", lang)} width="200px"><TextInput type="date" value={personal.birthDate} onChange={(e) => setP("birthDate", e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={t("field.address", lang)}><TextInput value={personal.address} onChange={(e) => setP("address", e.target.value)} /></Field>
        <Field label={t("field.emergencyContact", lang)}><TextInput value={personal.emergencyContact} onChange={(e) => setP("emergencyContact", e.target.value)} /></Field>
      </Row>
      <SectionTitle icon="🎓" title={t("section.educationCareer", lang)} />
      <Row><Field label={t("field.eduFreeText", lang)}><Textarea rows={3} value={education} onChange={(e) => setEducation(e.target.value)} placeholder={t("placeholder.eduExample", lang)} /></Field></Row>
      <SectionTitle icon="🖼️" title={t("section.idPhotoSection", lang)} />
      <Row>
        <Field label={t("field.photoLbl", lang)}>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
            📎 {photoName || t("btn.selectPhotoPrompt", lang)}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} />
          </label>
        </Field>
      </Row>
      <SectionTitle icon="✍️" title={t("section.consentSig", lang)} />
      <SignatureCanvas value={signature} onChange={setSignature} />
      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting}>{submitting ? t("action.saving", lang) : t("btn.onboardingRegister", lang)}</Button><Button type="button" variant="ghost" onClick={() => router.push("/hr/onboarding")}>{t("action.cancel", lang)}</Button></div>
    </form>
  );
}
