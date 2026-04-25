"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ExcelDownload, Field, Note, Select, TextInput, Textarea } from "@/components/ui";

export type TaskRow = {
  id: string;
  taskCode: string;
  registeredAt: string;
  writer: { code: string; name: string };
  assignee: { code: string; name: string };
  title: string;
  instructionKo: string | null;
  contentKo: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  status: "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "CANCELLED";
  confirmedAt: string | null;
};

type Option = { id: string; label: string };

export function TasksPanel({
  rows,
  employees,
  canConfirm,
}: {
  rows: TaskRow[];
  employees: Option[];
  canConfirm: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [contentDraft, setContentDraft] = useState<Record<string, string>>({});

  const [writerId, setWriterId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");

  async function createTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!writerId || !assigneeId || !title) { setError("작성자/이행자/제목 필수"); return; }
    const res = await fetch("/api/weekly-report/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/" + "json" },
      credentials: "same-origin",
      body: JSON.stringify({
        writerId, assigneeId, title,
        instructionKo: instruction || null, instructionLang: "KO",
        expectedEndDate: expectedEndDate || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(()=>({}));
      setError(j.error ?? "등록 실패");
      return;
    }
    setShowForm(false);
    setWriterId(""); setAssigneeId(""); setTitle(""); setInstruction(""); setExpectedEndDate("");
    startTransition(() => router.refresh());
  }

  async function updateContent(taskId: string) {
    const text = (contentDraft[taskId] ?? "").trim();
    if (!text) return;
    const res = await fetch(`/api/weekly-report/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/" + "json" },
      credentials: "same-origin",
      body: JSON.stringify({ contentKo: text, contentLang: "KO" }),
    });
    if (res.ok) {
      setContentDraft((d) => ({ ...d, [taskId]: "" }));
      startTransition(() => router.refresh());
    } else {
      setError("업무내용 추가 실패");
    }
  }

  async function markCompleted(taskId: string) {
    const res = await fetch(`/api/weekly-report/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/" + "json" },
      credentials: "same-origin",
      body: JSON.stringify({ status: "COMPLETED", actualEndDate: new Date().toISOString() }),
    });
    if (res.ok) startTransition(() => router.refresh());
    else setError("완료 처리 실패");
  }

  async function confirmRow(id: string) {
    const res = await fetch(`/api/weekly-report/tasks/${id}/confirm`, { method: "POST", credentials: "same-origin" });
    if (res.ok) startTransition(() => router.refresh());
    else setError("CFM 실패");
  }

  function statusBadge(s: TaskRow["status"]) {
    if (s === "COMPLETED") return <Badge tone="success">🟢 완료</Badge>;
    if (s === "OVERDUE") return <Badge tone="danger">🔴 기한초과</Badge>;
    if (s === "CANCELLED") return <Badge tone="neutral">취소</Badge>;
    return <Badge tone="warn">🟡 진행중</Badge>;
  }

  return (
    <div>
      <div className="mb-3 flex justify-between gap-2">
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "취소" : "+ 등록"}</Button>
        <ExcelDownload
          rows={rows.map((r) => ({
            registeredAt: r.registeredAt.slice(0, 10),
            writer: `${r.writer.code} · ${r.writer.name}`,
            assignee: `${r.assignee.code} · ${r.assignee.name}`,
            title: r.title,
            instruction: r.instructionKo ?? "",
            content: r.contentKo ?? "",
            expectedEndDate: r.expectedEndDate ? r.expectedEndDate.slice(0, 10) : "",
            actualEndDate: r.actualEndDate ? r.actualEndDate.slice(0, 10) : "",
            status: r.status,
          }))}
          columns={[
            { key: "registeredAt", header: "등록일" },
            { key: "writer", header: "작성자" },
            { key: "assignee", header: "이행자" },
            { key: "title", header: "제목" },
            { key: "instruction", header: "지시사항" },
            { key: "content", header: "업무내용" },
            { key: "expectedEndDate", header: "예상종료" },
            { key: "actualEndDate", header: "실제종료" },
            { key: "status", header: "상태" },
          ]}
          filename={`weekly-tasks-${new Date().toISOString().slice(0, 10)}.xlsx`}
        />
      </div>

      {error && <Note tone="danger">{error}</Note>}

      {showForm && (
        <form onSubmit={createTask} className="mb-4 grid grid-cols-2 gap-3 rounded-md border border-[color:var(--tts-border)] p-3">
          <Field label="작성자"><Select
            value={writerId}
            onChange={(e) => setWriterId(e.target.value)}
            placeholder="선택"
            options={employees.map((e) => ({ value: e.id, label: e.label }))}
          /></Field>
          <Field label="이행자"><Select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            placeholder="선택"
            options={employees.map((e) => ({ value: e.id, label: e.label }))}
          /></Field>
          <Field label="제목" className="col-span-2"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="지시사항 (한국어, 자동 3언어 번역)" className="col-span-2"><Textarea rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} /></Field>
          <Field label="예상종료일"><TextInput type="date" value={expectedEndDate} onChange={(e) => setExpectedEndDate(e.target.value)} /></Field>
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="submit" disabled={pending}>{pending ? "..." : "저장"}</Button>
          </div>
        </form>
      )}

      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[color:var(--tts-muted)]">
            <th className="py-1">등록일</th><th>작성자</th><th>이행자</th><th>제목</th>
            <th>예상종료</th><th>실제종료</th><th>상태</th><th>CFM</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={9} className="py-3 text-center text-[color:var(--tts-muted)]">등록된 업무 없음</td></tr>
          )}
          {rows.map((r) => (
            <>
              <tr key={r.id} className="border-t border-[color:var(--tts-line)] hover:bg-[color:var(--tts-row-hover,rgba(255,255,255,0.03))]">
                <td className="py-1.5 font-mono text-[11px]">{r.registeredAt.slice(0, 10)}</td>
                <td className="text-[12px]">{r.writer.name}</td>
                <td className="text-[12px]">{r.assignee.name}</td>
                <td className="text-[12px]">{r.title}</td>
                <td className="font-mono text-[11px]">{r.expectedEndDate ? r.expectedEndDate.slice(0, 10) : "—"}</td>
                <td className="font-mono text-[11px]">{r.actualEndDate ? r.actualEndDate.slice(0, 10) : "—"}</td>
                <td>{statusBadge(r.status)}</td>
                <td>
                  {r.confirmedAt ? <span title={r.confirmedAt}>✅</span> : (
                    canConfirm
                      ? <button type="button" onClick={() => confirmRow(r.id)} className="text-[color:var(--tts-primary)] hover:underline">⬜</button>
                      : <span>⬜</span>
                  )}
                </td>
                <td>
                  <button type="button" onClick={() => setOpenDetail(openDetail === r.id ? null : r.id)} className="text-[11px] text-[color:var(--tts-primary)] hover:underline">
                    {openDetail === r.id ? "접기" : "▶ 상세"}
                  </button>
                </td>
              </tr>
              {openDetail === r.id && (
                <tr key={r.id + "-d"} className="bg-[color:var(--tts-row-hover,rgba(255,255,255,0.02))]">
                  <td colSpan={9} className="px-3 py-2">
                    <div className="space-y-1.5 text-[12px]">
                      {r.instructionKo && <div><span className="font-bold">지시사항:</span> {r.instructionKo}</div>}
                      {r.contentKo && (
                        <div>
                          <span className="font-bold">업무내용:</span>
                          <pre className="mt-1 whitespace-pre-wrap text-[11px]">{r.contentKo}</pre>
                        </div>
                      )}
                      <div className="mt-2 flex gap-2">
                        <input
                          className="flex-1 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-bg)] px-2 py-1 text-[12px]"
                          placeholder="업무내용 추가 (한국어, 자동 3언어 번역, 누적)"
                          value={contentDraft[r.id] ?? ""}
                          onChange={(e) => setContentDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                        />
                        <Button onClick={() => updateContent(r.id)} disabled={pending}>+ 추가</Button>
                        {r.status === "IN_PROGRESS" && (
                          <Button onClick={() => markCompleted(r.id)} disabled={pending}>✓ 완료</Button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
