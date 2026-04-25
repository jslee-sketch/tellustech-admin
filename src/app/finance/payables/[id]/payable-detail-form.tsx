"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Card, Field, Multilingual, Note, Row, TextInput, Textarea } from "@/components/ui";

type DelayReason = {
  id: string;
  recordedAt: string;
  contentVi: string | null;
  contentEn: string | null;
  contentKo: string | null;
  originalLang: string;
};

type Props = {
  id: string;
  kind: "RECEIVABLE" | "PAYABLE";
  amount: number;
  paidAmount: number;
  dueDate: string;
  delayReasons: DelayReason[];
  currentLang: "VI" | "EN" | "KO";
};

export function PayableDetailForm({ id, kind, amount, paidAmount, dueDate, delayReasons, currentLang }: Props) {
  const router = useRouter();
  const [paid, setPaid] = useState(String(paidAmount));
  const [due, setDue] = useState(dueDate);
  const [savingPay, setSavingPay] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const [reasonVi, setReasonVi] = useState("");
  const [reasonKo, setReasonKo] = useState("");
  const [reasonEn, setReasonEn] = useState("");
  const [savingReason, setSavingReason] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);

  async function handleSavePay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingPay(true);
    setPayError(null);
    try {
      const n = Number(paid);
      if (!Number.isFinite(n) || n < 0) {
        setPayError("금액 형식이 올바르지 않습니다.");
        return;
      }
      if (n > amount) {
        setPayError(`총액 ${amount.toLocaleString("vi-VN")} VND 를 초과할 수 없습니다.`);
        return;
      }
      const res = await fetch(`/api/finance/payables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidAmount: n.toFixed(2), dueDate: due || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setPayError(j?.error ?? "저장 실패");
        return;
      }
      router.refresh();
    } finally {
      setSavingPay(false);
    }
  }

  async function handleAddReason(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingReason(true);
    setReasonError(null);
    try {
      if (!reasonVi.trim() && !reasonEn.trim() && !reasonKo.trim()) {
        setReasonError("하나 이상의 언어로 사유를 입력하세요.");
        return;
      }
      const res = await fetch(`/api/finance/payables/${id}/delays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentVi: reasonVi.trim() || null,
          contentEn: reasonEn.trim() || null,
          contentKo: reasonKo.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setReasonError(j?.error ?? "저장 실패");
        return;
      }
      setReasonVi("");
      setReasonEn("");
      setReasonKo("");
      router.refresh();
    } finally {
      setSavingReason(false);
    }
  }

  const payLabel = kind === "RECEIVABLE" ? "입금" : "지급";

  return (
    <div className="space-y-4">
      <Card title={`${payLabel} 정보`}>
        <form onSubmit={handleSavePay}>
          <Row>
            <Field label={`${payLabel} 금액 (VND)`} required width="240px">
              <TextInput
                type="number"
                step="0.01"
                min={0}
                max={amount}
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                required
              />
            </Field>
            <Field label="납기" width="200px">
              <TextInput type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
          </Row>
          {payError && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{payError}</div>}
          <div className="mt-3 flex gap-2">
            <Button type="submit" disabled={savingPay}>
              {savingPay ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="지연 사유">
        {delayReasons.length === 0 ? (
          <Note tone="info">아직 등록된 지연 사유가 없습니다.</Note>
        ) : (
          <ul className="space-y-2">
            {delayReasons.map((d) => (
              <li key={d.id} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3">
                <div className="mb-1 text-[11px] text-[color:var(--tts-muted)]">{d.recordedAt}</div>
                <Multilingual vi={d.contentVi} en={d.contentEn} ko={d.contentKo} originalLang={d.originalLang as "VI" | "EN" | "KO"} currentLang={currentLang} />
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddReason} className="mt-4 border-t border-[color:var(--tts-border)] pt-3">
          <Note tone="info">
            1개 언어만 입력해도 저장됩니다. (Claude API 연동 시 자동 번역 — 현재는 입력값만 저장)
          </Note>
          <Row>
            <Field label="VI (Tiếng Việt)">
              <Textarea rows={2} value={reasonVi} onChange={(e) => setReasonVi(e.target.value)} placeholder="Lý do trì hoãn..." />
            </Field>
          </Row>
          <Row>
            <Field label="KO (한국어)">
              <Textarea rows={2} value={reasonKo} onChange={(e) => setReasonKo(e.target.value)} placeholder="지연 사유..." />
            </Field>
          </Row>
          <Row>
            <Field label="EN (English)">
              <Textarea rows={2} value={reasonEn} onChange={(e) => setReasonEn(e.target.value)} placeholder="Delay reason..." />
            </Field>
          </Row>
          {reasonError && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{reasonError}</div>}
          <div className="mt-3 flex gap-2">
            <Button type="submit" disabled={savingReason} variant="accent">
              {savingReason ? "추가 중..." : "+ 지연 사유 추가"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
