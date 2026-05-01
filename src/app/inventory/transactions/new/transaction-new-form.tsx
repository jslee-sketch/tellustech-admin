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
  serialNumber: string;
  quantity: string;
  targetEquipmentSN: string;
  note: string;
};

let _key = 0;
const newKey = () => `r${++_key}`;
const blankLine = (): LineRow => ({ key: newKey(), itemId: "", serialNumber: "", quantity: "1", targetEquipmentSN: "", note: "" });

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
    { refModule: "CONSUMABLE", subKind: "CONSUMABLE", labelKey: "txn.combo.consumableOut", ownerHint: "COMPANY" },
  ],
  TRANSFER: [
    { refModule: "RENTAL", subKind: "OTHER", labelKey: "txn.combo.transferRental" },
    { refModule: "REPAIR", subKind: "OTHER", labelKey: "txn.combo.transferRepair" },
    { refModule: "CALIB", subKind: "OTHER", labelKey: "txn.combo.transferCalib" },
    { refModule: "DEMO", subKind: "OTHER", labelKey: "txn.combo.transferDemo" },
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

  // ── 라인 ──
  const [lines, setLines] = useState<LineRow[]>([blankLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const combos = COMBOS_BY_TYPE[txnType];
  const currentCombo = combos.find((c) => `${c.refModule}|${c.subKind}` === comboKey) ?? combos[0];
  const refModule = currentCombo.refModule;
  const subKind = currentCombo.subKind;

  const isExternalIn = txnType === "IN" && (currentCombo.ownerHint === "EXTERNAL");
  const isConsumable = subKind === "CONSUMABLE";
  const snRequiredOnLines = !isConsumable && txnType !== "TRANSFER";
  // ownerHint=AUTO → 마스터 조회로 결정. 사용자가 거래처 입력하면 외주처(EXTERNAL_CLIENT)로 추론.
  // 단순화: AUTO 케이스에서도 거래처 picker 노출.
  const showOwnerClient = txnType === "IN" && (currentCombo.ownerHint === "EXTERNAL" || currentCombo.ownerHint === "AUTO");

  const internalWarehouses = useMemo(() => warehouses.filter((w) => w.warehouseType !== "EXTERNAL"), [warehouses]);
  const whOptions = internalWarehouses.map((w) => ({ value: w.value, label: w.label }));

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
  function removeLine(idx: number) { setLines((cur) => (cur.length <= 1 ? cur : cur.filter((_, i) => i !== idx))); }
  function clearLines() { setLines([blankLine()]); }

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
    if (snRequiredOnLines) {
      const missing = usable.findIndex((l) => !l.serialNumber.trim());
      if (missing >= 0) {
        setError(t("msg.snMissingAtLine", lang).replace("{n}", String(missing + 1)));
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
    if (txnType === "TRANSFER" && (!fromClientId || !toClientId)) {
      setError(t("msg.bothClientsRequired", lang));
      setSubmitting(false);
      return;
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
              options={whOptions}
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
          <Field label={t("field.clientCustomer", lang)} required>
            <ClientCombobox value={clientId} onChange={setClientId} required lang={lang} />
          </Field>
        </Row>
      )}
      {txnType === "TRANSFER" && (
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

        <div className="overflow-auto">
          <table className="w-full min-w-[1000px] text-[12px]">
            <thead className="sticky top-0 z-10 bg-[color:var(--tts-card)] text-[11px] font-bold text-[color:var(--tts-sub)]">
              <tr>
                <th className="w-10 px-1 py-1 text-left">#</th>
                <th className="px-1 py-1 text-left">{t("field.item", lang)} *</th>
                <th className="w-[220px] px-1 py-1 text-left">{t("field.serial", lang)}{snRequiredOnLines ? " *" : ""}</th>
                <th className="w-20 px-1 py-1 text-right">{t("field.qty", lang)}</th>
                {isConsumable && <th className="w-[180px] px-1 py-1 text-left">{t("field.targetEquipSN", lang)} *</th>}
                <th className="px-1 py-1 text-left">{t("field.note", lang)}</th>
                <th className="w-10 px-1 py-1" />
              </tr>
            </thead>
            <tbody>
              {lines.map((row, idx) => (
                <tr key={row.key} className="border-t border-[color:var(--tts-border)]/40 align-top">
                  <td className="px-1 py-1 font-mono text-[11px] text-[color:var(--tts-muted)]">{idx + 1}</td>
                  <td className="px-1 py-1">
                    <ItemCombobox value={row.itemId} onChange={(v) => updateLine(idx, { itemId: v })} required lang={lang} />
                  </td>
                  <td className="px-1 py-1">
                    <SerialCombobox
                      value={row.serialNumber}
                      onChange={(v) => updateLine(idx, { serialNumber: v })}
                      itemId={row.itemId || undefined}
                      lang={lang}
                      required={snRequiredOnLines}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <TextInput
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                      className="text-right"
                    />
                  </td>
                  {isConsumable && (
                    <td className="px-1 py-1">
                      <SerialCombobox
                        value={row.targetEquipmentSN}
                        onChange={(v) => updateLine(idx, { targetEquipmentSN: v })}
                        lang={lang}
                        required
                      />
                    </td>
                  )}
                  <td className="px-1 py-1">
                    <TextInput value={row.note} onChange={(e) => updateLine(idx, { note: e.target.value })} />
                  </td>
                  <td className="px-1 py-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length <= 1}
                      className="rounded border border-[color:var(--tts-border)] px-2 py-1 text-[11px] text-[color:var(--tts-danger)] hover:bg-[color:var(--tts-card-hover)] disabled:opacity-30"
                      title={t("txnBulk.removeLine", lang)}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
