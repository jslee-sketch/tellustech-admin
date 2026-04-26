"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button, ClientCombobox, Field, Note, Row, Select, TextInput, Textarea } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Scope = "INTERNAL" | "EXTERNAL";

type Props = {
  items: { value: string; label: string }[];
  warehouses: { value: string; label: string; warehouseType: string }[];
  // Note: clients prop 은 더 이상 사용 안 함 (ClientCombobox 가 서버 검색)
  clients?: { value: string; label: string }[];
  lang: Lang;
};

export function TransactionNewForm({ items, warehouses, lang }: Props) {
  const router = useRouter();
  const [itemId, setItemId] = useState("");
  const [txnType, setTxnType] = useState<"IN" | "OUT" | "TRANSFER">("IN");
  const [reason, setReason] = useState("PURCHASE");
  // Scope (INTERNAL/EXTERNAL) 를 먼저 선택 → 그 안에서 창고 선택
  const [fromScope, setFromScope] = useState<Scope>("INTERNAL");
  const [toScope, setToScope] = useState<Scope>("INTERNAL");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  // EXTERNAL 측은 창고 대신 거래처를 직접 선택 — INTERNAL ↔ EXTERNAL 한 트랜잭션에 한쪽만 EXTERNAL 이 일반적.
  const [fromClientId, setFromClientId] = useState("");
  const [toClientId, setToClientId] = useState("");
  // OUT 의 납품처 (TRANSFER 에는 사용 안 함 — EXTERNAL 측이 곧 거래처)
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

  function whOptionsFor(scope: Scope): { value: string; label: string }[] {
    const list = scope === "EXTERNAL" ? externalWarehouses : internalWarehouses;
    return list.map((w) => ({ value: w.value, label: w.label }));
  }

  // 유형 전환 시 사유 자동 리셋 + 창고/scope/거래처 초기화
  function selectType(type: "IN" | "OUT" | "TRANSFER") {
    setTxnType(type);
    setReason(REASONS_BY_TYPE[type][0].value);
    setFromScope("INTERNAL");
    setToScope("INTERNAL");
    setFromWarehouseId("");
    setToWarehouseId("");
    setFromClientId("");
    setToClientId("");
    setClientId("");
    setTargetEquipmentSN("");
  }

  function selectFromScope(scope: Scope) {
    setFromScope(scope);
    setFromWarehouseId("");
    setFromClientId("");
  }
  function selectToScope(scope: Scope) {
    setToScope(scope);
    setToWarehouseId("");
    setToClientId("");
  }

  // OUT 은 별도 client 필드 노출. TRANSFER 는 EXTERNAL 측이 곧 거래처라 별도 필드 불필요.
  const showOutClient = txnType === "OUT";
  const outClientRequired = txnType === "OUT";

  const showTargetEquipment = reason === "CONSUMABLE_OUT";

  // TRANSFER 사유별 가이드 텍스트
  const transferGuide = txnType === "TRANSFER"
    ? (reason === "REPAIR" ? t("txnGuide.repair", lang)
      : reason === "CALIBRATION" ? t("txnGuide.calib", lang)
      : reason === "RENTAL" ? t("txnGuide.rental", lang)
      : reason === "DEMO" ? t("txnGuide.demo", lang)
      : null)
    : null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // TRANSFER 의 EXTERNAL 측은 창고 대신 거래처 1건이 destination/source.
    // 단일 clientId 로 압축: to 우선, 없으면 from.
    let txnFromWarehouseId: string | null = null;
    let txnToWarehouseId: string | null = null;
    let txnClientId: string | null = null;

    if (txnType === "IN") {
      txnToWarehouseId = toWarehouseId || null;
    } else if (txnType === "OUT") {
      txnFromWarehouseId = fromWarehouseId || null;
      txnClientId = clientId || null;
    } else {
      // TRANSFER
      if (fromScope === "INTERNAL") {
        txnFromWarehouseId = fromWarehouseId || null;
      } else {
        // EXTERNAL → warehouse null + client 사용
        txnClientId = fromClientId || null;
      }
      if (toScope === "INTERNAL") {
        txnToWarehouseId = toWarehouseId || null;
      } else {
        txnClientId = toClientId || txnClientId;
      }
      // 양측 모두 INTERNAL 이면 client 필요 없음
      if (fromScope === "EXTERNAL" && !fromClientId) {
        setError(t("msg.externalRequiresClient", lang));
        setSubmitting(false);
        return;
      }
      if (toScope === "EXTERNAL" && !toClientId) {
        setError(t("msg.externalRequiresClient", lang));
        setSubmitting(false);
        return;
      }
    }

    if (txnType === "OUT" && outClientRequired && !clientId) {
      setError(t("msg.externalRequiresClient", lang));
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/inventory/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          txnType,
          reason,
          fromWarehouseId: txnFromWarehouseId,
          toWarehouseId: txnToWarehouseId,
          clientId: txnClientId,
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

      {transferGuide && (
        <Note tone="info">
          <span className="font-bold">{t("txnGuide.title", lang)}</span><br/>
          {transferGuide}<br/>
          {t("txnGuide.externalNeedsClient", lang)}
        </Note>
      )}

      {/* 출발 — OUT/TRANSFER 시 노출. TRANSFER 의 EXTERNAL 은 거래처가 곧 출발지 */}
      {(txnType === "OUT" || txnType === "TRANSFER") && (
        <Row>
          {txnType === "TRANSFER" && (
            <Field label={t("field.fromScope", lang)} required width="200px">
              <Select
                value={fromScope}
                onChange={(e) => selectFromScope(e.target.value as Scope)}
                options={[
                  { value: "INTERNAL", label: t("scope.internal", lang) },
                  { value: "EXTERNAL", label: t("scope.external", lang) },
                ]}
              />
            </Field>
          )}
          {txnType === "TRANSFER" && fromScope === "EXTERNAL" ? (
            <Field label={t("field.fromClient", lang)} required>
              <ClientCombobox value={fromClientId} onChange={setFromClientId} required lang={lang} />
            </Field>
          ) : (
            <Field label={t("field.fromWh", lang)} required>
              <Select
                required
                value={fromWarehouseId}
                onChange={(e) => setFromWarehouseId(e.target.value)}
                placeholder={t("placeholder.select", lang)}
                options={whOptionsFor("INTERNAL")}
              />
            </Field>
          )}
        </Row>
      )}

      {/* 도착 — IN/TRANSFER 시 노출. TRANSFER 의 EXTERNAL 은 거래처가 곧 도착지 */}
      {(txnType === "IN" || txnType === "TRANSFER") && (
        <Row>
          {txnType === "TRANSFER" && (
            <Field label={t("field.toScope", lang)} required width="200px">
              <Select
                value={toScope}
                onChange={(e) => selectToScope(e.target.value as Scope)}
                options={[
                  { value: "INTERNAL", label: t("scope.internal", lang) },
                  { value: "EXTERNAL", label: t("scope.external", lang) },
                ]}
              />
            </Field>
          )}
          {txnType === "TRANSFER" && toScope === "EXTERNAL" ? (
            <Field label={t("field.toClient", lang)} required>
              <ClientCombobox value={toClientId} onChange={setToClientId} required lang={lang} />
            </Field>
          ) : (
            <Field label={t("field.toWh", lang)} required>
              <Select
                required
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                placeholder={t("placeholder.select", lang)}
                options={whOptionsFor("INTERNAL")}
              />
            </Field>
          )}
        </Row>
      )}

      {/* OUT 의 납품처 — TRANSFER 와 무관. OUT 은 도착 창고가 없어 별도 client 필드 유지 */}
      {showOutClient && (
        <Row>
          <Field label={t("field.clientCustomer", lang)} required={outClientRequired}>
            <ClientCombobox
              value={clientId}
              onChange={setClientId}
              required={outClientRequired}
              lang={lang}
            />
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
