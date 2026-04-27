"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ExcelDownload, Field, Note, Select, TextInput, Textarea } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type TaskRow = {
  id: string;
  taskCode: string;
  registeredAt: string;
  writer: { code: string; name: string };
  assignee: { code: string; name: string };
  title: string;
  instructionKo: string | null;
  instructionVi: string | null;
  instructionEn: string | null;
  contentKo: string | null;
  contentVi: string | null;
  contentEn: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  status: "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "CANCELLED";
  confirmedAt: string | null;
};

// 사용자 언어 우선 + fallback (다른 언어 → KO 마지막)
function pick3(rec: { ko: string|null; vi: string|null; en: string|null }, lang: Lang): string {
  const order = lang === "VI" ? [rec.vi, rec.en, rec.ko]
              : lang === "EN" ? [rec.en, rec.vi, rec.ko]
              : [rec.ko, rec.vi, rec.en];
  for (const v of order) if (v && v.trim()) return v;
  return "";
}

type Option = { id: string; label: string };

export function TasksPanel({
  rows,
  employees,
  canConfirm,
  lang,
}: {
  rows: TaskRow[];
  employees: Option[];
  canConfirm: boolean;
  lang: Lang;
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
    if (!writerId || !assigneeId || !title) { setError(t("msg.writerAssigneeTitleRequired", lang)); return; }
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
      setError(j.error ?? t("msg.registerFailed", lang));
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
      setError(t("msg.contentAddFailed", lang));
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
    else setError(t("msg.completeFailed", lang));
  }

  async function confirmRow(id: string) {
    const res = await fetch(`/api/weekly-report/tasks/${id}/confirm`, { method: "POST", credentials: "same-origin" });
    if (res.ok) startTransition(() => router.refresh());
    else setError(t("msg.cfmFailed", lang));
  }

  function statusBadge(s: TaskRow["status"]) {
    if (s === "COMPLETED") return <Badge tone="success">{t("badge.taskCompleted", lang)}</Badge>;
    if (s === "OVERDUE") return <Badge tone="danger">{t("badge.taskOverdue", lang)}</Badge>;
    if (s === "CANCELLED") return <Badge tone="neutral">{t("badge.taskCanceled", lang)}</Badge>;
    return <Badge tone="warn">{t("badge.taskInProgress", lang)}</Badge>;
  }

  return (
    <div>
      <div className="mb-3 flex justify-between gap-2">
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? t("btn.cancelShort", lang) : t("btn.newRegister", lang)}</Button>
        <ExcelDownload
          rows={rows.map((r) => ({
            registeredAt: r.registeredAt.slice(0, 10),
            writer: `${r.writer.code} · ${r.writer.name}`,
            assignee: `${r.assignee.code} · ${r.assignee.name}`,
            title: r.title,
            instruction: pick3({ ko: r.instructionKo, vi: r.instructionVi, en: r.instructionEn }, lang),
            content: pick3({ ko: r.contentKo, vi: r.contentVi, en: r.contentEn }, lang),
            expectedEndDate: r.expectedEndDate ? r.expectedEndDate.slice(0, 10) : "",
            actualEndDate: r.actualEndDate ? r.actualEndDate.slice(0, 10) : "",
            status: r.status,
          }))}
          columns={[
            { key: "registeredAt", header: t("th.registeredAt", lang) },
            { key: "writer", header: t("th.writer", lang) },
            { key: "assignee", header: t("th.assigneeTask", lang) },
            { key: "title", header: t("th.title", lang) },
            { key: "instruction", header: t("label.instructionLabel", lang) },
            { key: "content", header: t("label.contentLabel", lang) },
            { key: "expectedEndDate", header: t("th.expectedClose", lang) },
            { key: "actualEndDate", header: t("th.actualEnd", lang) },
            { key: "status", header: t("th.status", lang) },
          ]}
          filename={`weekly-tasks-${new Date().toISOString().slice(0, 10)}.xlsx`}
        />
      </div>

      {error && <Note tone="danger">{error}</Note>}

      {showForm && (
        <form onSubmit={createTask} className="mb-4 grid grid-cols-2 gap-3 rounded-md border border-[color:var(--tts-border)] p-3">
          <Field label={t("field.writer", lang)}><Select
            value={writerId}
            onChange={(e) => setWriterId(e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={employees.map((e) => ({ value: e.id, label: e.label }))}
          /></Field>
          <Field label={t("field.assigneeTask", lang)}><Select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={employees.map((e) => ({ value: e.id, label: e.label }))}
          /></Field>
          <Field label={t("field.titleField", lang)} className="col-span-2"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label={t("field.instruction", lang)} className="col-span-2"><Textarea rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} /></Field>
          <Field label={t("field.expectedEnd", lang)}><TextInput type="date" value={expectedEndDate} onChange={(e) => setExpectedEndDate(e.target.value)} /></Field>
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="submit" disabled={pending}>{pending ? "..." : t("action.save", lang)}</Button>
          </div>
        </form>
      )}

      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[color:var(--tts-muted)]">
            <th className="py-1">{t("th.registeredAt", lang)}</th><th>{t("th.writer", lang)}</th><th>{t("th.assigneeTask", lang)}</th><th>{t("th.title", lang)}</th>
            <th>{t("th.expectedClose", lang)}</th><th>{t("th.actualEnd", lang)}</th><th>{t("th.status", lang)}</th><th>{t("th.cfm", lang)}</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={9} className="py-3 text-center text-[color:var(--tts-muted)]">{t("empty.tasks", lang)}</td></tr>
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
                    {openDetail === r.id ? t("btn.collapse", lang) : t("btn.taskDetail", lang)}
                  </button>
                </td>
              </tr>
              {openDetail === r.id && (
                <tr key={r.id + "-d"} className="bg-[color:var(--tts-row-hover,rgba(255,255,255,0.02))]">
                  <td colSpan={9} className="px-3 py-2">
                    <div className="space-y-1.5 text-[12px]">
                      {(() => {
                        const ins = pick3({ ko: r.instructionKo, vi: r.instructionVi, en: r.instructionEn }, lang);
                        const con = pick3({ ko: r.contentKo, vi: r.contentVi, en: r.contentEn }, lang);
                        return (
                          <>
                            {ins && <div><span className="font-bold">{t("label.instructionLabel", lang)}</span> {ins}</div>}
                            {con && (
                              <div>
                                <span className="font-bold">{t("label.contentLabel", lang)}</span>
                                <pre className="mt-1 whitespace-pre-wrap text-[11px]">{con}</pre>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      <div className="mt-2 flex gap-2">
                        <input
                          className="flex-1 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-bg)] px-2 py-1 text-[12px]"
                          placeholder={t("placeholder.contentAdd", lang)}
                          value={contentDraft[r.id] ?? ""}
                          onChange={(e) => setContentDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                        />
                        <Button onClick={() => updateContent(r.id)} disabled={pending}>{t("btn.addShort", lang)}</Button>
                        {r.status === "IN_PROGRESS" && (
                          <Button onClick={() => markCompleted(r.id)} disabled={pending}>{t("btn.completeTask", lang)}</Button>
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
