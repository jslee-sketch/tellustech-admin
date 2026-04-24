"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Note, Row, Select } from "@/components/ui";

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

// Quagga2 는 브라우저 전용 — 동적 import 로만 사용.

export function ScanClient({ items, warehouses }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLDivElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [txnType, setTxnType] = useState("IN");
  const [reason, setReason] = useState("PURCHASE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function startScan() {
    setError(null);
    setLastResult(null);
    if (!videoRef.current) return;

    try {
      const Quagga = (await import("@ericblade/quagga2")).default;
      await Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            target: videoRef.current,
            constraints: { facingMode: "environment" },
          },
          decoder: {
            readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader", "code_93_reader"],
          },
        },
        (err: unknown) => {
          if (err) {
            setError(err instanceof Error ? err.message : "카메라 초기화 실패");
            return;
          }
          Quagga.start();
          setScanning(true);
        },
      );
      Quagga.onDetected((result) => {
        const code = result?.codeResult?.code;
        if (!code) return;
        setLastCode(code);
        Quagga.stop();
        setScanning(false);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "스캔 시작 실패");
    }
  }

  async function stopScan() {
    try {
      const Quagga = (await import("@ericblade/quagga2")).default;
      Quagga.stop();
    } catch {
      // ignore
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      void stopScan();
    };
  }, []);

  async function handleSubmit() {
    if (!lastCode || !itemId || !warehouseId) {
      setError("바코드/품목/창고가 모두 선택되어야 합니다");
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
          warehouseId,
          txnType,
          reason,
          quantity: "1",
          serialNumber: lastCode, // 편의상 S/N 과 동일하게 채움 — 사용자가 입출고 폼에서 분리 수정 가능
          scannedBarcode: lastCode,
        }),
      });
      if (!res.ok) {
        setLastResult({ ok: false, msg: "저장 실패" });
        return;
      }
      setLastResult({ ok: true, msg: `${txnType === "IN" ? "입고" : "출고"} 완료: ${lastCode}` });
      setLastCode(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Note tone="info">
        스마트폰 후면 카메라로 바코드를 비추면 자동 감지 → 품목·창고·사유 선택 → 완료 버튼. 대상: Code 128/39/93, EAN-13/8.
      </Note>

      <div
        ref={videoRef}
        className="mx-auto my-3 aspect-video w-full max-w-lg overflow-hidden rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)]"
        style={{ minHeight: 240 }}
      />

      <div className="mb-3 flex gap-2">
        {!scanning ? (
          <Button onClick={startScan} variant="accent">
            📷 카메라 시작
          </Button>
        ) : (
          <Button onClick={stopScan} variant="danger">
            ⏹ 중지
          </Button>
        )}
        {lastCode && <Badge tone="success">감지: {lastCode}</Badge>}
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <Row>
        <Field label="방향" required width="120px">
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
        <Field label="사유" required>
          <Select required value={reason} onChange={(e) => setReason(e.target.value)} options={REASON_OPTIONS} />
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

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button onClick={handleSubmit} disabled={submitting || !lastCode} variant="accent">
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
