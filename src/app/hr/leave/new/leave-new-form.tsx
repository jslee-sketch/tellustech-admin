"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput, Textarea } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

const LEAVE_TYPES = [
  { value: "LT", label: "LT · 연차" }, { value: "P", label: "P · 병가" }, { value: "KSX", label: "KSX · 결근" },
  { value: "CT7", label: "CT7 · 출장" }, { value: "DB", label: "DB" }, { value: "TS", label: "TS · 시용" },
  { value: "KL", label: "KL · 결혼" }, { value: "X", label: "X · 기타" },
];

export function LeaveNewForm({ employees, lang }: { employees: { value: string; label: string }[]; lang: Lang }) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState("LT");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/hr/leave", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, leaveType, startDate, endDate, reason: reason || null }),
      });
      if (!res.ok) { setError(t("msg.saveFailedGeneric", lang)); return; }
      router.push("/hr/leave"); router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">{t("note.leaveAuto", lang)}<span className="font-mono">LV-YYMMDD-###</span>{t("note.leaveAutoSuffix", lang)}</Note>
      <Row>
        <Field label={t("label.empLabel", lang)} required><Select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder={t("placeholder.select", lang)} options={employees} /></Field>
        <Field label={t("field.leaveTypeRequired", lang)} required width="200px"><Select required value={leaveType} onChange={(e) => setLeaveType(e.target.value)} options={LEAVE_TYPES} /></Field>
      </Row>
      <Row>
        <Field label={t("field.startDateField", lang)} required width="200px"><TextInput type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <Field label={t("field.endDateField", lang)} required width="200px"><TextInput type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
      </Row>
      <Row><Field label={t("field.reasonOpt", lang)}><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field></Row>
      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting}>{submitting ? t("action.saving", lang) : t("btn.leaveSubmit", lang)}</Button><Button type="button" variant="ghost" onClick={() => router.push("/hr/leave")}>{t("action.cancel", lang)}</Button></div>
    </form>
  );
}
