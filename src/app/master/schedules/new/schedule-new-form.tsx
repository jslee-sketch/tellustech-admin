"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput } from "@/components/ui";

type Props = { employeeOptions: { value: string; label: string }[] };

export function ScheduleNewForm({ employeeOptions }: Props) {
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
      if (!res.ok) { setError("저장 실패"); return; }
      router.push("/master/schedules");
      router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">코드는 저장 시 <span className="font-mono">SCH-YYMMDD-###</span> 자동 발급. 대상/보고자는 Ctrl/Cmd 누른 채 다중 선택.</Note>
      <Row>
        <Field label="제목" required><TextInput required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="마감일시" required width="220px"><TextInput type="datetime-local" required value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label="반복 cron (옵션)" width="200px" hint="예: 0 0 1 * *"><TextInput value={repeatCron} onChange={(e) => setRepeatCron(e.target.value)} /></Field>
        <Field label="사전알림 (시간)" width="160px"><TextInput type="number" value={alertBeforeHours} onChange={(e) => setAlertBeforeHours(e.target.value)} /></Field>
        <Field label="연관 모듈" width="200px"><TextInput value={relatedModule} onChange={(e) => setRelatedModule(e.target.value)} placeholder="as / calibration ..." /></Field>
      </Row>
      <Row>
        <Field label="대상 직원 (Ctrl+클릭 다중)">
          <select multiple value={targetIds} onChange={(e) => setTargetIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px]" size={5}>
            {employeeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="보고 대상 (Ctrl+클릭 다중)">
          <select multiple value={reporterIds} onChange={(e) => setReporterIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px]" size={5}>
            {employeeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </Row>
      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting}>{submitting ? "저장 중..." : "일정 등록"}</Button><Button type="button" variant="ghost" onClick={() => router.push("/master/schedules")}>취소</Button></div>
    </form>
  );
}
