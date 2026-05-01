"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button, ClientCombobox, Field, ItemCombobox, Note, Row, Select, SerialCombobox, TextInput, Textarea } from "@/components/ui";
import { pickName, t, type Lang } from "@/lib/i18n";

type Scope = "INTERNAL" | "EXTERNAL";

type ActiveContract = {
  kind: "IT" | "TM";
  contractId?: string;
  contractNumber?: string;
  rentalId?: string;
  rentalCode?: string;
  status: string;
  itemId: string;
  item: { id: string; itemCode: string; name: string };
  client: { id: string; clientCode: string; companyNameVi: string };
  monthlyBaseFee?: string | null;
  salesPrice?: string | null;
  equipmentId?: string;
  rentalItemId?: string;
};

type SnIntent = "RECOVER" | "REPLACE" | "NORMAL";

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

  // S/N 활성 계약 lookup 결과 + 의도 모달
  const [snContracts, setSnContracts] = useState<ActiveContract[] | null>(null);
  const [snIntent, setSnIntent] = useState<SnIntent | null>(null);
  const [replaceNewSn, setReplaceNewSn] = useState("");
  const [replaceMonthlyFee, setReplaceMonthlyFee] = useState("");
  const [showSnModal, setShowSnModal] = useState(false);

  async function handleSerialBlur() {
    const sn = serialNumber.trim();
    if (!sn) {
      setSnContracts(null);
      setSnIntent(null);
      setShowSnModal(false);
      return;
    }
    try {
      const r = await fetch(`/api/inventory/sn/${encodeURIComponent(sn)}/active-contracts`).then((r) => r.json());
      const list: ActiveContract[] = r.contracts ?? [];
      if (list.length > 0) {
        setSnContracts(list);
        setShowSnModal(true);
        setSnIntent(null);
      } else {
        setSnContracts(null);
        setSnIntent("NORMAL");
        setShowSnModal(false);
      }
    } catch {
      // ignore network — 서버측에서 다시 검사할 것
    }
  }

  // A안 정책: 매입/매출/매입반품 사유는 별도 모듈(매입·매출·Adjustment)에서만 자동 생성.
  // 입출고 폼에서 manual 선택 가능한 사유:
  //   IN: 외부 자산 입고(렌탈/수리/데모/교정입고) + 기타입고
  //   OUT: 외부 자산 반환(렌탈/수리/데모/교정반출) + 소모품출고
  //   TRANSFER: 자사 내부 이동
  const REASONS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
    IN: [
      { value: "RENTAL_IN", label: t("reason.rentalInShort", lang) },
      { value: "REPAIR_IN", label: t("reason.repairInShort", lang) },
      { value: "DEMO_IN", label: t("reason.demoInShort", lang) },
      { value: "CALIBRATION_IN", label: t("reason.calibrationInShort", lang) },
      { value: "OTHER_IN", label: t("reason.otherInShort", lang) },
    ],
    OUT: [
      { value: "RENTAL_OUT", label: t("reason.rentalOutShort", lang) },
      { value: "REPAIR_OUT", label: t("reason.repairOutShort", lang) },
      { value: "DEMO_OUT", label: t("reason.demoOutShort", lang) },
      { value: "CALIBRATION_OUT", label: t("reason.calibrationOutShort", lang) },
      { value: "CONSUMABLE_OUT", label: t("reason.consumableOutShort", lang) },
    ],
    TRANSFER: [
      { value: "CALIBRATION", label: t("reason.calibrationShort", lang) },
      { value: "REPAIR", label: t("reason.repairShort", lang) },
      { value: "RENTAL", label: t("reason.rentalShort", lang) },
      { value: "DEMO", label: t("reason.demoShort", lang) },
    ],
  };

  // 외부 자산 입출고 사유 — 거래처 필수 + S/N 필수
  const EXTERNAL_IN_SET = new Set(["RENTAL_IN", "REPAIR_IN", "DEMO_IN", "CALIBRATION_IN"]);
  const EXTERNAL_OUT_SET = new Set(["RENTAL_OUT", "REPAIR_OUT", "DEMO_OUT", "CALIBRATION_OUT"]);
  const isExternalIn = txnType === "IN" && EXTERNAL_IN_SET.has(reason);
  const isExternalOut = txnType === "OUT" && EXTERNAL_OUT_SET.has(reason);

  const internalWarehouses = useMemo(() => warehouses.filter((w) => w.warehouseType !== "EXTERNAL"), [warehouses]);
  const externalWarehouses = useMemo(() => warehouses.filter((w) => w.warehouseType === "EXTERNAL"), [warehouses]);

  function whOptionsFor(scope: Scope): { value: string; label: string }[] {
    const list = scope === "EXTERNAL" ? externalWarehouses : internalWarehouses;
    return list.map((w) => ({ value: w.value, label: w.label }));
  }

  // 유형 전환 시 사유 자동 리셋 + 창고/scope/거래처 초기화
  function selectType(type: "IN" | "OUT" | "TRANSFER") {
    setTxnType(type);
    setReason(type === "IN" ? "RENTAL_IN" : type === "OUT" ? "RENTAL_OUT" : "CALIBRATION");
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
  // 외부 자산 입고(RENTAL_IN/REPAIR_IN/DEMO_IN/CALIBRATION_IN)도 거래처 필수.
  const showOutClient = txnType === "OUT" || isExternalIn;
  const outClientRequired = txnType === "OUT" || isExternalIn;

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
      const txnBody = (await res.json().catch(() => null)) as { transaction?: { id: string } } | null;
      const txnId = txnBody?.transaction?.id ?? null;

      // 경로 B — S/N 의도가 RECOVER/REPLACE 면 자동으로 Amendment 생성
      if (snIntent && snIntent !== "NORMAL" && snContracts && snContracts.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        for (const c of snContracts) {
          if (c.kind === "IT" && c.contractId) {
            const items: Array<Record<string, unknown>> = [
              {
                action: snIntent === "RECOVER" ? "REMOVE" : "REPLACE_OUT",
                serialNumber: serialNumber,
                itemId: c.itemId,
                originalEquipmentId: c.equipmentId,
              },
            ];
            if (snIntent === "REPLACE" && replaceNewSn) {
              items.push({
                action: "REPLACE_IN",
                serialNumber: replaceNewSn,
                itemId: c.itemId,
                monthlyBaseFee: replaceMonthlyFee || c.monthlyBaseFee || null,
              });
            }
            await fetch(`/api/rental/it-contracts/${c.contractId}/amend`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: snIntent === "RECOVER" ? "REMOVE_EQUIPMENT" : "REPLACE_EQUIPMENT",
                source: "INVENTORY_TXN",
                triggeredByTxnId: txnId,
                effectiveDate: today,
                warehouseId: txnToWarehouseId,
                items,
              }),
            });
          } else if (c.kind === "TM" && c.rentalId) {
            const items: Array<Record<string, unknown>> = [
              {
                action: snIntent === "RECOVER" ? "REMOVE" : "REPLACE_OUT",
                serialNumber: serialNumber,
                itemId: c.itemId,
                originalItemId: c.rentalItemId,
              },
            ];
            if (snIntent === "REPLACE" && replaceNewSn) {
              items.push({
                action: "REPLACE_IN",
                serialNumber: replaceNewSn,
                itemId: c.itemId,
                salesPrice: c.salesPrice ?? null,
              });
            }
            await fetch(`/api/rental/tm-rentals/${c.rentalId}/amend`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: snIntent === "RECOVER" ? "REMOVE_EQUIPMENT" : "REPLACE_EQUIPMENT",
                source: "INVENTORY_TXN",
                triggeredByTxnId: txnId,
                effectiveDate: today,
                warehouseId: txnToWarehouseId,
                items,
              }),
            });
          }
        }
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
          <ItemCombobox value={itemId} onChange={setItemId} required lang={lang} />
        </Field>
        <Field label={t("field.serial", lang)}>
          <SerialCombobox
            value={serialNumber}
            onChange={setSerialNumber}
            onBlur={handleSerialBlur}
            itemId={itemId || undefined}
            lang={lang}
          />
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
            <SerialCombobox required value={targetEquipmentSN} onChange={setTargetEquipmentSN} lang={lang} />
          </Field>
        </Row>
      )}

      <Row>
        <Field label={t("field.note", lang)}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Row>

      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}

      {/* S/N 활성 계약 알림 — 의도 표시 (RECOVER/REPLACE/NORMAL) */}
      {snIntent && snIntent !== "NORMAL" && snContracts && snContracts.length > 0 && (
        <Note tone="warn">
          <div className="font-bold">{t("note.snDetectedActive", lang)}</div>
          <ul className="mt-1 list-disc pl-4 text-[12px]">
            {snContracts.map((c, i) => (
              <li key={i}>
                {c.kind === "IT" ? c.contractNumber : c.rentalCode} · {pickName(c.client, lang, "companyName")} · {c.item.name}
              </li>
            ))}
          </ul>
          <div className="mt-1 text-[11px] text-[color:var(--tts-sub)]">
            Intent: <span className="font-bold">{snIntent}</span>
            {snIntent === "REPLACE" && replaceNewSn && <> → newSN: <span className="font-mono">{replaceNewSn}</span></>}
          </div>
        </Note>
      )}

      <div className="mt-4 flex gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>{submitting ? t("action.saving", lang) : t("btn.txnRegister", lang)}</Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/inventory/transactions")}>{t("action.cancel", lang)}</Button>
      </div>

      {/* S/N 활성계약 모달 */}
      {showSnModal && snContracts && snContracts.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowSnModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-[14px] font-bold text-[color:var(--tts-text)]">
              {t("modal.snContractTitle", lang)}
            </div>
            <div className="mb-3 max-h-[180px] overflow-auto rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] p-2 text-[12px]">
              <ul className="list-disc pl-4">
                {snContracts.map((c, i) => (
                  <li key={i}>
                    <span className="font-mono font-bold">
                      {c.kind === "IT" ? c.contractNumber : c.rentalCode}
                    </span>{" "}
                    · {pickName(c.client, lang, "companyName")} · {c.item.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 text-[13px]">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="snIntent"
                  checked={snIntent === "RECOVER"}
                  onChange={() => setSnIntent("RECOVER")}
                />
                {t("modal.snAction.recover", lang)}
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="snIntent"
                  checked={snIntent === "REPLACE"}
                  onChange={() => setSnIntent("REPLACE")}
                />
                {t("modal.snAction.replace", lang)}
              </label>
              {snIntent === "REPLACE" && (
                <div className="ml-6 space-y-2 border-l-2 border-[color:var(--tts-border)] pl-3">
                  <Field label={t("modal.newSnLabel", lang)} required>
                    <TextInput
                      value={replaceNewSn}
                      onChange={(e) => setReplaceNewSn(e.target.value)}
                      placeholder="SN-NEW-001"
                    />
                  </Field>
                  <Field label={t("modal.newMonthlyFee", lang)}>
                    <TextInput
                      type="number"
                      value={replaceMonthlyFee}
                      onChange={(e) => setReplaceMonthlyFee(e.target.value)}
                    />
                  </Field>
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="snIntent"
                  checked={snIntent === "NORMAL"}
                  onChange={() => setSnIntent("NORMAL")}
                />
                {t("modal.snAction.normal", lang)}
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-[color:var(--tts-border)] pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSnIntent("NORMAL");
                  setShowSnModal(false);
                }}
              >
                {t("modal.skip", lang)}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!snIntent || (snIntent === "REPLACE" && !replaceNewSn)}
                onClick={() => setShowSnModal(false)}
              >
                {t("modal.proceed", lang)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
