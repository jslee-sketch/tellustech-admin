"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput, Textarea } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export function PortalAsRequestForm({ clientId, defaultLang, lang }: { clientId: string; defaultLang: string; lang: Lang }) {
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
      const res = await fetch("/api/portal/as-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serialNumber: serialNumber || null,
          originalLang,
          symptomVi: symptomVi || null,
          symptomEn: symptomEn || null,
          symptomKo: symptomKo || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(t("msg.asReqFailed", lang));
        return;
      }
      setDone(body.ticket?.ticketNumber ?? "OK");
      setSerialNumber(""); setSymptomVi(""); setSymptomEn(""); setSymptomKo("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">{t("note.asPortalNote", lang)}</Note>
      {done && (
        <div className="my-3 rounded-md bg-[color:var(--tts-success-dim)] px-3 py-2 text-[color:var(--tts-success)]">
          {t("msg.asReceived", lang).replace("{num}", done)}
        </div>
      )}
      <Row>
        <Field label={t("field.equipSnOpt", lang)}>
          <TextInput value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="SN-..." />
        </Field>
        <Field label={t("field.defaultLang", lang)} required width="160px">
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
        <Field label={t("field.symptomVi", lang)}>
          <Textarea rows={3} value={symptomVi} onChange={(e) => setSymptomVi(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.symptomKo", lang)}>
          <Textarea rows={3} value={symptomKo} onChange={(e) => setSymptomKo(e.target.value)} />
        </Field>
        <Field label={t("field.symptomEn", lang)}>
          <Textarea rows={3} value={symptomEn} onChange={(e) => setSymptomEn(e.target.value)} />
        </Field>
      </Row>
      {error && <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3">
        <Button type="submit" disabled={submitting}>{submitting ? t("btn.asReceiving", lang) : t("btn.asReceive", lang)}</Button>
      </div>
    </form>
  );
}
