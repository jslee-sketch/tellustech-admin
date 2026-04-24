"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput, Textarea } from "@/components/ui";

// 소모품 요청은 간단히 AS 티켓으로 기록 (reason: CONSUMABLE 같은 별도 모델이 없어 재활용).
// 증상 필드에 요청 내용 저장. 서버가 관리자 알림 생성.

export function SuppliesRequestForm({
  clientId,
  items,
  disabled,
}: {
  clientId: string;
  items: { value: string; label: string }[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // 임시: AS 티켓으로 소모품 요청 기록 (reason=CONSUMABLE 모델 없어 note 에 기록)
      const res = await fetch("/api/as-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          itemId,
          originalLang: "KO",
          symptomKo: `[소모품요청] 수량 ${quantity}${note ? ` · ${note}` : ""}`,
          symptomVi: `[Yêu cầu vật tư] SL ${quantity}${note ? ` · ${note}` : ""}`,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError("요청 실패");
        return;
      }
      setDone(body.ticket?.ticketNumber ?? "접수됨");
      setItemId(""); setQuantity("1"); setNote("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">필요한 소모품과 수량을 선택해 주세요.</Note>
      {done && <div className="my-3 rounded-md bg-[color:var(--tts-success-dim)] px-3 py-2 text-[color:var(--tts-success)]">✅ 접수됨 — {done}</div>}
      <Row>
        <Field label="소모품" required>
          <Select required value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="선택" options={items} />
        </Field>
        <Field label="수량" required width="120px">
          <TextInput type="number" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="메모 (옵션)">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Row>
      {error && <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3">
        <Button type="submit" disabled={submitting || disabled}>{submitting ? "요청 중..." : "소모품 요청"}</Button>
      </div>
    </form>
  );
}
