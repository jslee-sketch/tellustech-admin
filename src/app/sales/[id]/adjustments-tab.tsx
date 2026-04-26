"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  DataTable,
  Field,
  ItemCombobox,
  Note,
  Row,
  SectionTitle,
  Select,
  TextInput,
  Textarea,
} from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

// 매출 사후조정 탭 — RETURN/EXCHANGE/PRICE_ADJUST.
// 정책: items 1행 = S/N 1개 (수량=1).

type OriginalItem = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  serialNumber: string;
  unitPrice: string;
};

type WarehouseOpt = { value: string; label: string };

type Adjustment = {
  id: string;
  adjustCode: string;
  type: string;
  refundAmount: string;
  newAmount: string;
  netAmount: string;
  reason: string | null;
  warehouse?: { id: string; code: string; name: string } | null;
  performedAt: string;
  items: {
    id: string;
    action: string;
    serialNumber: string;
    itemId: string;
    unitPrice: string;
  }[];
};

type Props = {
  salesId: string;
  originalItems: OriginalItem[];
  warehouses: WarehouseOpt[];
  lang: Lang;
};

const TYPE_OPTIONS = [
  { value: "RETURN_FULL", labelKey: "adjType.RETURN_FULL" },
  { value: "RETURN_PARTIAL", labelKey: "adjType.RETURN_PARTIAL" },
  { value: "EXCHANGE_FULL", labelKey: "adjType.EXCHANGE_FULL" },
  { value: "EXCHANGE_PARTIAL", labelKey: "adjType.EXCHANGE_PARTIAL" },
  { value: "PRICE_ADJUST", labelKey: "adjType.PRICE_ADJUST" },
] as const;

type ExchangeLine = {
  itemId: string;
  serialNumber: string;
  unitPrice: string;
};

function formatVnd(raw: string | number): string {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function SalesAdjustmentsTab({ salesId, originalItems, warehouses, lang }: Props) {
  const [history, setHistory] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<string>("RETURN_PARTIAL");
  const [warehouseId, setWarehouseId] = useState("");
  const [reason, setReason] = useState("");
  const [priceDelta, setPriceDelta] = useState("");
  const [selectedReturns, setSelectedReturns] = useState<Set<string>>(new Set());
  const [exchangeLines, setExchangeLines] = useState<ExchangeLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReturn = type === "RETURN_FULL" || type === "RETURN_PARTIAL";
  const isExchange = type === "EXCHANGE_FULL" || type === "EXCHANGE_PARTIAL";
  const isPrice = type === "PRICE_ADJUST";
  const showOriginalSelector = isReturn || isExchange;
  const showExchangeBuilder = isExchange;
  const needsWarehouse = !isPrice;

  async function reload() {
    setLoading(true);
    try {
      const r = await fetch(`/api/sales/${salesId}/adjustments`).then((r) => r.json());
      setHistory(
        (r.adjustments ?? []).map((a: Adjustment) => ({
          ...a,
          performedAt: String(a.performedAt).slice(0, 10),
        })),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesId]);

  function toggleReturn(itemId: string) {
    setSelectedReturns((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function selectAllForFull() {
    if (type === "RETURN_FULL" || type === "EXCHANGE_FULL") {
      setSelectedReturns(new Set(originalItems.map((it) => it.id)));
    }
  }

  function addExchangeLine() {
    setExchangeLines((p) => [...p, { itemId: "", serialNumber: "", unitPrice: "0" }]);
  }
  function updateExchangeLine(i: number, patch: Partial<ExchangeLine>) {
    setExchangeLines((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function removeExchangeLine(i: number) {
    setExchangeLines((p) => p.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    setError(null);
    if (needsWarehouse && !warehouseId) {
      setError(t("modal.snContractTitle", lang)); // generic
      return;
    }
    if (isPrice && !priceDelta) {
      setError("priceDelta required");
      return;
    }
    setSubmitting(true);
    try {
      const items: {
        action: "RETURN" | "EXCHANGE_OUT";
        serialNumber: string;
        itemId: string;
        originalSalesItemId?: string | null;
        unitPrice: string;
      }[] = [];

      if (isReturn || isExchange) {
        for (const id of selectedReturns) {
          const orig = originalItems.find((o) => o.id === id);
          if (!orig) continue;
          items.push({
            action: "RETURN",
            serialNumber: orig.serialNumber || `(no-sn-${orig.id})`,
            itemId: orig.itemId,
            originalSalesItemId: orig.id,
            unitPrice: orig.unitPrice,
          });
        }
      }
      if (isExchange) {
        for (const line of exchangeLines) {
          if (!line.itemId || !line.serialNumber) continue;
          items.push({
            action: "EXCHANGE_OUT",
            serialNumber: line.serialNumber,
            itemId: line.itemId,
            unitPrice: Number(line.unitPrice || 0).toFixed(2),
          });
        }
      }

      const body = {
        type,
        warehouseId: needsWarehouse ? warehouseId : null,
        reason: reason || null,
        priceDelta: isPrice ? priceDelta : null,
        items,
      };
      const res = await fetch(`/api/sales/${salesId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.details?.message ?? j.error ?? t("msg.adjustSaveFail", lang));
        return;
      }
      // reset
      setShowForm(false);
      setType("RETURN_PARTIAL");
      setWarehouseId("");
      setReason("");
      setPriceDelta("");
      setSelectedReturns(new Set());
      setExchangeLines([]);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  const histColumns: DataTableColumn<Adjustment>[] = [
    {
      key: "adjustCode",
      label: t("col.adjustCode", lang),
      width: "180px",
      render: (v) => <span className="font-mono text-[12px] font-bold">{v as string}</span>,
    },
    {
      key: "type",
      label: t("field.adjustType", lang),
      width: "150px",
      render: (v) => t(`adjType.${v as string}`, lang),
    },
    {
      key: "performedAt",
      label: t("col.effectiveDate", lang),
      width: "110px",
    },
    {
      key: "items",
      label: t("col.lines", lang),
      width: "70px",
      align: "right",
      render: (v) => (v as Adjustment["items"]).length,
    },
    {
      key: "refundAmount",
      label: t("col.refund", lang),
      align: "right",
      width: "120px",
      render: (v) => formatVnd(v as string),
    },
    {
      key: "newAmount",
      label: t("col.newAmount", lang),
      align: "right",
      width: "120px",
      render: (v) => formatVnd(v as string),
    },
    {
      key: "netAmount",
      label: t("col.netAmount", lang),
      align: "right",
      width: "130px",
      render: (v) => (
        <span className="font-mono font-bold text-[color:var(--tts-primary)]">
          {formatVnd(v as string)}
        </span>
      ),
    },
    {
      key: "reason",
      label: t("field.reasonShort", lang),
      render: (v) => (v as string) || <span className="text-[color:var(--tts-muted)]">—</span>,
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle icon="🔄" title={t("section.adjustments", lang)} />
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            {t("btn.newAdjustment", lang)}
          </Button>
        )}
      </div>

      <Note tone="info">{t("note.adjustPolicy", lang)}</Note>

      {showForm && (
        <div className="mb-4 mt-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3">
          <Row>
            <Field label={t("field.adjustType", lang)} required width="220px">
              <Select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setSelectedReturns(new Set());
                  setExchangeLines([]);
                }}
                options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey, lang) }))}
              />
            </Field>
            {needsWarehouse && (
              <Field label={t("field.refundWh", lang)} required width="280px">
                <Select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  options={warehouses}
                  placeholder="—"
                />
              </Field>
            )}
            {isPrice && (
              <Field label={t("field.priceDelta", lang)} required width="200px">
                <TextInput
                  type="number"
                  value={priceDelta}
                  onChange={(e) => setPriceDelta(e.target.value)}
                  placeholder="-100000 또는 50000"
                />
              </Field>
            )}
          </Row>
          <Row>
            <Field label={t("field.reasonShort", lang)}>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </Row>

          {showOriginalSelector && (
            <div className="mt-2 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] p-2">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[12px] font-bold text-[color:var(--tts-sub)]">
                  {t("label.originalLines", lang)}
                </div>
                {(type === "RETURN_FULL" || type === "EXCHANGE_FULL") && (
                  <Button size="sm" variant="ghost" onClick={selectAllForFull}>
                    Select all
                  </Button>
                )}
              </div>
              {originalItems.length === 0 ? (
                <div className="text-[12px] text-[color:var(--tts-muted)]">No items.</div>
              ) : (
                <table className="w-full text-[12px]">
                  <tbody>
                    {originalItems.map((it) => (
                      <tr key={it.id} className="border-b border-[color:var(--tts-border)] last:border-0">
                        <td className="w-[40px] py-1">
                          <Checkbox
                            checked={selectedReturns.has(it.id)}
                            onChange={() => toggleReturn(it.id)}
                          />
                        </td>
                        <td className="font-mono text-[11px]">{it.serialNumber || "—"}</td>
                        <td>{it.itemName}</td>
                        <td className="text-right font-mono">{formatVnd(it.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {showExchangeBuilder && (
            <div className="mt-3 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] p-2">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[12px] font-bold text-[color:var(--tts-sub)]">
                  {t("label.exchangeLines", lang)}
                </div>
                <Button size="sm" variant="ghost" onClick={addExchangeLine}>
                  + Add
                </Button>
              </div>
              <Note tone="info">{t("label.serialAddNote", lang)}</Note>
              {exchangeLines.map((line, i) => (
                <Row key={i}>
                  <Field label="Item" required>
                    <ItemCombobox
                      value={line.itemId}
                      onChange={(id) => updateExchangeLine(i, { itemId: id })}
                      required
                    />
                  </Field>
                  <Field label="S/N" required width="200px">
                    <TextInput
                      value={line.serialNumber}
                      onChange={(e) => updateExchangeLine(i, { serialNumber: e.target.value })}
                    />
                  </Field>
                  <Field label="Unit price" required width="160px">
                    <TextInput
                      type="number"
                      value={line.unitPrice}
                      onChange={(e) => updateExchangeLine(i, { unitPrice: e.target.value })}
                    />
                  </Field>
                  <Field label="" width="80px">
                    <Button size="sm" variant="danger" onClick={() => removeExchangeLine(i)}>
                      {t("btn.removeLine", lang)}
                    </Button>
                  </Field>
                </Row>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-2 rounded bg-[color:var(--tts-danger-dim)] px-2 py-1 text-[12px] text-[color:var(--tts-danger)]">
              {error}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <Button onClick={handleSubmit} disabled={submitting} size="sm">
              {submitting ? "..." : t("btn.newAdjustment", lang).replace("+ ", "")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <SectionTitle icon="📜" title={t("label.history", lang)} />
      {loading ? (
        <div className="text-[12px] text-[color:var(--tts-muted)]">Loading…</div>
      ) : (
        <DataTable
          columns={histColumns}
          data={history}
          rowKey={(a) => a.id}
          emptyMessage="—"
        />
      )}
    </div>
  );
}
