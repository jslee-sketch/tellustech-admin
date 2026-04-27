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

const KIND_LABEL: Record<string, { ko: string; vi: string; counterparty_ko: string; counterparty_vi: string }> = {
  RECEIVABLE: { ko: "미수금", vi: "Phải thu", counterparty_ko: "고객", counterparty_vi: "Khách hàng" },
  PAYABLE:    { ko: "미지급", vi: "Phải trả", counterparty_ko: "공급처", counterparty_vi: "Nhà cung cấp" },
};
const STATUS_TONE: Record<string, "warn"|"primary"|"success"|"neutral"> = {
  OPEN: "warn", PARTIAL: "primary", PAID: "success", WRITTEN_OFF: "neutral",
};
const STATUS_LABEL: Record<string, string> = {
  OPEN: "미입금 / Chưa thanh toán",
  PARTIAL: "부분입금 / Thanh toán một phần",
  PAID: "입금완료 / Đã thanh toán",
  WRITTEN_OFF: "대손 / Xóa nợ",
};

export function PrDetailClient(props: Props) {
  const { id, kind, totalAmount, lang } = props;
  const router = useRouter();
  const tone = KIND_LABEL[kind];

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
    if (!noteKo && !noteVi && !noteEn) { setLogErr("연락 내용 한 언어 이상 / Cần nhập nội dung"); return; }
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
    if (!payAmt || Number(payAmt) <= 0) { setPayErr("입금액 / Số tiền"); return; }
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
    if (!confirm("완료 처리 (수동) / Đánh dấu hoàn tất?")) return;
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
      <Card title={`${tone.ko} / ${tone.vi}`}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[14px] md:grid-cols-4">
          <div>
            <div className="text-[11px] text-[color:var(--tts-sub)]">총 금액 / Tổng</div>
            <div className="font-mono font-bold">{Number(totalAmount).toLocaleString()} VND</div>
          </div>
          <div>
            <div className="text-[11px] text-[color:var(--tts-sub)]">{kind === "RECEIVABLE" ? "입금액 / Đã thu" : "지급액 / Đã trả"}</div>
            <div className="font-mono font-bold text-[color:var(--tts-success)]">{Number(paidAmount).toLocaleString()} VND</div>
          </div>
          <div>
            <div className="text-[11px] text-[color:var(--tts-sub)]">잔여 / Còn lại</div>
            <div className="font-mono font-bold text-[color:var(--tts-warn)]">{Number(remaining).toLocaleString()} VND</div>
          </div>
          <div>
            <div className="text-[11px] text-[color:var(--tts-sub)]">상태 / Trạng thái</div>
            <div><Badge tone={STATUS_TONE[status] ?? "neutral"}>{STATUS_LABEL[status] ?? status}</Badge></div>
            {completedAt && <div className="mt-1 text-[10px] text-[color:var(--tts-muted)]">완료일 {String(completedAt).slice(0,10)}</div>}
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
          <div className="mt-3"><Button onClick={markComplete}>✓ 완료 처리 / Hoàn tất</Button></div>
        )}
      </Card>

      {/* 입금 기록 */}
      <Card title={kind === "RECEIVABLE" ? "입금 기록 / Lịch sử thu" : "지급 기록 / Lịch sử trả"} count={payments.length}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field label="금액 / Số tiền" required><TextInput type="number" value={payAmt} onChange={(e)=>setPayAmt(e.target.value)} placeholder="VND"/></Field>
          <Field label="일자 / Ngày"><TextInput type="date" value={payDate} onChange={(e)=>setPayDate(e.target.value)} /></Field>
          <Field label="방법 / Phương thức"><TextInput value={payMethod} onChange={(e)=>setPayMethod(e.target.value)} placeholder="송금/현금"/></Field>
          <Field label="번호 / Tham chiếu"><TextInput value={payRef} onChange={(e)=>setPayRef(e.target.value)} placeholder="거래번호"/></Field>
          <Field label="메모 / Ghi chú"><TextInput value={payNote} onChange={(e)=>setPayNote(e.target.value)} /></Field>
        </div>
        {payErr && <div className="mt-2 text-[12px] text-[color:var(--tts-danger)]">{payErr}</div>}
        <div className="mt-2"><Button onClick={addPayment} disabled={savingPay}>+ 기록 추가 / Thêm</Button></div>
        {payments.length > 0 && (
          <table className="mt-4 w-full text-[12px]">
            <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
              <tr>
                <th className="px-2 py-1 text-left">일자</th>
                <th className="px-2 py-1 text-right">금액</th>
                <th className="px-2 py-1 text-left">방법</th>
                <th className="px-2 py-1 text-left">번호</th>
                <th className="px-2 py-1 text-left">메모</th>
                <th className="px-2 py-1 text-left">기록자</th>
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
      <Card title={`${tone.counterparty_ko} 연락 이력 / Liên hệ ${tone.counterparty_vi}`} count={logs.length}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Field label="연락 내용 (KO)"><Textarea rows={2} value={noteKo} onChange={(e)=>setNoteKo(e.target.value)} /></Field>
          <Field label="Liên hệ (VI)"><Textarea rows={2} value={noteVi} onChange={(e)=>setNoteVi(e.target.value)} /></Field>
          <Field label="고객 답변 (KO) / Phản hồi"><Textarea rows={2} value={respKo} onChange={(e)=>setRespKo(e.target.value)} /></Field>
          <Field label="Phản hồi (VI)"><Textarea rows={2} value={respVi} onChange={(e)=>setRespVi(e.target.value)} /></Field>
          <Field label="예상 입금액 / Dự kiến"><TextInput type="number" value={expectedAmt} onChange={(e)=>setExpectedAmt(e.target.value)} placeholder="VND"/></Field>
          <Field label={t("field.revisedDueDate", lang)}><TextInput type="date" value={expectedDate} onChange={(e)=>setExpectedDate(e.target.value)} /></Field>
        </div>
        {logErr && <div className="mt-2 text-[12px] text-[color:var(--tts-danger)]">{logErr}</div>}
        <div className="mt-2"><Button onClick={addLog} disabled={savingLog}>+ 연락 기록 / Ghi liên hệ</Button></div>
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
                          <div className="text-[10px] font-bold text-[color:var(--tts-sub)]">연락 내용 / Liên hệ / Contact</div>
                          <div>{pickVE(l.contactNoteKo, l.contactNoteVi, l.contactNoteEn)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[color:var(--tts-sub)]">고객 답변 / Phản hồi / Response</div>
                          <div>{pickVE(l.responseKo, l.responseVi, l.responseEn)}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {(l.expectedAmount || l.expectedDate) && (
                  <div className="mt-2 text-[11px] text-[color:var(--tts-accent)]">
                    예상: {l.expectedAmount ? `${Number(l.expectedAmount).toLocaleString()} VND` : ""} {l.expectedDate ? `· ${String(l.expectedDate).slice(0,10)}` : ""}
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
