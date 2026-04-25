"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button, Checkbox, Field, Note, Row, Select, Textarea } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export function IncidentNewForm({ defaultLang, subjectOptions, lang }: { defaultLang: string; subjectOptions: { value: string; label: string }[]; lang: Lang }) {
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
      if (!res.ok) { setError(body.details?.message ?? t("msg.saveFailedGeneric", lang)); return; }
      router.push("/hr/incidents"); router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">{t("note.incidentRules", lang)}<strong>50</strong>{t("note.incidentRulesSuffix", lang)}</Note>
      <Row>
        <Field label={t("field.subjectRequired", lang)} required><Select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder={t("placeholder.select", lang)} options={subjectOptions} /></Field>
        <Field label={t("field.typeRequired", lang)} required width="180px">
          <Select required value={type} onChange={(e) => setType(e.target.value)} options={[
            { value: "PRAISE", label: t("incidentNeedy.PRAISE", lang) },
            { value: "IMPROVEMENT", label: t("incidentNeedy.IMPROVEMENT", lang) },
          ]} />
        </Field>
        <Field label={t("field.defaultLang", lang)} required width="160px">
          <Select required value={originalLang} onChange={(e) => setOriginalLang(e.target.value)} options={[
            { value: "VI", label: "Tiếng Việt" }, { value: "KO", label: "한국어" }, { value: "EN", label: "English" },
          ]} />
        </Field>
      </Row>
      <Row><Field label={t("field.contentVi", lang)}><Textarea rows={4} value={contentVi} onChange={(e) => setContentVi(e.target.value)} /></Field></Row>
      <Row><Field label={t("field.contentKo", lang)}><Textarea rows={4} value={contentKo} onChange={(e) => setContentKo(e.target.value)} /></Field></Row>
      <Row><Field label={t("field.contentEn", lang)}><Textarea rows={4} value={contentEn} onChange={(e) => setContentEn(e.target.value)} /></Field></Row>
      <Row>
        <Field label={t("field.visibility", lang)} width="220px">
          <Checkbox checked={visibilityManagerOnly} onChange={(e) => setVisibilityManagerOnly(e.target.checked)} label={t("label.adminOnly", lang)} />
        </Field>
        <div className="flex items-end pb-1 text-[12px] text-[color:var(--tts-muted)]">{t("label.maxContentLen", lang).replace("{len}", String(maxLen)).replace("{min}", "50")}</div>
      </Row>
      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting || maxLen < 50}>{submitting ? t("action.saving", lang) : t("btn.incidentRegister", lang)}</Button><Button type="button" variant="ghost" onClick={() => router.push("/hr/incidents")}>{t("action.cancel", lang)}</Button></div>
    </form>
  );
}
