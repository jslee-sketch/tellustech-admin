"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput, Textarea } from "@/components/ui";

type Props = {
  items: { value: string; label: string }[];
  warehouses: { value: string; label: string }[];
};

const REASON_OPTIONS = [
  { value: "PURCHASE", label: "매입" },
  { value: "CALIBRATION", label: "교정" },
  { value: "REPAIR", label: "수리" },
  { value: "RENTAL", label: "렌탈" },
  { value: "DEMO", label: "데모" },
  { value: "RETURN", label: "회수" },
  { value: "CONSUMABLE_OUT", label: "소모품출고" },
];

export function TransactionNewForm({ items, warehouses }: Props) {
  const router = useRouter();
  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [txnType, setTxnType] = useState("IN");
  const [reason, setReason] = useState("PURCHASE");
  const [quantity, setQuantity] = useState("1");
  const [serialNumber, setSerialNumber] = useState("");
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          warehouseId,
          txnType,
          reason,
          quantity,
          serialNumber: serialNumber || null,
          scannedBarcode: scannedBarcode || null,
          note: note || null,
        }),
      });
      if (!res.ok) {
        setError("저장 실패");
        return;
      }
      router.push("/inventory/transactions");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">
        품목과 창고를 선택하고 방향(입고/출고) + 사유를 지정합니다. S/N 이 있으면 S/N 필드에, 바코드 스캔으로 들어온 경우엔 바코드 필드에 채워 저장합니다.
      </Note>
      <Row>
        <Field label="방향" required width="140px">
          <Select
            required
            value={txnType}
            onChange={(e) => setTxnType(e.target.value)}
            options={[
              { value: "IN", label: "입고" },
              { value: "OUT", label: "출고" },
            ]}
          />
        </Field>
        <Field label="사유" required width="200px">
          <Select required value={reason} onChange={(e) => setReason(e.target.value)} options={REASON_OPTIONS} />
        </Field>
        <Field label="수량" required width="120px">
          <TextInput type="number" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="품목" required>
          <Select required value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="선택" options={items} />
        </Field>
        <Field label="창고" required>
          <Select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="선택" options={warehouses} />
        </Field>
      </Row>
      <Row>
        <Field label="S/N (옵션)">
          <TextInput value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="SN-XXX" />
        </Field>
        <Field label="스캔된 바코드 (옵션)">
          <TextInput value={scannedBarcode} onChange={(e) => setScannedBarcode(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="비고">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Row>
      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-4 flex gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "저장 중..." : "등록"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/inventory/transactions")}>
          취소
        </Button>
      </div>
    </form>
  );
}
