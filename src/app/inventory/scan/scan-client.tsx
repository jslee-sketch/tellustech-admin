"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ClientCombobox, Field, ItemCombobox, Note, Row, Select, SerialCombobox, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type ItemOpt = { value: string; label: string; itemCode: string; itemName: string };
type WhOpt = { value: string; label: string; warehouseType: string };
type ClOpt = { value: string; label: string };
type Props = { items: ItemOpt[]; warehouses: WhOpt[]; clients: ClOpt[]; lang: Lang };

function buildReasonsByType(lang: Lang): Record<string, { value: string; label: string }[]> {
  return {
    IN: [
      { value: "PURCHASE", label: t("reason.purchase", lang) },
      { value: "RETURN_IN", label: t("reason.returnIn", lang) },
      { value: "OTHER_IN", label: t("reason.otherIn", lang) },
    ],
    OUT: [
      { value: "SALE", label: t("reason.sale", lang) },
      { value: "CONSUMABLE_OUT", label: t("reason.consumableOut", lang) },
    ],
    TRANSFER: [
      { value: "CALIBRATION", label: t("reason.calibration", lang) },
      { value: "REPAIR", label: t("reason.repair", lang) },
      { value: "RENTAL", label: t("reason.rental", lang) },
      { value: "DEMO", label: t("reason.demo", lang) },
    ],
  };
}

const SCANNER_ELEMENT_ID = "qr-scanner-region";

export function ScanClient({ items, warehouses, clients, lang }: Props) {
  const router = useRouter();
  const REASONS_BY_TYPE = useMemo(() => buildReasonsByType(lang), [lang]);
  const scannerRef = useRef<{ stop: () => void; clear: () => void } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [decoded, setDecoded] = useState<{ itemCode: string; serialNumber: string | null; contractNumber: string | null } | null>(null);

  // Form state
  const [itemId, setItemId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [txnType, setTxnType] = useState<"IN" | "OUT" | "TRANSFER">("IN");
  const [reason, setReason] = useState("PURCHASE");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [clientId, setClientId] = useState("");
  const [targetEquipmentSN, setTargetEquipmentSN] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const internalWhs = useMemo(() => warehouses.filter((w) => w.warehouseType !== "EXTERNAL"), [warehouses]);
  const externalWhs = useMemo(() => warehouses.filter((w) => w.warehouseType === "EXTERNAL"), [warehouses]);

  function selectType(tp: "IN" | "OUT" | "TRANSFER") {
    setTxnType(tp);
    setReason(REASONS_BY_TYPE[tp][0].value);
    setFromWarehouseId("");
    setToWarehouseId("");
    setClientId("");
    setTargetEquipmentSN("");
  }

  const showClient =
    txnType === "OUT" ||
    (txnType === "TRANSFER" && toWarehouseId && externalWhs.some((w) => w.value === toWarehouseId));
  const showTargetEquip = reason === "CONSUMABLE_OUT";

  async function startScan() {
    setError(null);
    setLastResult(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          handleDecoded(decodedText);
          scanner.stop().then(() => scanner.clear()).catch(() => undefined);
          setScanning(false);
          scannerRef.current = null;
        },
        () => {}, // scan error per-frame — 무시
      );
      scannerRef.current = { stop: () => scanner.stop().catch(() => undefined), clear: () => scanner.clear() };
      setScanning(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("msg.cameraInitFail", lang));
    }
  }

  async function stopScan() {
    const s = scannerRef.current;
    if (s) {
      try {
        await s.stop();
        s.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }

  // 디코딩된 텍스트 처리 — JSON 이면 자동 채움, 아니면 S/N 필드에 raw 입력
  function handleDecoded(text: string) {
    try {
      const parsed = JSON.parse(text) as { itemCode?: string; serialNumber?: string; contractNumber?: string };
      if (parsed.itemCode) {
        const matched = items.find((i) => i.itemCode === parsed.itemCode);
        if (matched) setItemId(matched.value);
        if (parsed.serialNumber) setSerialNumber(parsed.serialNumber);
        setDecoded({
          itemCode: parsed.itemCode,
          serialNumber: parsed.serialNumber ?? null,
          contractNumber: parsed.contractNumber ?? null,
        });
        return;
      }
    } catch {
      // not JSON — raw barcode/text 로 간주
    }
    setSerialNumber(text);
    setDecoded({ itemCode: "", serialNumber: text, contractNumber: null });
  }

  useEffect(() => {
    return () => {
      void stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    if (!itemId) {
      setError(t("msg.itemRequired", lang));
      return;
    }
    if (txnType === "IN" && !toWarehouseId) {
      setError(t("msg.whInRequired", lang));
      return;
    }
    if (txnType === "OUT" && !fromWarehouseId) {
      setError(t("msg.whOutRequired", lang));
      return;
    }
    if (txnType === "TRANSFER" && (!fromWarehouseId || !toWarehouseId)) {
      setError(t("msg.whBothRequired", lang));
      return;
    }
    if (reason === "CONSUMABLE_OUT" && !targetEquipmentSN) {
      setError(t("msg.targetEquipRequired", lang));
      return;
    }
    setSubmitting(true);
    setError(null);
    setLastResult(null);
    try {
      const res = await fetch("/api/inventory/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          txnType,
          reason,
          quantity: "1",
          serialNumber: serialNumber || null,
          fromWarehouseId: fromWarehouseId || null,
          toWarehouseId: toWarehouseId || null,
          clientId: clientId || null,
          targetEquipmentSN: targetEquipmentSN || null,
          scannedBarcode: serialNumber || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLastResult({ ok: false, msg: data.error ?? t("msg.txnSaveFail", lang) });
        return;
      }
      const action = txnType === "IN" ? t("status.in", lang) : txnType === "OUT" ? t("status.out", lang) : t("status.transfer", lang);
      setLastResult({ ok: true, msg: t("msg.completedTxn", lang).replace("{action}", action).replace("{sn}", serialNumber || itemId) });
      // 폼 리셋 (타입/사유는 유지 — 연속 스캔 편의)
      setItemId("");
      setSerialNumber("");
      setTargetEquipmentSN("");
      setDecoded(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Note tone="info">
        {t("scan.guide.full", lang)}
        {" "}{t("scan.guide.consum", lang)}
      </Note>

      <div
        id={SCANNER_ELEMENT_ID}
        className="mx-auto my-3 aspect-video w-full max-w-lg overflow-hidden rounded-md border border-[color:var(--tts-border)] bg-black"
        style={{ minHeight: 240 }}
      />

      <div className="mb-3 flex items-center gap-2">
        {!scanning ? (
          <Button onClick={startScan} variant="accent">{t("action.scanCamera", lang)}</Button>
        ) : (
          <Button onClick={stopScan} variant="danger">{t("action.scanStop", lang)}</Button>
        )}
        {decoded && (
          <Badge tone="success">
            {t("msg.detected", lang)}: {decoded.itemCode || decoded.serialNumber}{decoded.contractNumber ? ` (${t("field.contractNumber", lang)} ${decoded.contractNumber})` : ""}
          </Badge>
        )}
      </div>

      {error && <div className="mb-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}

      <Row>
        <Field label={t("field.txnType", lang)} required width="360px">
          <div className="flex gap-1 rounded-md bg-[color:var(--tts-input)] p-1">
            {(["IN", "OUT", "TRANSFER"] as const).map((tp) => (
              <button type="button" key={tp} onClick={() => selectType(tp)} className={`flex-1 rounded px-3 py-2 text-[13px] font-semibold transition ${txnType === tp ? "bg-[color:var(--tts-primary)] text-white" : "text-[color:var(--tts-sub)] hover:text-[color:var(--tts-text)]"}`}>
                {tp === "IN" ? t("status.in", lang) : tp === "OUT" ? t("status.out", lang) : t("status.transfer", lang)}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("field.reason", lang)} required width="180px">
          <Select required value={reason} onChange={(e) => setReason(e.target.value)} options={REASONS_BY_TYPE[txnType]} />
        </Field>
      </Row>

      <Row>
        <Field label={t("field.itemAuto", lang)} required>
          <ItemCombobox value={itemId} onChange={setItemId} required lang={lang} />
        </Field>
        <Field label={t("field.serial", lang)}>
          <SerialCombobox value={serialNumber} onChange={setSerialNumber} itemId={itemId || undefined} lang={lang} />
        </Field>
      </Row>

      <Row>
        {(txnType === "OUT" || txnType === "TRANSFER") && (
          <Field label={t("field.warehouseOut", lang)} required>
            <Select required value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} placeholder={t("placeholder.select", lang)} options={internalWhs.map((w) => ({ value: w.value, label: w.label }))} />
          </Field>
        )}
        {(txnType === "IN" || txnType === "TRANSFER") && (
          <Field label={t("field.warehouseIn", lang)} required>
            <Select required value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} placeholder={t("placeholder.select", lang)} options={(txnType === "TRANSFER" ? warehouses : internalWhs).map((w) => ({ value: w.value, label: w.label }))} />
          </Field>
        )}
      </Row>

      {showClient && (
        <Row>
          <Field label={txnType === "OUT" ? t("field.clientCustomer", lang) : t("field.clientExternal", lang)}>
            <ClientCombobox value={clientId} onChange={setClientId} lang={lang} />
          </Field>
        </Row>
      )}

      {showTargetEquip && (
        <Row>
          <Field label={t("field.targetEquipSN", lang)} required>
            <SerialCombobox required value={targetEquipmentSN} onChange={setTargetEquipmentSN} lang={lang} />
          </Field>
        </Row>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button onClick={handleSubmit} disabled={submitting || !itemId} variant="accent">
          {submitting ? t("action.saving", lang) : t("btn.txnComplete", lang)}
        </Button>
        {lastResult && (
          <span className={lastResult.ok ? "text-[color:var(--tts-success)]" : "text-[color:var(--tts-danger)]"}>
            {lastResult.msg}
          </span>
        )}
      </div>
    </div>
  );
}
