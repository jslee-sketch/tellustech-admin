"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Note, SectionTitle, Select, Textarea } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Equipment = { sn: string; itemCode: string; itemName: string; contractCode: string; contractKind: "IT"|"TM" };

export function PortalAsRequestForm({ lang }: { clientId?: string; lang: Lang }) {
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [serialNumber, setSerialNumber] = useState("");
  const [originalLang, setOriginalLang] = useState<"VI"|"KO"|"EN">(lang);
  const [symptomVi, setSymptomVi] = useState("");
  const [symptomEn, setSymptomEn] = useState("");
  const [symptomKo, setSymptomKo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    fetch("/api/portal/my-equipment").then(r => r.json()).then(j => {
      setEquipment(j?.equipment ?? []);
    });
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/portal/as-request", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          serialNumber: serialNumber || null,
          originalLang,
          symptomVi: symptomVi || null,
          symptomEn: symptomEn || null,
          symptomKo: symptomKo || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setError(t("msg.asReqFailed", lang)); return; }
      setDone(body.ticket?.ticketNumber ?? "OK");
      setSerialNumber(""); setSymptomVi(""); setSymptomEn(""); setSymptomKo("");
      router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <Card title={t("page.portal.asRequest", lang)}>
      <Note tone="info">{t("portal.asGuideShort", lang)}</Note>
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <Field label={t("portal.equipmentSn", lang)} required>
          <Select required value={serialNumber} onChange={(e)=>setSerialNumber(e.target.value)}
            options={[
              { value:"", label: t("placeholder.select", lang) },
              ...equipment.map(eq => ({ value: eq.sn, label: `${eq.sn} · ${eq.itemCode} ${eq.itemName} (${eq.contractCode})` })),
            ]}
          />
          <div className="mt-1 text-[11px] text-[color:var(--tts-muted)]">
            {equipment.length === 0 ? t("portal.asReq.noEquipment", lang) : t("portal.asReq.equipmentCount", lang).replace("{n}", String(equipment.length))}
          </div>
        </Field>

        <SectionTitle title={t("portal.symptom", lang)} />
        <Field label={t("field.originalLang", lang)} required>
          <Select required value={originalLang} onChange={(e)=>setOriginalLang(e.target.value as "VI"|"KO"|"EN")}
            options={[{value:"VI",label:"Tiếng Việt"},{value:"KO",label:"한국어"},{value:"EN",label:"English"}]} />
        </Field>
        <Field label={t("portal.asReq.symptomVi", lang)}><Textarea rows={2} value={symptomVi} onChange={(e)=>setSymptomVi(e.target.value)} /></Field>
        <Field label={t("portal.asReq.symptomKo", lang)}><Textarea rows={2} value={symptomKo} onChange={(e)=>setSymptomKo(e.target.value)} /></Field>
        <Field label={t("portal.asReq.symptomEn", lang)}><Textarea rows={2} value={symptomEn} onChange={(e)=>setSymptomEn(e.target.value)} /></Field>

        {error && <div className="rounded bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
        {done && <div className="rounded bg-[color:var(--tts-success-dim,rgba(34,197,94,.12))] px-3 py-2 text-[12px] text-[color:var(--tts-success)]">{t("portal.asReq.done", lang).replace("{n}", done)}</div>}
        <Button type="submit" disabled={submitting}>{submitting ? t("portal.asReq.sending", lang) : t("portal.asReq.submit", lang)}</Button>
      </form>
    </Card>
  );
}
