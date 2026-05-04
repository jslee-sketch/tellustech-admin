"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button, ClientCombobox, Field, ItemCombobox, Note, Row, Select, SerialCombobox, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Props = {
  items: { value: string; label: string }[];
  warehouses: { value: string; label: string; warehouseType: string }[];
  clients?: { value: string; label: string }[];
  lang: Lang;
};

type LineRow = {
  key: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  serialNumber: string;
  quantity: string;
  targetEquipmentSN: string;
  note: string;
  masterState?: "NEW" | "OWN_IN_STOCK" | "OWN_AT_EXTERNAL" | "EXTERNAL_IN_STOCK" | "EXTERNAL_AT_VENDOR" | "ARCHIVED" | null;
  masterOwnerType?: "COMPANY" | "EXTERNAL_CLIENT" | null;
  masterArchived?: boolean;
  masterMessage?: string | null;
  masterChecking?: boolean;
};

let _key = 0;
const newKey = () => `r${++_key}`;
const blankLine = (): LineRow => ({ key: newKey(), itemId: "", serialNumber: "", quantity: "1", targetEquipmentSN: "", note: "" });

// state → 사용자 표시용 라벨
const STATE_LABEL: Record<NonNullable<LineRow["masterState"]>, { label: string; tone: "success" | "warn" | "info" | "danger" }> = {
  NEW: { label: "신규 (마스터 미등록)", tone: "info" },
  OWN_IN_STOCK: { label: "자사 재고 (창고 내)", tone: "success" },
  OWN_AT_EXTERNAL: { label: "자사 자산 (외부 위탁 중)", tone: "warn" },
  EXTERNAL_IN_STOCK: { label: "외부 자산 (자사 보관)", tone: "info" },
  EXTERNAL_AT_VENDOR: { label: "외부 자산 (외주 위탁)", tone: "warn" },
  ARCHIVED: { label: "ARCHIVED (반납·매각·폐기 완료)", tone: "danger" },
};

// 진리표 cascading: txnType → 가능한 (referenceModule, subKind) 조합
type Combo = { refModule: string; subKind: string; labelKey: string; ownerHint?: "COMPANY" | "EXTERNAL" | "AUTO" };
const COMBOS_BY_TYPE: Record<"IN" | "OUT" | "TRANSFER", Combo[]> = {
  IN: [
    { refModule: "RENTAL", subKind: "RETURN", labelKey: "txn.combo.rentalInReturn", ownerHint: "COMPANY" },
    { refModule: "RENTAL", subKind: "BORROW", labelKey: "txn.combo.rentalInBorrow", ownerHint: "EXTERNAL" },
    { refModule: "REPAIR", subKind: "REQUEST", labelKey: "txn.combo.repairInRequest", ownerHint: "EXTERNAL" },
    { refModule: "REPAIR", subKind: "RETURN", labelKey: "txn.combo.repairInReturn", ownerHint: "AUTO" },
    { refModule: "CALIB", subKind: "REQUEST", labelKey: "txn.combo.calibInRequest", ownerHint: "EXTERNAL" },
    { refModule: "CALIB", subKind: "RETURN", labelKey: "txn.combo.calibInReturn", ownerHint: "AUTO" },
    { refModule: "DEMO", subKind: "BORROW", labelKey: "txn.combo.demoInBorrow", ownerHint: "EXTERNAL" },
    { refModule: "DEMO", subKind: "RETURN", labelKey: "txn.combo.demoInReturn", ownerHint: "COMPANY" },
    { refModule: "TRADE", subKind: "PURCHASE", labelKey: "txn.combo.tradeInPurchase", ownerHint: "COMPANY" },
    { refModule: "TRADE", subKind: "OTHER", labelKey: "txn.combo.tradeInFound", ownerHint: "COMPANY" },
    { refModule: "TRADE", subKind: "ASSEMBLE", labelKey: "txn.combo.tradeInAssemble", ownerHint: "COMPANY" },
  ],
  OUT: [
    { refModule: "RENTAL", subKind: "RETURN", labelKey: "txn.combo.rentalOutReturn", ownerHint: "EXTERNAL" },
    { refModule: "RENTAL", subKind: "LEND", labelKey: "txn.combo.rentalOutLend", ownerHint: "COMPANY" },
    { refModule: "REPAIR", subKind: "REQUEST", labelKey: "txn.combo.repairOutRequest", ownerHint: "AUTO" },
    { refModule: "REPAIR", subKind: "RETURN", labelKey: "txn.combo.repairOutReturn", ownerHint: "EXTERNAL" },
    { refModule: "CALIB", subKind: "REQUEST", labelKey: "txn.combo.calibOutRequest", ownerHint: "AUTO" },
    { refModule: "CALIB", subKind: "RETURN", labelKey: "txn.combo.calibOutReturn", ownerHint: "EXTERNAL" },
    { refModule: "DEMO", subKind: "LEND", labelKey: "txn.combo.demoOutLend", ownerHint: "COMPANY" },
    { refModule: "DEMO", subKind: "RETURN", labelKey: "txn.combo.demoOutReturn", ownerHint: "EXTERNAL" },
    { refModule: "TRADE", subKind: "SALE", labelKey: "txn.combo.tradeOutSale", ownerHint: "COMPANY" },
    { refModule: "TRADE", subKind: "RETURN", labelKey: "txn.combo.tradeOutReturn", ownerHint: "COMPANY" },
    { refModule: "TRADE", subKind: "OTHER", labelKey: "txn.combo.tradeOutDispose", ownerHint: "COMPANY" },
    { refModule: "TRADE", subKind: "LOSS", labelKey: "txn.combo.tradeOutLost", ownerHint: "COMPANY" },
    { refModule: "TRADE", subKind: "SPLIT", labelKey: "txn.combo.tradeOutSplit", ownerHint: "COMPANY" },
    { refModule: "CONSUMABLE", subKind: "CONSUMABLE", labelKey: "txn.combo.consumableOut", ownerHint: "COMPANY" },
  ],
  TRANSFER: [
    // 자사 ↔ 자사 (기본값) — fromWarehouseId/toWarehouseId 사용
    { refModule: "TRADE", subKind: "OTHER", labelKey: "txn.combo.transferInternal", ownerHint: "COMPANY" },
    // 외부 ↔ 외부 — fromClientId/toClientId 사용
    { refModule: "RENTAL", subKind: "OTHER", labelKey: "txn.combo.transferRental", ownerHint: "EXTERNAL" },
    { refModule: "REPAIR", subKind: "OTHER", labelKey: "txn.combo.transferRepair", ownerHint: "EXTERNAL" },
    { refModule: "CALIB", subKind: "OTHER", labelKey: "txn.combo.transferCalib", ownerHint: "EXTERNAL" },
    { refModule: "DEMO", subKind: "OTHER", labelKey: "txn.combo.transferDemo", ownerHint: "EXTERNAL" },
  ],
};

export function TransactionNewForm({ items: _items, warehouses, lang }: Props) {
  const router = useRouter();

  // ── 헤더 ──
  const [txnType, setTxnType] = useState<"IN" | "OUT" | "TRANSFER">("IN");
  // 진리표 1줄 선택 — refModule + subKind 묶음
  const [comboKey, setComboKey] = useState<string>(() => {
    const c = COMBOS_BY_TYPE.IN[0];
    return `${c.refModule}|${c.subKind}`;
  });
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [clientId, setClientId] = useState("");
  const [fromClientId, setFromClientId] = useState("");
  const [toClientId, setToClientId] = useState("");
  const [headerNote, setHeaderNote] = useState("");

  // ── 라인 ── (default 빈 배열 — 사용자가 명시적으로 라인 추가해야 함)
  const [lines, setLines] = useState<LineRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const combos = COMBOS_BY_TYPE[txnType];
  const currentCombo = combos.find((c) => `${c.refModule}|${c.subKind}` === comboKey) ?? combos[0];
  const refModule = currentCombo.refModule;
  const subKind = currentCombo.subKind;

  const isExternalIn = txnType === "IN" && (currentCombo.ownerHint === "EXTERNAL");
  const isConsumable = subKind === "CONSUMABLE";
  // 자사 ↔ 자사 이동(TRADE/OTHER) 도 S/N 필수. 외주 ↔ 외주 이동도 마스터 위치 갱신을 위해 필수.
  const isInternalTransfer = txnType === "TRANSFER" && refModule === "TRADE";
  const snRequiredOnLines = !isConsumable;
  // ownerHint=AUTO → 마스터 조회로 결정. 사용자가 거래처 입력하면 외주처(EXTERNAL_CLIENT)로 추론.
  // 단순화: AUTO 케이스에서도 거래처 picker 노출.
  const showOwnerClient = txnType === "IN" && (currentCombo.ownerHint === "EXTERNAL" || currentCombo.ownerHint === "AUTO");

  const internalWarehouses = useMemo(() => warehouses.filter((w) => w.warehouseType !== "EXTERNAL"), [warehouses]);
  const whOptions = internalWarehouses.map((w) => ({ value: w.value, label: w.label }));
  // OUT 도착창고는 자사+외부 모두 허용 (외부 거래처 보관 / 외주처 위탁 등)
  const whAllOptions = warehouses.map((w) => ({ value: w.value, label: `${w.label}${w.warehouseType === "EXTERNAL" ? " (외부)" : ""}` }));

  function selectType(type: "IN" | "OUT" | "TRANSFER") {
    setTxnType(type);
    const first = COMBOS_BY_TYPE[type][0];
    setComboKey(`${first.refModule}|${first.subKind}`);
    setFromWarehouseId("");
    setToWarehouseId("");
    setFromClientId("");
    setToClientId("");
    setClientId("");
    setError(null);
    setOkMsg(null);
  }

  function updateLine(idx: number, patch: Partial<LineRow>) {
    setLines((cur) => cur.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addLine() { setLines((cur) => [...cur, blankLine()]); }
  function addLines(n: number) { setLines((cur) => [...cur, ...Array.from({ length: n }, blankLine)]); }
  function removeLine(idx: number) { setLines((cur) => cur.filter((_, i) => i !== idx)); }
  function clearLines() { setLines([]); }

  // S/N 픽 시 마스터 상태 조회 + 자동 매핑
  async function onPickSerial(idx: number, opt: { serialNumber: string; itemId: string; itemCode?: string; itemName?: string }) {
    updateLine(idx, {
      serialNumber: opt.serialNumber,
      itemId: opt.itemId,
      itemCode: opt.itemCode,
      itemName: opt.itemName,
      masterChecking: true,
      masterMessage: null,
    });
    try {
      const r = await fetch(`/api/inventory/sn/${encodeURIComponent(opt.serialNumber)}/state`).then((x) => x.json());
      const m = r?.master ?? r?.data?.master;
      const state = (r?.state ?? r?.data?.state ?? null) as LineRow["masterState"];
      updateLine(idx, {
        masterChecking: false,
        masterState: state,
        masterOwnerType: m?.ownerType ?? null,
        masterArchived: !!m?.archivedAt,
        masterMessage: state ? STATE_LABEL[state]?.label ?? null : null,
      });
    } catch {
      updateLine(idx, { masterChecking: false, masterMessage: t("msg.masterCheckFailed", lang) });
    }
  }
  // 직접 S/N 입력(blur) 시도 마스터 조회
  async function onSerialBlur(idx: number, sn: string) {
    if (!sn || !sn.trim()) return;
    updateLine(idx, { masterChecking: true, masterMessage: null });
    try {
      const r = await fetch(`/api/inventory/sn/${encodeURIComponent(sn.trim())}/state`).then((x) => x.json());
      const m = r?.master ?? r?.data?.master;
      const state = (r?.state ?? r?.data?.state ?? null) as LineRow["masterState"];
      const patch: Partial<LineRow> = {
        masterChecking: false,
        masterState: state,
        masterOwnerType: m?.ownerType ?? null,
        masterArchived: !!m?.archivedAt,
        masterMessage: state ? STATE_LABEL[state]?.label ?? null : null,
      };
      // master 가 있으면 itemId 자동 셋팅 (마스터 itemCode 우선) — S/N 1개 = 품목 1개 정책
      if (m?.itemId) {
        patch.itemId = m.itemId;
        patch.itemCode = m.itemCode ?? "";
        patch.itemName = m.itemName ?? "";
      }
      updateLine(idx, patch);
    } catch {
      updateLine(idx, { masterChecking: false, masterMessage: t("msg.masterCheckFailed", lang) });
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const text = e.clipboardData.getData("text");
    if (!text || (!text.includes("\t") && !text.includes("\n"))) return;
    e.preventDefault();
    const rows = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const itemByCode = new Map(_items.map((it) => {
      const code = it.label.split(" ")[0];
      return [code, it.value];
    }));
    const next: LineRow[] = rows.map((row) => {
      const cols = row.split("\t");
      return {
        key: newKey(),
        itemId: itemByCode.get((cols[0] ?? "").trim()) ?? "",
        serialNumber: (cols[1] ?? "").trim(),
        quantity: ((cols[2] ?? "1").trim() || "1"),
        targetEquipmentSN: (cols[3] ?? "").trim(),
        note: (cols[4] ?? "").trim(),
      };
    });
    if (next.length > 0) setLines(next);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setOkMsg(null);

    const usable = lines.filter((l) => l.itemId);
    if (usable.length === 0) {
      setError(t("msg.atLeastOneLine", lang));
      setSubmitting(false);
      return;
    }
    // 라인 모두 필수: 품목 + S/N + 수량 (정책 G)
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.itemId) { setError(`${i + 1}행: 품목을 선택하세요`); setSubmitting(false); return; }
      if (snRequiredOnLines && !l.serialNumber.trim()) { setError(`${i + 1}행: S/N을 입력하세요`); setSubmitting(false); return; }
      const q = Number(l.quantity || "0");
      if (!Number.isFinite(q) || q < 1) { setError(`${i + 1}행: 수량은 1 이상`); setSubmitting(false); return; }
    }
    // 정책 E — ARCHIVED + EXTERNAL_CLIENT 자산은 OUT 차단 (재입고/이동만 가능)
    if (txnType === "OUT") {
      const blockedIdx = lines.findIndex((l) => l.masterArchived && l.masterOwnerType === "EXTERNAL_CLIENT");
      if (blockedIdx >= 0) {
        setError(`${blockedIdx + 1}행: 외부 자산이 반납 완료(ARCHIVED) 상태 — 출고 불가 (재입고/이동만 가능)`);
        setSubmitting(false);
        return;
      }
    }
    // 정책 C — IN(매입 등 마스터 신규 생성)이 아닌데 OUT/TRANSFER 인 경우, 마스터 없는 S/N 차단
    // 단 정책: TRANSFER 의 경우 마스터 없는 S/N 도 허용 (이번에 NEW 등록되는 것으로 간주)
    if (txnType === "OUT") {
      const noMaster = lines.findIndex((l) => l.masterState === "NEW" || l.masterState === null);
      if (noMaster >= 0) {
        setError(`${noMaster + 1}행: 출고할 자산이 마스터에 없음 — 먼저 입고/매입 등록 필요`);
        setSubmitting(false);
        return;
      }
    }
    if (txnType === "IN" && !toWarehouseId) {
      setError(t("msg.toWhRequired", lang));
      setSubmitting(false);
      return;
    }
    if (txnType === "OUT" && (!fromWarehouseId || !clientId)) {
      setError(t("msg.fromWhAndClientRequired", lang));
      setSubmitting(false);
      return;
    }
    if (txnType === "TRANSFER") {
      if (isInternalTransfer) {
        if (!fromWarehouseId || !toWarehouseId) {
          setError(t("msg.bothWarehousesRequired", lang));
          setSubmitting(false);
          return;
        }
        if (fromWarehouseId === toWarehouseId) {
          setError(t("msg.transferSameEndpoint", lang));
          setSubmitting(false);
          return;
        }
      } else {
        if (!fromClientId || !toClientId) {
          setError(t("msg.bothClientsRequired", lang));
          setSubmitting(false);
          return;
        }
        if (fromClientId === toClientId) {
          setError(t("msg.transferSameEndpoint", lang));
          setSubmitting(false);
          return;
        }
      }
    }
    if (showOwnerClient && txnType === "IN" && !clientId) {
      setError(t("msg.externalRequiresClient", lang));
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/inventory/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txnType,
          referenceModule: refModule,
          subKind,
          fromWarehouseId: fromWarehouseId || null,
          toWarehouseId: toWarehouseId || null,
          clientId: clientId || null,
          fromClientId: fromClientId || null,
          toClientId: toClientId || null,
          note: headerNote || null,
          items: usable.map((l) => ({
            itemId: l.itemId,
            serialNumber: l.serialNumber || null,
            quantity: Number(l.quantity || 1),
            targetEquipmentSN: l.targetEquipmentSN || null,
            note: l.note || null,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? `${data.error}: ${JSON.stringify(data.details ?? "")}` : t("msg.saveFailedShort", lang));
        return;
      }
      const body = (await res.json().catch(() => null)) as { count?: number } | null;
      setOkMsg(t("msg.txnBulkDone", lang).replace("{n}", String(body?.count ?? usable.length)));
      router.refresh();
      clearLines();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Row>
        <Field label={t("field.txnType", lang)} required width="160px">
          <Select
            value={txnType}
            onChange={(e) => selectType(e.target.value as "IN" | "OUT" | "TRANSFER")}
            options={[
              { value: "IN", label: t("txnType.in", lang) },
              { value: "OUT", label: t("txnType.out", lang) },
              { value: "TRANSFER", label: t("txnType.transfer", lang) },
            ]}
          />
        </Field>
        <Field label={t("txn.scenarioLabel", lang)} required width="100%">
          <Select
            required
            value={comboKey}
            onChange={(e) => setComboKey(e.target.value)}
            options={combos.map((c) => ({ value: `${c.refModule}|${c.subKind}`, label: t(c.labelKey, lang) }))}
          />
        </Field>
      </Row>

      {/* 헤더 */}
      {txnType === "IN" && (
        <Row>
          <Field label={t("field.toWh", lang)} required>
            <Select
              required
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(e.target.value)}
              placeholder={t("placeholder.select", lang)}
              options={whAllOptions}
            />
          </Field>
          {showOwnerClient && (
            <Field label={t("field.ownerClient", lang)} required={isExternalIn}>
              <ClientCombobox value={clientId} onChange={setClientId} required={isExternalIn} lang={lang} />
            </Field>
          )}
        </Row>
      )}
      {txnType === "OUT" && (
        <Row>
          <Field label={t("field.fromWh", lang)} required>
            <Select
              required
              value={fromWarehouseId}
              onChange={(e) => setFromWarehouseId(e.target.value)}
              placeholder={t("placeholder.select", lang)}
              options={whOptions}
            />
          </Field>
          <Field label={t("field.toWh", lang)}>
            <Select
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(e.target.value)}
              placeholder={t("placeholder.select", lang)}
              options={whAllOptions}
            />
          </Field>
          <Field label={t("field.clientCustomer", lang)} required>
            <ClientCombobox value={clientId} onChange={setClientId} required lang={lang} />
          </Field>
        </Row>
      )}
      {txnType === "TRANSFER" && isInternalTransfer && (
        <>
          <Row>
            <Field label={t("field.fromWarehouse", lang)} required>
              <Select value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} options={whOptions} />
            </Field>
            <Field label={t("field.toWarehouse", lang)} required>
              <Select value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} options={whOptions} />
            </Field>
          </Row>
          <Note tone="info">
            <span className="font-bold">{t("txnGuide.title", lang)}</span><br/>
            {t("txnGuide.internalTransfer", lang)}
          </Note>
        </>
      )}
      {txnType === "TRANSFER" && !isInternalTransfer && (
        <>
          <Row>
            <Field label={t("field.fromClient", lang)} required>
              <ClientCombobox value={fromClientId} onChange={setFromClientId} required lang={lang} />
            </Field>
            <Field label={t("field.toClient", lang)} required>
              <ClientCombobox value={toClientId} onChange={setToClientId} required lang={lang} />
            </Field>
          </Row>
          <Note tone="info">
            <span className="font-bold">{t("txnGuide.title", lang)}</span><br/>
            {t("txnGuide.passthrough", lang)}
          </Note>
        </>
      )}

      <Row>
        <Field label={t("field.note", lang)}>
          <TextInput value={headerNote} onChange={(e) => setHeaderNote(e.target.value)} placeholder={t("placeholder.headerNote", lang)} />
        </Field>
      </Row>

      {/* 라인 테이블 */}
      <div className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)]/40 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[14px] font-extrabold text-[color:var(--tts-text)]">
            {t("txnBulk.linesTitle", lang)} <span className="ml-2 rounded bg-[color:var(--tts-primary-dim)] px-2 py-0.5 text-[12px] text-[color:var(--tts-primary)]">{lines.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="ghost" onClick={() => addLine()}>+ {t("txnBulk.addLine", lang)}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => addLines(10)}>+10</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => addLines(50)}>+50</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => addLines(100)}>+100</Button>
            <Button type="button" size="sm" variant="ghost" onClick={clearLines}>↻ {t("txnBulk.reset", lang)}</Button>
          </div>
        </div>

        <div className="mb-2 text-[11px] text-[color:var(--tts-sub)]">{t("txnBulk.pasteHint", lang)}</div>
        <textarea
          rows={2}
          placeholder={t("txnBulk.pasteAreaPh", lang)}
          onPaste={handlePaste}
          className="mb-3 w-full rounded border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px] font-mono text-[color:var(--tts-sub)]"
        />

        {/* 라인 카드 — overflow 없음, dropdown 시각 차단 없음. required 는 JS 에서 검증. */}
        <div className="space-y-2">
          {/* 헤더 라벨 */}
          <div className="hidden gap-2 px-2 text-[11px] font-bold text-[color:var(--tts-sub)] md:flex">
            <span className="w-8 shrink-0">#</span>
            <span className="flex-1 min-w-0">{t("field.item", lang)} *</span>
            <span className="w-[220px] shrink-0">{t("field.serial", lang)}{snRequiredOnLines ? " *" : ""}</span>
            <span className="w-20 shrink-0 text-right">{t("field.qty", lang)}</span>
            {isConsumable && <span className="w-[200px] shrink-0">{t("field.targetEquipSN", lang)} *</span>}
            <span className="flex-1 min-w-0">{t("field.note", lang)}</span>
            <span className="w-10 shrink-0" />
          </div>
          {lines.map((row, idx) => (
            <div key={row.key} className="flex flex-wrap items-start gap-2 rounded border border-[color:var(--tts-border)]/40 bg-[color:var(--tts-card)] p-2 md:flex-nowrap">
              <span className="w-8 shrink-0 pt-2 font-mono text-[12px] font-bold text-[color:var(--tts-muted)]">{idx + 1}</span>
              {/* S/N 우선 입력 — 마스터 조회 → 품목 자동 매핑. 사용자가 S/N 픽 후엔 품목 readonly. */}
              <div className="w-full md:w-[240px] shrink-0">
                <SerialCombobox
                  value={row.serialNumber}
                  onChange={(v) => updateLine(idx, { serialNumber: v, itemId: v ? row.itemId : "" })}
                  onPick={(opt) => onPickSerial(idx, opt)}
                  onBlur={() => onSerialBlur(idx, row.serialNumber)}
                  itemId={row.itemId || undefined}
                  lang={lang}
                />
                {/* 마스터 상태 배지 */}
                {row.masterChecking && <div className="mt-1 text-[10px] text-[color:var(--tts-sub)]">조회 중…</div>}
                {!row.masterChecking && row.masterMessage && (
                  <div className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    row.masterState === "OWN_IN_STOCK" ? "bg-emerald-500/20 text-emerald-600" :
                    row.masterState === "ARCHIVED" ? "bg-rose-500/20 text-rose-600" :
                    row.masterState === "OWN_AT_EXTERNAL" || row.masterState === "EXTERNAL_AT_VENDOR" ? "bg-amber-500/20 text-amber-700" :
                    "bg-blue-500/20 text-blue-600"
                  }`}>{row.masterMessage}</div>
                )}
              </div>
              <div className="flex-1 min-w-[280px]">
                {/* S/N 픽 후 품목은 자동 매핑되어 표시 (readonly). 직접 변경 불가 — 정책 B */}
                {row.itemId && row.itemCode ? (
                  <div className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)]/50 px-3 py-2 text-[12px]">
                    <span className="font-mono font-bold">{row.itemCode}</span> · {row.itemName}
                  </div>
                ) : (
                  <ItemCombobox value={row.itemId} onChange={(v) => updateLine(idx, { itemId: v })} lang={lang} />
                )}
              </div>
              <div className="w-20 shrink-0">
                <TextInput
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                  className="text-right"
                />
              </div>
              {isConsumable && (
                <div className="w-full md:w-[200px] shrink-0">
                  <SerialCombobox
                    value={row.targetEquipmentSN}
                    onChange={(v) => updateLine(idx, { targetEquipmentSN: v })}
                    lang={lang}
                  />
                </div>
              )}
              <div className="flex-1 min-w-[140px]">
                <TextInput value={row.note} onChange={(e) => updateLine(idx, { note: e.target.value })} />
              </div>
              <button
                type="button"
                onClick={() => removeLine(idx)}
                disabled={lines.length <= 1}
                className="h-9 w-10 shrink-0 rounded border border-[color:var(--tts-danger)] bg-[color:var(--tts-danger-dim)] text-[14px] font-bold text-[color:var(--tts-danger)] hover:bg-[color:var(--tts-danger)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                title={t("txnBulk.removeLine", lang)}
              >✕</button>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] font-semibold text-[color:var(--tts-danger)]">{error}</div>}
      {okMsg && <div className="rounded-md bg-[color:var(--tts-success-dim)] px-3 py-2 text-[12px] font-semibold text-[color:var(--tts-success)]">{okMsg}</div>}

      <div className="mt-3 flex gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? t("action.saving", lang) : `${t("btn.txnRegister", lang)} (${lines.filter((l) => l.itemId).length})`}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>{t("action.back", lang)}</Button>
      </div>
    </form>
  );
}
