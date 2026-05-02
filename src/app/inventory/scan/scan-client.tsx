"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ClientCombobox, Field, Note, Row, Select } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type ItemOpt = { value: string; label: string; itemCode: string; itemName: string };
type WhOpt = { value: string; label: string; warehouseType: string };
type ClOpt = { value: string; label: string };
type Props = { items: ItemOpt[]; warehouses: WhOpt[]; clients: ClOpt[]; lang: Lang };

// QR 다중 스캔 누적 → 단일 입출고 이벤트로 일괄 처리.
// 1) 스캐너를 켜고 여러 S/N 을 연속 스캔 (각 스캔 = 1품목 항목 추가)
// 2) 첫 스캔의 master 상태에서 추천 시나리오 자동 prefil
// 3) 사용자가 시나리오 검토·수정 후 모든 항목을 bulk endpoint 로 한 번에 등록

const SCANNER_ELEMENT_ID = "qr-scanner-region";

type ScannedItem = {
  serialNumber: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  state: string; // NEW | OWN_IN_STOCK | OWN_AT_EXTERNAL | EXTERNAL_IN_STOCK | EXTERNAL_AT_VENDOR | ARCHIVED
  ownerType?: "COMPANY" | "EXTERNAL_CLIENT";
  ownerClientId?: string | null;
  ownerClientLabel?: string | null;
  currentLocationLabel?: string | null;
  warehouseCode?: string;
  recommendations: { txnType: "IN" | "OUT" | "TRANSFER"; refModule: string; subKind: string; labelKey: string; reason: string }[];
};

export function ScanClient({ items, warehouses, lang }: Props) {
  const router = useRouter();
  const scannerRef = useRef<{ stop: () => void; clear: () => void } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 누적 스캔 항목
  const [scanned, setScanned] = useState<ScannedItem[]>([]);
  // dedupe + 빠른 비교용
  const scannedSnRef = useRef<Set<string>>(new Set());
  // 동시 처리 차단 — handleDecoded 가 fetch 대기 중일 때 같은 SN 재진입 방지
  const inflightSnRef = useRef<Set<string>>(new Set());
  // 마지막 스캔 시각 — 짧은 쿨다운(1.5s) 동안 새 SN 도 무시 (카메라 안정화)
  const lastScanAtRef = useRef<number>(0);
  // 시각적 성공 플래시
  const [flashSn, setFlashSn] = useState<string | null>(null);

  // 헤더 — 첫 스캔 시 추천 첫 항목으로 자동 prefil
  const [txnType, setTxnType] = useState<"IN" | "OUT" | "TRANSFER">("IN");
  const [comboKey, setComboKey] = useState<string>("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [clientId, setClientId] = useState("");
  const [fromClientId, setFromClientId] = useState("");
  const [toClientId, setToClientId] = useState("");
  const [targetEquipmentSN, setTargetEquipmentSN] = useState("");

  const internalWhs = useMemo(() => warehouses.filter((w) => w.warehouseType !== "EXTERNAL"), [warehouses]);
  const whOptions = internalWhs.map((w) => ({ value: w.value, label: w.label }));

  // 누적 스캔에서 발견된 추천을 기반으로 헤더 시나리오 옵션 후보군 추출
  const allRecommendations = scanned.flatMap((s) => s.recommendations);
  const distinctRecKeys = Array.from(new Set(allRecommendations.map((r) => `${r.txnType}|${r.refModule}|${r.subKind}|${r.labelKey}`)));
  const comboOptions = distinctRecKeys.map((k) => {
    const [tp, refM, sk, key] = k.split("|");
    return { value: `${tp}|${refM}|${sk}`, label: t(key, lang), tp: tp as "IN" | "OUT" | "TRANSFER" };
  });
  // 현재 선택된 콤보의 (tp, refM, sk)
  const [refModule, subKind] = (comboKey.split("|").length === 3) ? comboKey.split("|").slice(1) : ["", ""];

  async function startScan() {
    setError(null);
    setOkMsg(null);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      const qrboxFn = (vw: number, vh: number) => {
        const minEdge = Math.min(vw, vh);
        const size = Math.floor(minEdge * 0.88);
        return { width: size, height: size };
      };
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: qrboxFn,
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: { ideal: "environment" },
            focusMode: "continuous",
          } as MediaTrackConstraints,
        },
        (decodedText) => {
          // 다중 스캔: 콜백마다 누적, 스캐너는 계속 동작
          handleDecoded(decodedText);
        },
        () => {},
      );
      scannerRef.current = { stop: () => scanner.stop().catch(() => undefined), clear: () => scanner.clear() };
      setScanning(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera init failed");
    }
  }

  async function stopScan() {
    const s = scannerRef.current;
    if (s) {
      try { await s.stop(); s.clear(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  }

  // 디코드 → S/N 추출 → state lookup → 항목 추가
  async function handleDecoded(text: string) {
    // 보이지 않는 unicode 문자(zero-width / BOM / 양방향 마커)만 제거.
    // ⚠ 과거 버그: /[ -​-‏﻿]/ 는 U+0020~U+200B 의 범위로 해석되어 모든 ASCII 를 통째로 지움.
    let sn = text.trim().replace(/[​-‏﻿]/g, "");
    try {
      const parsed = JSON.parse(sn) as { serialNumber?: string; itemCode?: string };
      if (parsed.serialNumber) sn = parsed.serialNumber;
      else if (parsed.itemCode) sn = parsed.itemCode;
    } catch { /* plain */ }

    if (!sn) return;
    // 1) 이미 추가된 SN 이면 무시 (조용히 — 사용자 메시지로 노이즈 방지)
    if (scannedSnRef.current.has(sn)) return;
    // 2) 같은 SN 이 fetch 대기 중이면 무시 (handleDecoded 가 fps 15로 쏟아지는 콜백을 동시 처리하지 않도록)
    if (inflightSnRef.current.has(sn)) return;
    // 3) 직전 성공 후 1.5초 이내에는 새 SN 도 무시 (카메라가 같은 라벨을 다른 SN 처럼 잠깐 잘못 디코드하는 케이스 차단)
    const now = Date.now();
    if (now - lastScanAtRef.current < 1500) return;

    inflightSnRef.current.add(sn);
    try {
      const r = await fetch(`/api/inventory/sn/${encodeURIComponent(sn)}/state`).then((r) => r.json());
      if (r?.state === "ARCHIVED") {
        setError(t("scan.archived", lang).replace("{sn}", sn));
        return;
      }
      // 마스터 없는 신규 케이스 — itemCode/사용자가 별도로 입력해야. 현재는 허용 안 함 (나중에 신규 IN 흐름 별도)
      if (!r?.master) {
        // 신규 S/N — items prop 에서 itemId 매칭 시도 안 함, 사용자가 신규IN 폼으로 가도록 안내
        setError(t("scan.newSnUseForm", lang).replace("{sn}", sn));
        return;
      }
      const newItem: ScannedItem = {
        serialNumber: r.master.serialNumber,
        itemId: r.master.itemId,
        itemCode: r.master.itemCode,
        itemName: r.master.itemName,
        state: r.state,
        ownerType: r.master.ownerType,
        ownerClientId: r.master.ownerClientId,
        ownerClientLabel: r.master.ownerClientLabel,
        currentLocationLabel: r.master.currentLocationClientLabel,
        warehouseCode: r.master.warehouseCode,
        recommendations: r.recommendations ?? [],
      };
      scannedSnRef.current.add(sn);
      setScanned((cur) => {
        const next = [...cur, newItem];
        // 첫 스캔이면 헤더 자동 prefil
        if (cur.length === 0 && newItem.recommendations[0]) {
          const rec = newItem.recommendations[0];
          setTxnType(rec.txnType);
          setComboKey(`${rec.txnType}|${rec.refModule}|${rec.subKind}`);
          // 자사 출고 시 fromWh 추론, 자사 IN 회수 시 toWh 추론
          if (rec.txnType === "OUT" && r.master.warehouseId) setFromWarehouseId(r.master.warehouseId);
          if (rec.txnType === "IN" && r.master.warehouseId) setToWarehouseId(r.master.warehouseId);
          // 외부자산이면 ownerClient 자동
          if (r.master.ownerClientId) setClientId(r.master.ownerClientId);
        }
        // 메시지에 정확한 누적 카운트 반영 (stale closure 회피 — 콜백 내부의 next.length 사용)
        setOkMsg(t("scan.added", lang).replace("{sn}", sn).replace("{n}", String(next.length)));
        return next;
      });
      setError(null);
      // 성공 플래시 — 잔상 800ms
      lastScanAtRef.current = Date.now();
      setFlashSn(sn);
      window.setTimeout(() => setFlashSn((cur) => (cur === sn ? null : cur)), 800);
      // 짧은 진동 피드백 (지원 기기에서만)
      try { (navigator as Navigator & { vibrate?: (n: number) => boolean }).vibrate?.(60); } catch { /* noop */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "scan lookup failed");
    } finally {
      inflightSnRef.current.delete(sn);
    }
  }

  function removeScanned(sn: string) {
    scannedSnRef.current.delete(sn);
    setScanned((cur) => cur.filter((x) => x.serialNumber !== sn));
  }
  function clearAll() {
    scannedSnRef.current.clear();
    setScanned([]);
    setComboKey("");
    setError(null);
    setOkMsg(null);
  }

  useEffect(() => {
    return () => { void stopScan(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    setError(null);
    setOkMsg(null);
    if (scanned.length === 0) { setError(t("scan.noScannedItems", lang)); return; }
    if (!comboKey) { setError(t("scan.selectScenario", lang)); return; }
    const [, refM, sk] = comboKey.split("|");
    const isConsumable = sk === "CONSUMABLE";
    if (txnType === "IN" && !toWarehouseId) { setError(t("msg.toWhRequired", lang)); return; }
    if (txnType === "OUT" && (!fromWarehouseId || !clientId)) { setError(t("msg.fromWhAndClientRequired", lang)); return; }
    if (txnType === "TRANSFER" && (!fromClientId || !toClientId)) { setError(t("msg.bothClientsRequired", lang)); return; }
    if (isConsumable && !targetEquipmentSN) { setError(t("msg.targetEquipRequired", lang)); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txnType,
          referenceModule: refM,
          subKind: sk,
          fromWarehouseId: fromWarehouseId || null,
          toWarehouseId: toWarehouseId || null,
          clientId: clientId || null,
          fromClientId: fromClientId || null,
          toClientId: toClientId || null,
          items: scanned.map((s) => ({
            itemId: s.itemId,
            serialNumber: s.serialNumber,
            quantity: 1,
            targetEquipmentSN: isConsumable ? targetEquipmentSN : null,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? `${data.error}: ${JSON.stringify(data.details ?? "")}` : t("msg.txnSaveFail", lang));
        return;
      }
      const body = (await res.json().catch(() => null)) as { count?: number } | null;
      setOkMsg(t("msg.txnBulkDone", lang).replace("{n}", String(body?.count ?? scanned.length)));
      // 성공 후 리셋 (헤더 유지 — 연속 사용 편의)
      clearAll();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Note tone="info">
        {t("scan.guideMulti", lang)}
      </Note>

      <div className="relative mx-auto my-3 aspect-square w-full max-w-2xl">
        <div
          id={SCANNER_ELEMENT_ID}
          className="absolute inset-0 overflow-hidden rounded-md border-2 border-[color:var(--tts-accent)] bg-black"
          style={{ minHeight: 360 }}
        />
        {/* 시작 전 상태 — 중앙 큰 탭 타겟 오버레이 (PC/모바일 동일하게 보임) */}
        {!scanning && (
          <button
            type="button"
            onClick={startScan}
            className="absolute inset-0 flex flex-col items-center justify-center rounded-md bg-black/60 text-white transition hover:bg-black/70"
          >
            <span className="text-[64px] leading-none">📷</span>
            <span className="mt-3 rounded-md bg-[color:var(--tts-accent)] px-5 py-2 text-[15px] font-extrabold shadow-lg">
              {t("action.scanCamera", lang)}
            </span>
          </button>
        )}
        {/* 성공 플래시 — 800ms */}
        {flashSn && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md border-4 border-emerald-400 bg-emerald-500/35 animate-pulse"
            style={{ animationIterationCount: 1, animationDuration: "800ms" }}
          >
            <div className="rounded-lg bg-emerald-600/95 px-4 py-2 text-center text-white shadow-2xl">
              <div className="text-[26px] leading-none">✓</div>
              <div className="mt-1 font-mono text-[11px]">{flashSn}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {scanning && (
          <Button onClick={stopScan} variant="danger">⏹ {t("action.scanStop", lang)}</Button>
        )}
        <Badge tone="primary">{t("scan.scannedCount", lang).replace("{n}", String(scanned.length))}</Badge>
        {scanned.length > 0 && (
          <Button type="button" variant="ghost" onClick={clearAll}>↻ {t("scan.clearAll", lang)}</Button>
        )}
      </div>

      {error && <div className="mb-3 rounded bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] font-semibold text-[color:var(--tts-danger)]">{error}</div>}
      {okMsg && <div className="mb-3 rounded bg-[color:var(--tts-success-dim)] px-3 py-2 text-[12px] font-semibold text-[color:var(--tts-success)]">{okMsg}</div>}

      {/* 누적 스캔 목록 */}
      {scanned.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <div className="text-[13px] font-extrabold text-[color:var(--tts-text)]">{t("scan.scannedListTitle", lang)}</div>
          {scanned.map((s, idx) => (
            <div key={s.serialNumber} className="flex flex-wrap items-center gap-2 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)]/40 p-2 text-[12px]">
              <span className="w-8 font-mono font-bold text-[color:var(--tts-muted)]">{idx + 1}</span>
              <span className="font-mono text-[color:var(--tts-primary)]">{s.serialNumber}</span>
              <span className="text-[color:var(--tts-text)]">{s.itemCode} · {s.itemName}</span>
              <Badge tone={s.ownerType === "EXTERNAL_CLIENT" ? "warn" : "primary"}>
                {s.ownerType === "EXTERNAL_CLIENT" ? `🏷 ${t("invItem.externalAsset", lang)}` : "🏠 자사"}
              </Badge>
              {s.warehouseCode && <Badge tone="neutral">{s.warehouseCode}</Badge>}
              {s.currentLocationLabel && <Badge tone="accent">→ {s.currentLocationLabel}</Badge>}
              {s.ownerClientLabel && <span className="text-[11px] text-[color:var(--tts-sub)]">소유: {s.ownerClientLabel}</span>}
              <button
                type="button"
                onClick={() => removeScanned(s.serialNumber)}
                className="ml-auto rounded border border-[color:var(--tts-danger)] bg-[color:var(--tts-danger-dim)] px-2 py-0.5 text-[12px] font-bold text-[color:var(--tts-danger)] hover:bg-[color:var(--tts-danger)] hover:text-white"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* 4축 헤더 — 추천에서 자동 채움, 사용자 수정 가능 */}
      {scanned.length > 0 && (
        <>
          <Row>
            <Field label={t("field.txnType", lang)} required width="240px">
              <div className="flex gap-1 rounded-md bg-[color:var(--tts-input)] p-1">
                {(["IN", "OUT", "TRANSFER"] as const).map((tp) => (
                  <button type="button" key={tp} onClick={() => { setTxnType(tp); setComboKey(""); }} className={`flex-1 rounded px-3 py-2 text-[13px] font-semibold transition ${txnType === tp ? "bg-[color:var(--tts-primary)] text-white" : "text-[color:var(--tts-sub)] hover:text-[color:var(--tts-text)]"}`}>
                    {tp === "IN" ? t("status.in", lang) : tp === "OUT" ? t("status.out", lang) : t("status.transfer", lang)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t("txn.scenarioLabel", lang)} required width="100%">
              <Select
                required
                value={comboKey}
                onChange={(e) => setComboKey(e.target.value)}
                placeholder={t("placeholder.select", lang)}
                options={comboOptions.filter((o) => o.tp === txnType).map((o) => ({ value: o.value, label: o.label }))}
              />
              {comboOptions.filter((o) => o.tp === txnType).length === 0 && (
                <div className="mt-1 text-[11px] text-[color:var(--tts-sub)]">{t("scan.noRecForType", lang)}</div>
              )}
            </Field>
          </Row>

          {txnType === "IN" && (
            <Row>
              <Field label={t("field.toWh", lang)} required>
                <Select required value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} placeholder={t("placeholder.select", lang)} options={whOptions} />
              </Field>
            </Row>
          )}
          {txnType === "OUT" && (
            <Row>
              <Field label={t("field.fromWh", lang)} required>
                <Select required value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} placeholder={t("placeholder.select", lang)} options={whOptions} />
              </Field>
              <Field label={t("field.clientCustomer", lang)} required>
                <ClientCombobox value={clientId} onChange={setClientId} required lang={lang} />
              </Field>
            </Row>
          )}
          {txnType === "TRANSFER" && (
            <Row>
              <Field label={t("field.fromClient", lang)} required>
                <ClientCombobox value={fromClientId} onChange={setFromClientId} required lang={lang} />
              </Field>
              <Field label={t("field.toClient", lang)} required>
                <ClientCombobox value={toClientId} onChange={setToClientId} required lang={lang} />
              </Field>
            </Row>
          )}

          {subKind === "CONSUMABLE" && (
            <Row>
              <Field label={t("field.targetEquipSN", lang)} required>
                <input
                  type="text"
                  required
                  value={targetEquipmentSN}
                  onChange={(e) => setTargetEquipmentSN(e.target.value)}
                  className="w-full rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)]"
                />
              </Field>
            </Row>
          )}

          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button onClick={handleSubmit} disabled={submitting || scanned.length === 0} variant="accent">
              {submitting ? t("action.saving", lang) : `${t("btn.txnComplete", lang)} (${scanned.length})`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
