"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ExcelDownload, Field, Note, Select, TextInput } from "@/components/ui";

export type BacklogRow = {
  id: string;
  backlogCode: string;
  registeredAt: string;
  salesType: "SALES" | "PURCHASE";
  client: { code: string; name: string };
  salesEmployee: { code: string; name: string } | null;
  representativeItem: string | null;
  amount: string | null;
  currency: string;
  status: "OPEN" | "CLOSE" | "NG";
  expectedCloseDate: string | null;
  confirmedAt: string | null;
  histories: { id: string; date: string; ko: string | null; vi: string | null; en: string | null }[];
};

type Option = { id: string; label: string };

export function BacklogPanel({
  rows,
  clients,
  employees,
  canConfirm,
}: {
  rows: BacklogRow[];
  clients: Option[];
  employees: Option[];
  canConfirm: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [historyDraft, setHistoryDraft] = useState<Record<string, string>>({});

  // 신규 등록 form 상태
  const [salesType, setSalesType] = useState<"SALES" | "PURCHASE">("SALES");
  const [clientId, setClientId] = useState("");
  const [salesEmployeeId, setSalesEmployeeId] = useState("");
  const [representativeItem, setRepresentativeItem] = useState("");
  const [amount, setAmount] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");

  async function createBacklog(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!clientId) { setError("거래처를 선택하세요."); return; }
    const res = await fetch("/api/weekly-report/backlogs", {
      method: "POST",
      headers: { "Content-Type": "application/" + "json" },
      credentials: "same-origin",
      body: JSON.stringify({
        salesType, clientId, salesEmployeeId: salesEmployeeId || null,
        representativeItem: representativeItem || null,
        amount: amount || null,
        expectedCloseDate: expectedCloseDate || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(()=>({}));
      setError(j.error ?? "등록 실패");
      return;
    }
    setShowForm(false);
    setClientId(""); setSalesEmployeeId(""); setRepresentativeItem(""); setAmount(""); setExpectedCloseDate("");
    startTransition(() => router.refresh());
  }

  async function addHistory(backlogId: string) {
    const text = (historyDraft[backlogId] ?? "").trim();
    if (!text) return;
    const res = await fetch(`/api/weekly-report/backlogs/${backlogId}/histories`, {
      method: "POST",
      headers: { "Content-Type": "application/" + "json" },
      credentials: "same-origin",
      body: JSON.stringify({ contentKo: text, originalLang: "KO" }),
    });
    if (res.ok) {
      setHistoryDraft((d) => ({ ...d, [backlogId]: "" }));
      startTransition(() => router.refresh());
    } else {
      setError("히스토리 추가 실패");
    }
  }

  async function confirmRow(id: string) {
    const res = await fetch(`/api/weekly-report/backlogs/${id}/confirm`, { method: "POST", credentials: "same-origin" });
    if (res.ok) startTransition(() => router.refresh());
    else setError("CFM 실패");
  }

  async function changeStatus(id: string, status: "OPEN" | "CLOSE" | "NG") {
    const res = await fetch(`/api/weekly-report/backlogs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/" + "json" },
      credentials: "same-origin",
      body: JSON.stringify({ status }),
    });
    if (res.ok) startTransition(() => router.refresh());
    else setError("상태 변경 실패");
  }

  return (
    <div>
      <div className="mb-3 flex justify-between gap-2">
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "취소" : "+ 등록"}</Button>
        <ExcelDownload
          rows={rows.map((r) => ({
            registeredAt: r.registeredAt.slice(0, 10),
            salesType: r.salesType === "SALES" ? "매출" : "매입",
            client: `${r.client.code} · ${r.client.name}`,
            sales: r.salesEmployee ? `${r.salesEmployee.code} · ${r.salesEmployee.name}` : "",
            item: r.representativeItem ?? "",
            amount: r.amount ? Number(r.amount) : 0,
            status: r.status,
            expectedCloseDate: r.expectedCloseDate ? r.expectedCloseDate.slice(0, 10) : "",
            recentHistory: r.histories[0]?.ko ?? "",
          }))}
          columns={[
            { key: "registeredAt", header: "등록일" },
            { key: "salesType", header: "구분" },
            { key: "client", header: "고객" },
            { key: "sales", header: "영업담당" },
            { key: "item", header: "대표품목" },
            { key: "amount", header: "금액" },
            { key: "status", header: "상태" },
            { key: "expectedCloseDate", header: "예상마감" },
            { key: "recentHistory", header: "최근히스토리" },
          ]}
          filename={`weekly-backlogs-${new Date().toISOString().slice(0, 10)}.xlsx`}
        />
      </div>

      {error && <Note tone="danger">{error}</Note>}

      {showForm && (
        <form onSubmit={createBacklog} className="mb-4 grid grid-cols-2 gap-3 rounded-md border border-[color:var(--tts-border)] p-3">
          <Field label="구분"><Select
            value={salesType}
            onChange={(e) => setSalesType(e.target.value as "SALES" | "PURCHASE")}
            options={[{ value: "SALES", label: "매출" }, { value: "PURCHASE", label: "매입" }]}
          /></Field>
          <Field label="거래처"><Select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="선택"
            options={clients.map((c) => ({ value: c.id, label: c.label }))}
          /></Field>
          <Field label="영업담당"><Select
            value={salesEmployeeId}
            onChange={(e) => setSalesEmployeeId(e.target.value)}
            placeholder="선택 안 함"
            options={employees.map((e) => ({ value: e.id, label: e.label }))}
          /></Field>
          <Field label="대표품목"><TextInput value={representativeItem} onChange={(e) => setRepresentativeItem(e.target.value)} /></Field>
          <Field label="금액 (VND)"><TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="예상마감일"><TextInput type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} /></Field>
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="submit" disabled={pending}>{pending ? "..." : "저장"}</Button>
          </div>
        </form>
      )}

      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[color:var(--tts-muted)]">
            <th className="py-1">등록일</th><th>구분</th><th>고객</th><th>영업</th><th>품목</th>
            <th className="text-right">금액</th><th>상태</th><th>예상마감</th><th>CFM</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={10} className="py-3 text-center text-[color:var(--tts-muted)]">등록된 Backlog 없음</td></tr>
          )}
          {rows.map((r) => (
            <>
              <tr key={r.id} className="border-t border-[color:var(--tts-line)] hover:bg-[color:var(--tts-row-hover,rgba(255,255,255,0.03))]">
                <td className="py-1.5 font-mono text-[11px]">{r.registeredAt.slice(0, 10)}</td>
                <td>{r.salesType === "SALES" ? "매출" : "매입"}</td>
                <td className="text-[12px]">{r.client.code} · {r.client.name}</td>
                <td className="text-[12px]">{r.salesEmployee ? r.salesEmployee.name : "—"}</td>
                <td className="text-[12px]">{r.representativeItem ?? "—"}</td>
                <td className="text-right font-mono text-[12px]">{r.amount ? Number(r.amount).toLocaleString() : "—"}</td>
                <td>{r.status === "OPEN" ? <Badge tone="success">🟢 Open</Badge> : r.status === "NG" ? <Badge tone="danger">🔴 NG</Badge> : <Badge tone="neutral">Close</Badge>}</td>
                <td className="font-mono text-[11px]">{r.expectedCloseDate ? r.expectedCloseDate.slice(0, 10) : "—"}</td>
                <td>
                  {r.confirmedAt ? <span title={r.confirmedAt}>✅</span> : (
                    canConfirm
                      ? <button type="button" onClick={() => confirmRow(r.id)} className="text-[color:var(--tts-primary)] hover:underline">⬜</button>
                      : <span>⬜</span>
                  )}
                </td>
                <td>
                  <button type="button" onClick={() => setOpenHistory(openHistory === r.id ? null : r.id)} className="text-[11px] text-[color:var(--tts-primary)] hover:underline">
                    {openHistory === r.id ? "접기" : `▶ 히스토리 (${r.histories.length})`}
                  </button>
                </td>
              </tr>
              {openHistory === r.id && (
                <tr key={r.id + "-h"} className="bg-[color:var(--tts-row-hover,rgba(255,255,255,0.02))]">
                  <td colSpan={10} className="px-3 py-2">
                    <div className="space-y-2">
                      {/* 상태 변경 버튼 */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[color:var(--tts-muted)]">상태 변경:</span>
                        {(["OPEN", "CLOSE", "NG"] as const).map((s) => {
                          const active = r.status === s;
                          const tone =
                            s === "OPEN"  ? "bg-emerald-600 hover:bg-emerald-500" :
                            s === "CLOSE" ? "bg-slate-500 hover:bg-slate-400" :
                                            "bg-rose-600 hover:bg-rose-500";
                          const label = s === "OPEN" ? "🟢 Open" : s === "CLOSE" ? "Close" : "🔴 NG";
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => changeStatus(r.id, s)}
                              disabled={pending || active}
                              className={
                                "rounded-md px-2 py-0.5 text-[11px] font-bold text-white transition disabled:cursor-not-allowed " +
                                (active ? "opacity-100 ring-2 ring-white/30 " + tone : "opacity-60 " + tone)
                              }
                            >
                              {label}{active ? " ✓" : ""}
                            </button>
                          );
                        })}
                      </div>

                      <div className="border-t border-[color:var(--tts-border)] pt-2">
                        <div className="mb-1 text-[11px] font-bold text-[color:var(--tts-muted)]">히스토리</div>
                        {r.histories.length === 0 && <div className="text-[12px] text-[color:var(--tts-muted)]">히스토리 없음</div>}
                        {r.histories.map((h) => (
                          <div key={h.id} className="text-[12px]">
                            <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{h.date.slice(0, 10)}:</span>{" "}
                            {h.ko ?? h.vi ?? h.en}
                          </div>
                        ))}
                        <div className="mt-2 flex gap-2">
                          <input
                            className="flex-1 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-bg)] px-2 py-1 text-[12px]"
                            placeholder="새 히스토리 (한국어, 자동 3언어 번역)"
                            value={historyDraft[r.id] ?? ""}
                            onChange={(e) => setHistoryDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                          />
                          <Button onClick={() => addHistory(r.id)} disabled={pending}>+ 추가</Button>
                        </div>
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
