"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput, Textarea } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

// 소모품 요청은 간단히 AS 티켓으로 기록 (reason: CONSUMABLE 같은 별도 모델이 없어 재활용).
// 증상 필드에 요청 내용 저장. 서버가 관리자 알림 생성.

export function SuppliesRequestForm({
  clientId,
  items,
  disabled,
  lang,
}: {
  clientId: string;
  items: { value: string; label: string }[];
  disabled?: boolean;
  lang: Lang;
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
        setError(t("portal.suppliesFailed", lang));
        return;
      }
      setDone(body.ticket?.ticketNumber ?? "OK");
      setItemId(""); setQuantity("1"); setNote("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">{t("portal.suppliesGuide", lang)}</Note>
      {done && <div className="my-3 rounded-md bg-[color:var(--tts-success-dim)] px-3 py-2 text-[color:var(--tts-success)]">✅ {t("portal.suppliesSent", lang)} — {done}</div>}
      <Row>
        <Field label={t("portal.suppliesItem", lang)} required>
          <Select required value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder={t("placeholder.select", lang)} options={items} />
        </Field>
        <Field label={t("portal.suppliesQty", lang)} required width="120px">
          <TextInput type="number" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={t("portal.suppliesNote", lang)}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Row>
      {error && <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3">
        <Button type="submit" disabled={submitting || disabled}>{submitting ? "..." : t("portal.suppliesSubmit", lang)}</Button>
      </div>
    </form>
  );
}
