"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ClientCombobox, ExcelDownload, Field, Note, Select, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

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
  lang,
}: {
  rows: BacklogRow[];
  clients: Option[];
  employees: Option[];
  canConfirm: boolean;
  lang: Lang;
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
    if (!clientId) { setError(t("msg.clientRequired", lang)); return; }
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
      setError(j.error ?? t("msg.registerFailed", lang));
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
      setError(t("msg.historyAddFailed", lang));
    }
  }

  async function confirmRow(id: string) {
    const res = await fetch(`/api/weekly-report/backlogs/${id}/confirm`, { method: "POST", credentials: "same-origin" });
    if (res.ok) startTransition(() => router.refresh());
    else setError(t("msg.cfmFailed", lang));
  }

  async function changeStatus(id: string, status: "OPEN" | "CLOSE" | "NG") {
    const res = await fetch(`/api/weekly-report/backlogs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/" + "json" },
      credentials: "same-origin",
      body: JSON.stringify({ status }),
    });
    if (res.ok) startTransition(() => router.refresh());
    else setError(t("msg.statusChangeFailed", lang));
  }

  return (
    <div>
      <div className="mb-3 flex justify-between gap-2">
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? t("btn.cancelShort", lang) : t("btn.newRegister", lang)}</Button>
        <ExcelDownload
          rows={rows.map((r) => ({
            registeredAt: r.registeredAt.slice(0, 10),
            salesType: r.salesType === "SALES" ? t("field.salesTypeSale", lang) : t("field.salesTypePurchase", lang),
            client: `${r.client.code} · ${r.client.name}`,
            sales: r.salesEmployee ? `${r.salesEmployee.code} · ${r.salesEmployee.name}` : "",
            item: r.representativeItem ?? "",
            amount: r.amount ? Number(r.amount) : 0,
            status: r.status,
            expectedCloseDate: r.expectedCloseDate ? r.expectedCloseDate.slice(0, 10) : "",
            recentHistory: r.histories[0]?.ko ?? "",
          }))}
          columns={[
            { key: "registeredAt", header: t("th.registeredAt", lang) },
            { key: "salesType", header: t("th.salesType", lang) },
            { key: "client", header: t("th.client", lang) },
            { key: "sales", header: t("field.salesEmpShort", lang) },
            { key: "item", header: t("field.representativeItem", lang) },
            { key: "amount", header: t("th.amount", lang) },
            { key: "status", header: t("th.status", lang) },
            { key: "expectedCloseDate", header: t("th.expectedClose", lang) },
            { key: "recentHistory", header: t("label.history", lang) },
          ]}
          filename={`weekly-backlogs-${new Date().toISOString().slice(0, 10)}.xlsx`}
        />
      </div>

      {error && <Note tone="danger">{error}</Note>}

      {showForm && (
        <form onSubmit={createBacklog} className="mb-4 grid grid-cols-2 gap-3 rounded-md border border-[color:var(--tts-border)] p-3">
          <Field label={t("field.salesType", lang)}><Select
            value={salesType}
            onChange={(e) => setSalesType(e.target.value as "SALES" | "PURCHASE")}
            options={[{ value: "SALES", label: t("field.salesTypeSale", lang) }, { value: "PURCHASE", label: t("field.salesTypePurchase", lang) }]}
          /></Field>
          <Field label={t("field.client", lang)}>
            <ClientCombobox value={clientId} onChange={setClientId} lang={lang} />
          </Field>
          <Field label={t("field.salesEmpShort", lang)}><Select
            value={salesEmployeeId}
            onChange={(e) => setSalesEmployeeId(e.target.value)}
            placeholder={t("placeholder.notSelected", lang)}
            options={employees.map((e) => ({ value: e.id, label: e.label }))}
          /></Field>
          <Field label={t("field.representativeItem", lang)}><TextInput value={representativeItem} onChange={(e) => setRepresentativeItem(e.target.value)} /></Field>
          <Field label={t("field.amountVndOnly", lang)}><TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label={t("field.expectedClose", lang)}><TextInput type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} /></Field>
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="submit" disabled={pending}>{pending ? "..." : t("action.save", lang)}</Button>
          </div>
        </form>
      )}

      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[color:var(--tts-muted)]">
            <th className="py-1">{t("th.registeredAt", lang)}</th><th>{t("th.salesType", lang)}</th><th>{t("th.client", lang)}</th><th>{t("th.salesRep", lang)}</th><th>{t("th.item", lang)}</th>
            <th className="text-right">{t("th.amount", lang)}</th><th>{t("th.status", lang)}</th><th>{t("th.expectedClose", lang)}</th><th>{t("th.cfm", lang)}</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={10} className="py-3 text-center text-[color:var(--tts-muted)]">{t("empty.backlog", lang)}</td></tr>
          )}
          {rows.map((r) => (
            <>
              <tr key={r.id} className="border-t border-[color:var(--tts-line)] hover:bg-[color:var(--tts-row-hover,rgba(255,255,255,0.03))]">
                <td className="py-1.5 font-mono text-[11px]">{r.registeredAt.slice(0, 10)}</td>
                <td>{r.salesType === "SALES" ? t("field.salesTypeSale", lang) : t("field.salesTypePurchase", lang)}</td>
                <td className="text-[12px]">{r.client.code} · {r.client.name}</td>
                <td className="text-[12px]">{r.salesEmployee ? r.salesEmployee.name : "—"}</td>
                <td className="text-[12px]">{r.representativeItem ?? "—"}</td>
                <td className="text-right font-mono text-[12px]">{r.amount ? Number(r.amount).toLocaleString() : "—"}</td>
                <td>{r.status === "OPEN" ? <Badge tone="danger">{t("badge.openSales", lang)}</Badge> : r.status === "CLOSE" ? <Badge tone="primary">{t("badge.closeSales", lang)}</Badge> : <Badge tone="neutral">{t("badge.ngSales", lang)}</Badge>}</td>
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
                    {openHistory === r.id ? t("btn.collapse", lang) : t("btn.historyExpand", lang).replace("{count}", String(r.histories.length))}
                  </button>
                </td>
              </tr>
              {openHistory === r.id && (
                <tr key={r.id + "-h"} className="bg-[color:var(--tts-row-hover,rgba(255,255,255,0.02))]">
                  <td colSpan={10} className="px-3 py-2">
                    <div className="space-y-2">
                      {/* 상태 변경 버튼 — Open(빨강)=영업진행, Close(파랑)=계약체결완료, NG(회색)=무산 */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[color:var(--tts-muted)]">{t("label.statusChange", lang)}</span>
                        {(["OPEN", "CLOSE", "NG"] as const).map((s) => {
                          const active = r.status === s;
                          const tone =
                            s === "OPEN"  ? "bg-rose-600 hover:bg-rose-500" :
                            s === "CLOSE" ? "bg-blue-600 hover:bg-blue-500" :
                                            "bg-slate-500 hover:bg-slate-400";
                          const label = s === "OPEN" ? t("badge.openSales", lang) : s === "CLOSE" ? t("badge.closeSales", lang) : t("badge.ngSales", lang);
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
                        <div className="mb-1 text-[11px] font-bold text-[color:var(--tts-muted)]">{t("label.history", lang)}</div>
                        {r.histories.length === 0 && <div className="text-[12px] text-[color:var(--tts-muted)]">{t("label.noHistory", lang)}</div>}
                        {r.histories.map((h) => {
                          // 사용자 언어 우선 + fallback
                          const order = lang === "VI" ? [h.vi, h.en, h.ko]
                                     : lang === "EN" ? [h.en, h.vi, h.ko]
                                     : [h.ko, h.vi, h.en];
                          const text = order.find((v) => v && v.trim()) ?? "";
                          return (
                            <div key={h.id} className="text-[12px]">
                              <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{h.date.slice(0, 10)}:</span>{" "}
                              {text}
                            </div>
                          );
                        })}
                        <div className="mt-2 flex gap-2">
                          <input
                            className="flex-1 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-bg)] px-2 py-1 text-[12px]"
                            placeholder={t("placeholder.newHistory", lang)}
                            value={historyDraft[r.id] ?? ""}
                            onChange={(e) => setHistoryDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                          />
                          <Button onClick={() => addHistory(r.id)} disabled={pending}>{t("btn.addShort", lang)}</Button>
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
