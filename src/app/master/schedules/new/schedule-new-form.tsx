"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Props = { employeeOptions: { value: string; label: string }[]; lang: Lang };

export function ScheduleNewForm({ employeeOptions, lang }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [repeatCron, setRepeatCron] = useState("");
  const [alertBeforeHours, setAlertBeforeHours] = useState("24");
  const [relatedModule, setRelatedModule] = useState("");
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [reporterIds, setReporterIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/master/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, dueAt,
          repeatCron: repeatCron || null,
          alertBeforeHours,
          relatedModule: relatedModule || null,
          targetEmployeeIds: targetIds,
          reporterEmployeeIds: reporterIds,
        }),
      });
      if (!res.ok) { setError(t("msg.saveFailedGeneric", lang)); return; }
      router.push("/master/schedules");
      router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">{t("note.scheduleAuto", lang)}<span className="font-mono">SCH-YYMMDD-###</span>{t("note.scheduleAutoSuffix", lang)}</Note>
      <Row>
        <Field label={t("field.titleRequired", lang)} required><TextInput required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label={t("field.dueAtField", lang)} required width="220px"><TextInput type="datetime-local" required value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={t("field.repeatCronOpt", lang)} width="200px" hint={t("hint.cronExample", lang)}><TextInput value={repeatCron} onChange={(e) => setRepeatCron(e.target.value)} /></Field>
        <Field label={t("field.alertHours", lang)} width="160px"><TextInput type="number" value={alertBeforeHours} onChange={(e) => setAlertBeforeHours(e.target.value)} /></Field>
        <Field label={t("field.relatedModule", lang)} width="200px"><TextInput value={relatedModule} onChange={(e) => setRelatedModule(e.target.value)} placeholder="as / calibration ..." /></Field>
      </Row>
      <Row>
        <Field label={t("field.targetEmployees", lang)}>
          <select multiple value={targetIds} onChange={(e) => setTargetIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px]" size={5}>
            {employeeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label={t("field.reporterEmployees", lang)}>
          <select multiple value={reporterIds} onChange={(e) => setReporterIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px]" size={5}>
            {employeeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </Row>
      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting}>{submitting ? t("action.saving", lang) : t("btn.scheduleRegister", lang)}</Button><Button type="button" variant="ghost" onClick={() => router.push("/master/schedules")}>{t("action.cancel", lang)}</Button></div>
    </form>
  );
}
