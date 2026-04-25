"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput, Textarea } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Props = {
  items: { value: string; label: string }[];
  warehouses: { value: string; label: string; warehouseType: string }[];
  clients: { value: string; label: string }[];
  lang: Lang;
};

export function TransactionNewForm({ items, warehouses, clients, lang }: Props) {
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

  const REASONS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
    IN: [
      { value: "PURCHASE", label: t("reason.purchaseShort", lang) },
      { value: "RETURN_IN", label: t("reason.returnInShort", lang) },
      { value: "OTHER_IN", label: t("reason.otherInShort", lang) },
    ],
    OUT: [
      { value: "SALE", label: t("reason.saleShort", lang) },
      { value: "CONSUMABLE_OUT", label: t("reason.consumableOutShort", lang) },
    ],
    TRANSFER: [
      { value: "CALIBRATION", label: t("reason.calibrationShort", lang) },
      { value: "REPAIR", label: t("reason.repairShort", lang) },
      { value: "RENTAL", label: t("reason.rentalShort", lang) },
      { value: "DEMO", label: t("reason.demoShort", lang) },
    ],
  };

  const internalWarehouses = useMemo(() => warehouses.filter((w) => w.warehouseType !== "EXTERNAL"), [warehouses]);
  const externalWarehouses = useMemo(() => warehouses.filter((w) => w.warehouseType === "EXTERNAL"), [warehouses]);

  // 유형 전환 시 사유 자동 리셋 + 창고 필드 초기화
  function selectType(type: "IN" | "OUT" | "TRANSFER") {
    setTxnType(type);
    setReason(REASONS_BY_TYPE[type][0].value);
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
        setError(data.error ? `${data.error} ${JSON.stringify(data.details ?? "")}` : t("msg.saveFailedShort", lang));
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
        {t("note.txnTypePicker", lang)}<br/>
        {t("note.txnTypeRules", lang)}<br/>
        {t("note.txnConsumableRule", lang)}
      </Note>

      <Row>
        <Field label={t("field.txnType", lang)} required width="360px">
          <div className="flex gap-1 rounded-md bg-[color:var(--tts-input)] p-1">
            {(["IN", "OUT", "TRANSFER"] as const).map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => selectType(type)}
                className={`flex-1 rounded px-3 py-2 text-[13px] font-semibold transition ${txnType === type ? "bg-[color:var(--tts-primary)] text-white" : "text-[color:var(--tts-sub)] hover:text-[color:var(--tts-text)]"}`}
              >
                {type === "IN" ? t("txnType.in", lang) : type === "OUT" ? t("txnType.out", lang) : t("txnType.transfer", lang)}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("field.reason", lang)} required width="180px">
          <Select required value={reason} onChange={(e) => setReason(e.target.value)} options={REASONS_BY_TYPE[txnType]} />
        </Field>
        <Field label={t("field.qty", lang)} required width="100px">
          <TextInput type="number" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
      </Row>

      <Row>
        <Field label={t("field.item", lang)} required>
          <Select required value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder={t("placeholder.select", lang)} options={items} />
        </Field>
        <Field label={t("field.serial", lang)}>
          <TextInput value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="SN-XXX" />
        </Field>
      </Row>

      <Row>
        {(txnType === "OUT" || txnType === "TRANSFER") && (
          <Field label={t("field.warehouseOut", lang)} required>
            <Select required value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} placeholder={t("placeholder.select", lang)} options={internalWarehouses.map((w) => ({ value: w.value, label: w.label }))} />
          </Field>
        )}
        {(txnType === "IN" || txnType === "TRANSFER") && (
          <Field label={t("field.warehouseIn", lang)} required>
            <Select
              required
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(e.target.value)}
              placeholder={t("placeholder.select", lang)}
              options={(txnType === "TRANSFER" ? warehouses : internalWarehouses).map((w) => ({ value: w.value, label: w.label }))}
            />
          </Field>
        )}
      </Row>

      {showClient && (
        <Row>
          <Field label={txnType === "OUT" ? t("field.clientCustomer", lang) : t("field.clientExternal", lang)} required={txnType === "OUT"}>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder={t("placeholder.select", lang)} options={clients} />
          </Field>
        </Row>
      )}

      {showTargetEquipment && (
        <Row>
          <Field label={t("field.targetEquipSN", lang)} required>
            <TextInput required value={targetEquipmentSN} onChange={(e) => setTargetEquipmentSN(e.target.value)} placeholder={t("placeholder.targetEquipSN", lang)} />
          </Field>
        </Row>
      )}

      <Row>
        <Field label={t("field.note", lang)}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Row>

      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}

      <div className="mt-4 flex gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>{submitting ? t("action.saving", lang) : t("btn.txnRegister", lang)}</Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/inventory/transactions")}>{t("action.cancel", lang)}</Button>
      </div>
    </form>
  );
}
