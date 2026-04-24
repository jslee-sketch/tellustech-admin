"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Note, Row, Select, TextInput } from "@/components/ui";

type ItemOpt = { value: string; label: string; itemCode: string; itemName: string };
type WhOpt = { value: string; label: string; warehouseType: string };
type ClOpt = { value: string; label: string };
type Props = { items: ItemOpt[]; warehouses: WhOpt[]; clients: ClOpt[] };

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

const SCANNER_ELEMENT_ID = "qr-scanner-region";

export function ScanClient({ items, warehouses, clients }: Props) {
  const router = useRouter();
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

  function selectType(t: "IN" | "OUT" | "TRANSFER") {
    setTxnType(t);
    setReason(REASONS_BY_TYPE[t][0].value);
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
      setError(e instanceof Error ? e.message : "카메라 초기화 실패 (권한 확인)");
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
      setError("품목을 선택해주세요");
      return;
    }
    if (txnType === "IN" && !toWarehouseId) {
      setError("입고창고를 선택해주세요");
      return;
    }
    if (txnType === "OUT" && !fromWarehouseId) {
      setError("출고창고를 선택해주세요");
      return;
    }
    if (txnType === "TRANSFER" && (!fromWarehouseId || !toWarehouseId)) {
      setError("출고·입고 창고 모두 선택해주세요");
      return;
    }
    if (reason === "CONSUMABLE_OUT" && !targetEquipmentSN) {
      setError("소모품출고 시 대상 장비 S/N 필수");
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
        setLastResult({ ok: false, msg: data.error ?? "저장 실패" });
        return;
      }
      setLastResult({ ok: true, msg: `${txnType === "IN" ? "입고" : txnType === "OUT" ? "출고" : "이동"} 완료: ${serialNumber || itemId}` });
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
        QR 코드(/inventory/labels 에서 인쇄) 또는 일반 바코드를 비추면 품목/S/N 자동 채움 → 유형/사유/창고 선택 → ✅ 완료.
        소모품출고 시 대상 장비 S/N 필수.
      </Note>

      <div
        id={SCANNER_ELEMENT_ID}
        className="mx-auto my-3 aspect-video w-full max-w-lg overflow-hidden rounded-md border border-[color:var(--tts-border)] bg-black"
        style={{ minHeight: 240 }}
      />

      <div className="mb-3 flex items-center gap-2">
        {!scanning ? (
          <Button onClick={startScan} variant="accent">📷 카메라 시작</Button>
        ) : (
          <Button onClick={stopScan} variant="danger">⏹ 중지</Button>
        )}
        {decoded && (
          <Badge tone="success">
            감지: {decoded.itemCode || decoded.serialNumber}{decoded.contractNumber ? ` (계약 ${decoded.contractNumber})` : ""}
          </Badge>
        )}
      </div>

      {error && <div className="mb-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}

      <Row>
        <Field label="유형" required width="360px">
          <div className="flex gap-1 rounded-md bg-[color:var(--tts-input)] p-1">
            {(["IN", "OUT", "TRANSFER"] as const).map((t) => (
              <button type="button" key={t} onClick={() => selectType(t)} className={`flex-1 rounded px-3 py-2 text-[13px] font-semibold transition ${txnType === t ? "bg-[color:var(--tts-primary)] text-white" : "text-[color:var(--tts-sub)] hover:text-[color:var(--tts-text)]"}`}>
                {t === "IN" ? "입고" : t === "OUT" ? "출고" : "이동"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="사유" required width="180px">
          <Select required value={reason} onChange={(e) => setReason(e.target.value)} options={REASONS_BY_TYPE[txnType]} />
        </Field>
      </Row>

      <Row>
        <Field label="품목 (QR 자동)" required>
          <Select required value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="QR 스캔 또는 선택" options={items.map((i) => ({ value: i.value, label: i.label }))} />
        </Field>
        <Field label="S/N">
          <TextInput value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="QR 자동" />
        </Field>
      </Row>

      <Row>
        {(txnType === "OUT" || txnType === "TRANSFER") && (
          <Field label="출고창고" required>
            <Select required value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} placeholder="선택" options={internalWhs.map((w) => ({ value: w.value, label: w.label }))} />
          </Field>
        )}
        {(txnType === "IN" || txnType === "TRANSFER") && (
          <Field label="입고창고" required>
            <Select required value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} placeholder="선택" options={(txnType === "TRANSFER" ? warehouses : internalWhs).map((w) => ({ value: w.value, label: w.label }))} />
          </Field>
        )}
      </Row>

      {showClient && (
        <Row>
          <Field label={txnType === "OUT" ? "고객 (납품처)" : "고객 (External 창고)"}>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="선택" options={clients} />
          </Field>
        </Row>
      )}

      {showTargetEquip && (
        <Row>
          <Field label="대상 장비 S/N" required>
            <TextInput required value={targetEquipmentSN} onChange={(e) => setTargetEquipmentSN(e.target.value)} placeholder="이 소모품을 사용할 IT계약 장비의 S/N" />
          </Field>
        </Row>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button onClick={handleSubmit} disabled={submitting || !itemId} variant="accent">
          {submitting ? "저장 중..." : "✅ 입출고 완료"}
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
