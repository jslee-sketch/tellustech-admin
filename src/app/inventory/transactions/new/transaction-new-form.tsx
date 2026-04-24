"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput, Textarea } from "@/components/ui";

type Props = {
  items: { value: string; label: string }[];
  warehouses: { value: string; label: string; warehouseType: string }[];
  clients: { value: string; label: string }[];
};

const REASONS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  IN: [
    { value: "PURCHASE", label: "매입" },
    { value: "RETURN_IN", label: "반품입고" },
    { value: "OTHER_IN", label: "기타입고" },
  ],
  OUT: [
    { value: "SALE", label: "매출" },
    { value: "CONSUMABLE_OUT", label: "소모품출고" },
  ],
  TRANSFER: [
    { value: "CALIBRATION", label: "교정" },
    { value: "REPAIR", label: "수리" },
    { value: "RENTAL", label: "렌탈" },
    { value: "DEMO", label: "데모" },
  ],
};

export function TransactionNewForm({ items, warehouses, clients }: Props) {
  const router = useRouter();
  const [itemId, setItemId] = useState("");
  const [txnType, setTxnType] = useState<"IN" | "OUT" | "TRANSFER">("IN");
  const [reason, setReason] = useState("PURCHASE");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [clientId, setClientId] = useState("");
  const [targetEquipmentSN, setTargetEquipmentSN] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [serialNumber, setSerialNumber] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const internalWarehouses = useMemo(() => warehouses.filter((w) => w.warehouseType !== "EXTERNAL"), [warehouses]);
  const externalWarehouses = useMemo(() => warehouses.filter((w) => w.warehouseType === "EXTERNAL"), [warehouses]);

  // 유형 전환 시 사유 자동 리셋 + 창고 필드 초기화
  function selectType(t: "IN" | "OUT" | "TRANSFER") {
    setTxnType(t);
    setReason(REASONS_BY_TYPE[t][0].value);
    setFromWarehouseId("");
    setToWarehouseId("");
    setClientId("");
    setTargetEquipmentSN("");
  }

  const showClient =
    (txnType === "TRANSFER" && toWarehouseId && externalWarehouses.some((w) => w.value === toWarehouseId)) ||
    txnType === "OUT";

  const showTargetEquipment = reason === "CONSUMABLE_OUT";

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
          txnType,
          reason,
          fromWarehouseId: fromWarehouseId || null,
          toWarehouseId: toWarehouseId || null,
          clientId: clientId || null,
          targetEquipmentSN: targetEquipmentSN || null,
          quantity,
          serialNumber: serialNumber || null,
          note: note || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? `${data.error} ${JSON.stringify(data.details ?? "")}` : "저장 실패");
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
        유형 선택 후 사유를 고르고, 유형에 맞는 창고(출고/입고)를 지정합니다.<br/>
        • 입고: 외부→자사 (입고창고만) · 출고: 자사→고객 (출고창고+고객) · 이동: 창고→창고 (둘 다 + External 시 고객)<br/>
        • 소모품출고 시 "대상 장비 S/N" 필수 — IT 계약 장비에 연결됩니다.
      </Note>

      <Row>
        <Field label="유형" required width="360px">
          <div className="flex gap-1 rounded-md bg-[color:var(--tts-input)] p-1">
            {(["IN", "OUT", "TRANSFER"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => selectType(t)}
                className={`flex-1 rounded px-3 py-2 text-[13px] font-semibold transition ${txnType === t ? "bg-[color:var(--tts-primary)] text-white" : "text-[color:var(--tts-sub)] hover:text-[color:var(--tts-text)]"}`}
              >
                {t === "IN" ? "입고" : t === "OUT" ? "출고" : "이동"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="사유" required width="180px">
          <Select required value={reason} onChange={(e) => setReason(e.target.value)} options={REASONS_BY_TYPE[txnType]} />
        </Field>
        <Field label="수량" required width="100px">
          <TextInput type="number" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
      </Row>

      <Row>
        <Field label="품목" required>
          <Select required value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="선택" options={items} />
        </Field>
        <Field label="S/N">
          <TextInput value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="SN-XXX" />
        </Field>
      </Row>

      <Row>
        {(txnType === "OUT" || txnType === "TRANSFER") && (
          <Field label="출고창고" required>
            <Select required value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} placeholder="선택" options={internalWarehouses.map((w) => ({ value: w.value, label: w.label }))} />
          </Field>
        )}
        {(txnType === "IN" || txnType === "TRANSFER") && (
          <Field label="입고창고" required>
            <Select
              required
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(e.target.value)}
              placeholder="선택"
              options={(txnType === "TRANSFER" ? warehouses : internalWarehouses).map((w) => ({ value: w.value, label: w.label }))}
            />
          </Field>
        )}
      </Row>

      {showClient && (
        <Row>
          <Field label={txnType === "OUT" ? "고객 (납품처)" : "고객 (External 창고)"} required={txnType === "OUT"}>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="선택" options={clients} />
          </Field>
        </Row>
      )}

      {showTargetEquipment && (
        <Row>
          <Field label="대상 장비 S/N" required>
            <TextInput required value={targetEquipmentSN} onChange={(e) => setTargetEquipmentSN(e.target.value)} placeholder="이 소모품을 사용할 IT계약 장비의 S/N" />
          </Field>
        </Row>
      )}

      <Row>
        <Field label="비고">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Row>

      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}

      <div className="mt-4 flex gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>{submitting ? "저장 중..." : "등록"}</Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/inventory/transactions")}>취소</Button>
      </div>
    </form>
  );
}
