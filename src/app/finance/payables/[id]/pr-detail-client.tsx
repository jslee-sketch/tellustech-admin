"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, TextInput, Textarea, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type ContactLog = {
  id: string;
  recordedAt: string;
  contactedBy?: { employeeCode: string; nameVi: string; nameKo: string|null } | null;
  contactNoteKo?: string|null; contactNoteVi?: string|null; contactNoteEn?: string|null;
  responseKo?: string|null; responseVi?: string|null; responseEn?: string|null;
  expectedAmount?: string|null;
  expectedDate?: string|null;
};
type Payment = {
  id: string;
  paidAt: string;
  amount: string;
  method?: string|null;
  reference?: string|null;
  note?: string|null;
  recordedBy?: { employeeCode: string; nameVi: string; nameKo: string|null } | null;
};
type Props = {
  id: string;
  kind: "RECEIVABLE" | "PAYABLE";
  totalAmount: string;
  initialContactLogs: ContactLog[];
  initialPayments: Payment[];
  initialPaidAmount: string;
  initialStatus: string;
  initialCompletedAt: string|null;
  /** 변경일(revisedDueDate). null/undef 면 페이지 server 측에서 dueDate(예정일) 로 fallback 후 ISO 문자열 전달 */
  initialRevisedDueDate: string|null;
  lang: Lang;
};

const STATUS_TONE: Record<string, "warn"|"primary"|"success"|"neutral"> = {
  OPEN: "warn", PARTIAL: "primary", PAID: "success", WRITTEN_OFF: "neutral",
};
const STATUS_LABEL_KEY: Record<string, string> = {
  OPEN: "pr.statusOpen",
  PARTIAL: "pr.statusPartial",
  PAID: "pr.statusPaid",
  WRITTEN_OFF: "pr.statusWrittenOff",
};

export function PrDetailClient(props: Props) {
  const { id, kind, totalAmount, lang } = props;
  const router = useRouter();
  const kindLabel = kind === "RECEIVABLE" ? t("pr.kindReceivable", lang) : t("pr.kindPayable", lang);
  const counterpartyLabel = kind === "RECEIVABLE" ? t("pr.counterReceivable", lang) : t("pr.counterPayable", lang);

  const [logs, setLogs] = useState<ContactLog[]>(props.initialContactLogs);
  const [payments, setPayments] = useState<Payment[]>(props.initialPayments);
  const [paidAmount, setPaidAmount] = useState<string>(props.initialPaidAmount);
  const [status, setStatus] = useState<string>(props.initialStatus);
  const [completedAt, setCompletedAt] = useState<string|null>(props.initialCompletedAt);
  const [revisedDueDate, setRevisedDueDate] = useState<string>(props.initialRevisedDueDate ?? "");
  const [savingRevised, setSavingRevised] = useState(false);
  const [revisedErr, setRevisedErr] = useState<string|null>(null);
  const [revisedSavedAt, setRevisedSavedAt] = useState<number>(0);

  // contact log form
  const [noteKo, setNoteKo] = useState(""); const [noteVi, setNoteVi] = useState(""); const [noteEn, setNoteEn] = useState("");
  const [respKo, setRespKo] = useState(""); const [respVi, setRespVi] = useState(""); const [respEn, setRespEn] = useState("");
  const [expectedAmt, setExpectedAmt] = useState(""); const [expectedDate, setExpectedDate] = useState("");
  const [savingLog, setSavingLog] = useState(false);
  const [logErr, setLogErr] = useState<string|null>(null);

  // payment form
  const [payAmt, setPayAmt] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0,10));
  const [savingPay, setSavingPay] = useState(false);
  const [payErr, setPayErr] = useState<string|null>(null);

  const remaining = (Number(totalAmount) - Number(paidAmount)).toFixed(2);

  async function addLog() {
    if (!noteKo && !noteVi && !noteEn) { setLogErr(t("pr.contactRequired", lang)); return; }
    setSavingLog(true); setLogErr(null);
    try {
      const r = await fetch(`/api/finance/payables/${id}/contacts`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          contactNoteKo: noteKo || null, contactNoteVi: noteVi || null, contactNoteEn: noteEn || null,
          responseKo: respKo || null, responseVi: respVi || null, responseEn: respEn || null,
          originalLang: noteKo ? "KO" : noteVi ? "VI" : "EN",
          expectedAmount: expectedAmt || null,
          expectedDate: expectedDate || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setLogErr(j?.error ?? "fail"); return; }
      setLogs((s) => [j.log, ...s]);
      setNoteKo(""); setNoteVi(""); setNoteEn(""); setRespKo(""); setRespVi(""); setRespEn(""); setExpectedAmt(""); setExpectedDate("");
    } finally { setSavingLog(false); }
  }
  async function addPayment() {
    if (!payAmt || Number(payAmt) <= 0) { setPayErr(t("pr.amountRequired", lang)); return; }
    setSavingPay(true); setPayErr(null);
    try {
      const r = await fetch(`/api/finance/payables/${id}/payments`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ amount: payAmt, paidAt: payDate, method: payMethod || null, reference: payRef || null, note: payNote || null }),
      });
      const j = await r.json();
      if (!r.ok) { setPayErr(j?.error ?? "fail"); return; }
      setPayments((s) => [j.payment, ...s]);
      setPaidAmount(j.totalPaid);
      setStatus(j.pr.status);
      setCompletedAt(j.pr.completedAt);
      setPayAmt(""); setPayMethod(""); setPayRef(""); setPayNote("");
      router.refresh();
    } finally { setSavingPay(false); }
  }
  async function saveRevisedDueDate() {
    setSavingRevised(true); setRevisedErr(null);
    try {
      const r = await fetch(`/api/finance/payables/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisedDueDate: revisedDueDate || null }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setRevisedErr(j?.error ?? "fail");
        return;
      }
      setRevisedSavedAt(Date.now());
      router.refresh();
    } finally { setSavingRevised(false); }
  }
  async function markComplete() {
    if (!confirm(t("pr.markCompleteConfirm", lang))) return;
    const r = await fetch(`/api/finance/payables/${id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status: "PAID" }),
    });
    if (r.ok) {
      setStatus("PAID");
      setCompletedAt(new Date().toISOString());
    }
  }

  return (
    <div className="space-y-4">
      {/* 헤더 카드 — 금액/잔여/상태 */}
      <Card title={kindLabel}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[14px] md:grid-cols-4">
          <div>
            <div className="text-[11px] text-[color:var(--tts-sub)]">{t("col.totalAmount", lang)}</div>
            <div className="font-mono font-bold">{Number(totalAmount).toLocaleString()} VND</div>
          </div>
          <div>
            <div className="text-[11px] text-[color:var(--tts-sub)]">{kind === "RECEIVABLE" ? t("pr.receiptCollected", lang) : t("pr.receiptPaid", lang)}</div>
            <div className="font-mono font-bold text-[color:var(--tts-success)]">{Number(paidAmount).toLocaleString()} VND</div>
          </div>
          <div>
            <div className="text-[11px] text-[color:var(--tts-sub)]">{t("col.remaining", lang)}</div>
            <div className="font-mono font-bold text-[color:var(--tts-warn)]">{Number(remaining).toLocaleString()} VND</div>
          </div>
          <div>
            <div className="text-[11px] text-[color:var(--tts-sub)]">{t("col.statusShort", lang)}</div>
            <div><Badge tone={STATUS_TONE[status] ?? "neutral"}>{STATUS_LABEL_KEY[status] ? t(STATUS_LABEL_KEY[status], lang) : status}</Badge></div>
            {completedAt && <div className="mt-1 text-[10px] text-[color:var(--tts-muted)]">{t("col.completedAtDate", lang)} {String(completedAt).slice(0,10)}</div>}
          </div>
        </div>
        {/* 변경일 — 상세에서 편집. 비워두면 서버에서 예정일(dueDate) fallback */}
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[color:var(--tts-border)] pt-3">
          <Field label={t("field.revisedDueDate", lang)} width="220px">
            <TextInput
              type="date"
              value={revisedDueDate}
              onChange={(e) => setRevisedDueDate(e.target.value)}
            />
          </Field>
          <Button onClick={saveRevisedDueDate} disabled={savingRevised}>
            {savingRevised ? "..." : t("action.save", lang)}
          </Button>
          {revisedErr && <span className="text-[12px] text-[color:var(--tts-danger)]">{revisedErr}</span>}
          {revisedSavedAt > 0 && !revisedErr && <span className="text-[11px] text-[color:var(--tts-success)]">✓</span>}
        </div>
        {status !== "PAID" && Number(remaining) <= 0 && (
          <div className="mt-3"><Button onClick={markComplete}>✓ {t("pr.markCompleteConfirm", lang)}</Button></div>
        )}
      </Card>

      {/* 입금 기록 */}
      <Card title={kind === "RECEIVABLE" ? t("pr.receiveHistory", lang) : t("pr.payHistory", lang)} count={payments.length}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field label={t("pr.amountField", lang)} required><TextInput type="number" value={payAmt} onChange={(e)=>setPayAmt(e.target.value)} placeholder="VND"/></Field>
          <Field label={t("pr.dateField", lang)}><TextInput type="date" value={payDate} onChange={(e)=>setPayDate(e.target.value)} /></Field>
          <Field label={t("pr.methodField", lang)}><TextInput value={payMethod} onChange={(e)=>setPayMethod(e.target.value)} placeholder={t("pr.methodPlaceholder", lang)}/></Field>
          <Field label={t("pr.refField", lang)}><TextInput value={payRef} onChange={(e)=>setPayRef(e.target.value)} placeholder={t("pr.refPlaceholder", lang)}/></Field>
          <Field label={t("pr.noteField", lang)}><TextInput value={payNote} onChange={(e)=>setPayNote(e.target.value)} /></Field>
        </div>
        {payErr && <div className="mt-2 text-[12px] text-[color:var(--tts-danger)]">{payErr}</div>}
        <div className="mt-2"><Button onClick={addPayment} disabled={savingPay}>+ {t("pr.dateField", lang)}</Button></div>
        {payments.length > 0 && (
          <table className="mt-4 w-full text-[12px]">
            <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
              <tr>
                <th className="px-2 py-1 text-left">{t("pr.dateField", lang)}</th>
                <th className="px-2 py-1 text-right">{t("pr.amountField", lang)}</th>
                <th className="px-2 py-1 text-left">{t("pr.methodField", lang)}</th>
                <th className="px-2 py-1 text-left">{t("pr.refField", lang)}</th>
                <th className="px-2 py-1 text-left">{t("pr.noteField", lang)}</th>
                <th className="px-2 py-1 text-left">{t("col.recordedBy", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b border-[color:var(--tts-border)]/50">
                  <td className="px-2 py-1">{p.paidAt.slice(0,10)}</td>
                  <td className="px-2 py-1 text-right font-mono font-bold text-[color:var(--tts-success)]">{Number(p.amount).toLocaleString()}</td>
                  <td className="px-2 py-1">{p.method ?? "-"}</td>
                  <td className="px-2 py-1 font-mono text-[11px]">{p.reference ?? "-"}</td>
                  <td className="px-2 py-1">{p.note ?? "-"}</td>
                  <td className="px-2 py-1">{p.recordedBy ? `${p.recordedBy.employeeCode} ${p.recordedBy.nameKo ?? p.recordedBy.nameVi}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* 연락 로그 */}
      <Card title={t("pr.contactHistory", lang).replace("{cp}", counterpartyLabel)} count={logs.length}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Field label={t("pr.contactNoteKo", lang)}><Textarea rows={2} value={noteKo} onChange={(e)=>setNoteKo(e.target.value)} /></Field>
          <Field label={t("pr.contactNoteVi", lang)}><Textarea rows={2} value={noteVi} onChange={(e)=>setNoteVi(e.target.value)} /></Field>
          <Field label={t("pr.responseKo", lang)}><Textarea rows={2} value={respKo} onChange={(e)=>setRespKo(e.target.value)} /></Field>
          <Field label={t("pr.responseVi", lang)}><Textarea rows={2} value={respVi} onChange={(e)=>setRespVi(e.target.value)} /></Field>
          <Field label={t("pr.expectedAmt", lang)}><TextInput type="number" value={expectedAmt} onChange={(e)=>setExpectedAmt(e.target.value)} placeholder="VND"/></Field>
          <Field label={t("field.revisedDueDate", lang)}><TextInput type="date" value={expectedDate} onChange={(e)=>setExpectedDate(e.target.value)} /></Field>
        </div>
        {logErr && <div className="mt-2 text-[12px] text-[color:var(--tts-danger)]">{logErr}</div>}
        <div className="mt-2"><Button onClick={addLog} disabled={savingLog}>+ {t("pr.contactLogTitle", lang)}</Button></div>
        {logs.length > 0 && (
          <ul className="mt-4 space-y-2">
            {logs.map(l => (
              <li key={l.id} className="rounded border border-[color:var(--tts-border)] p-3 text-[12px]">
                <div className="mb-1 flex items-center justify-between text-[11px] text-[color:var(--tts-sub)]">
                  <span>{new Date(l.recordedAt).toISOString().slice(0,16).replace('T',' ')}</span>
                  {l.contactedBy && <span>{l.contactedBy.employeeCode} {l.contactedBy.nameKo ?? l.contactedBy.nameVi}</span>}
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {(() => {
                    const pickVE = (ko: string|null|undefined, vi: string|null|undefined, en: string|null|undefined) => {
                      const order = lang === "VI" ? [vi, en, ko] : lang === "EN" ? [en, vi, ko] : [ko, vi, en];
                      return order.find(v => v && v.trim()) ?? "-";
                    };
                    return (
                      <>
                        <div>
                          <div className="text-[10px] font-bold text-[color:var(--tts-sub)]">{t("pr.contactLabel", lang)}</div>
                          <div>{pickVE(l.contactNoteKo, l.contactNoteVi, l.contactNoteEn)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[color:var(--tts-sub)]">{t("pr.responseLabel", lang)}</div>
                          <div>{pickVE(l.responseKo, l.responseVi, l.responseEn)}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {(l.expectedAmount || l.expectedDate) && (
                  <div className="mt-2 text-[11px] text-[color:var(--tts-accent)]">
                    {t("pr.expectedShort", lang)}: {l.expectedAmount ? `${Number(l.expectedAmount).toLocaleString()} VND` : ""} {l.expectedDate ? `· ${String(l.expectedDate).slice(0,10)}` : ""}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
