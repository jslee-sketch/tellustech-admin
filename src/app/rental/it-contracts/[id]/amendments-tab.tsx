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

// IT 계약 변경 탭 — REMOVE/ADD/REPLACE/PRICE_CHANGE/TERMINATE.
// 차후 정책: 차후 매출 시 active equipment 기준 합산.

type OriginalEq = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  serialNumber: string;
  monthlyBaseFee: string;
};

type WarehouseOpt = { value: string; label: string };

type Amendment = {
  id: string;
  amendmentCode: string;
  type: string;
  source: string;
  effectiveDate: string;
  reason: string | null;
  monthlyDelta: string | null;
  warehouse?: { id: string; code: string; name: string } | null;
  items: { id: string; action: string; serialNumber: string; itemId: string; monthlyBaseFee: string | null }[];
};

type Props = {
  contractId: string;
  originalEquipment: OriginalEq[];
  warehouses: WarehouseOpt[];
  lang: Lang;
};

const TYPE_OPTIONS = [
  { value: "REMOVE_EQUIPMENT", labelKey: "amdType.REMOVE_EQUIPMENT" },
  { value: "ADD_EQUIPMENT", labelKey: "amdType.ADD_EQUIPMENT" },
  { value: "REPLACE_EQUIPMENT", labelKey: "amdType.REPLACE_EQUIPMENT" },
  { value: "PRICE_CHANGE", labelKey: "amdType.PRICE_CHANGE" },
  { value: "TERMINATE", labelKey: "amdType.TERMINATE" },
] as const;

type AddLine = {
  itemId: string;
  serialNumber: string;
  monthlyBaseFee: string;
  bwIncludedPages: string;
  bwOverageRate: string;
  colorIncludedPages: string;
  colorOverageRate: string;
  manufacturer: string;
};

function formatVnd(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "—";
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return new Intl.NumberFormat("vi-VN").format(n);
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ItAmendmentsTab({ contractId, originalEquipment, warehouses, lang }: Props) {
  const [history, setHistory] = useState<Amendment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<string>("ADD_EQUIPMENT");
  const [warehouseId, setWarehouseId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(todayISO());
  const [reason, setReason] = useState("");
  const [monthlyDelta, setMonthlyDelta] = useState("");
  const [selectedRemove, setSelectedRemove] = useState<Set<string>>(new Set());
  const [addLines, setAddLines] = useState<AddLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showRemoveSelector = type === "REMOVE_EQUIPMENT" || type === "REPLACE_EQUIPMENT";
  const showAddBuilder = type === "ADD_EQUIPMENT" || type === "REPLACE_EQUIPMENT";
  const showMonthlyDelta = type === "PRICE_CHANGE";
  const isTerminate = type === "TERMINATE";
  const needsItems = type !== "PRICE_CHANGE" && type !== "TERMINATE";

  async function reload() {
    setLoading(true);
    try {
      const r = await fetch(`/api/rental/it-contracts/${contractId}/amendments`).then((r) => r.json());
      setHistory(
        (r.amendments ?? []).map((a: Amendment) => ({
          ...a,
          effectiveDate: String(a.effectiveDate).slice(0, 10),
        })),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  function toggleRemove(id: string) {
    setSelectedRemove((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addLine() {
    setAddLines((p) => [
      ...p,
      {
        itemId: "",
        serialNumber: "",
        monthlyBaseFee: "",
        bwIncludedPages: "",
        bwOverageRate: "",
        colorIncludedPages: "",
        colorOverageRate: "",
        manufacturer: "",
      },
    ]);
  }
  function updateLine(i: number, patch: Partial<AddLine>) {
    setAddLines((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function removeLineAt(i: number) {
    setAddLines((p) => p.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    setError(null);
    if (showMonthlyDelta && !monthlyDelta) {
      setError("monthlyDelta required");
      return;
    }
    setSubmitting(true);
    try {
      const items: {
        action: "REMOVE" | "ADD" | "REPLACE_OUT" | "REPLACE_IN";
        serialNumber: string;
        itemId: string;
        originalEquipmentId?: string | null;
        monthlyBaseFee?: string | null;
        bwIncludedPages?: number | null;
        bwOverageRate?: string | null;
        colorIncludedPages?: number | null;
        colorOverageRate?: string | null;
        manufacturer?: string | null;
      }[] = [];

      if (showRemoveSelector) {
        for (const id of selectedRemove) {
          const orig = originalEquipment.find((o) => o.id === id);
          if (!orig) continue;
          items.push({
            action: type === "REPLACE_EQUIPMENT" ? "REPLACE_OUT" : "REMOVE",
            serialNumber: orig.serialNumber,
            itemId: orig.itemId,
            originalEquipmentId: orig.id,
          });
        }
      }
      if (showAddBuilder) {
        for (const line of addLines) {
          if (!line.itemId || !line.serialNumber) continue;
          items.push({
            action: type === "REPLACE_EQUIPMENT" ? "REPLACE_IN" : "ADD",
            serialNumber: line.serialNumber,
            itemId: line.itemId,
            monthlyBaseFee: line.monthlyBaseFee || null,
            bwIncludedPages: line.bwIncludedPages ? Number(line.bwIncludedPages) : null,
            bwOverageRate: line.bwOverageRate || null,
            colorIncludedPages: line.colorIncludedPages ? Number(line.colorIncludedPages) : null,
            colorOverageRate: line.colorOverageRate || null,
            manufacturer: line.manufacturer || null,
          });
        }
      }

      if (needsItems && items.length === 0) {
        setError("Need at least 1 item line.");
        setSubmitting(false);
        return;
      }

      const body = {
        type,
        effectiveDate,
        warehouseId: warehouseId || null,
        reason: reason || null,
        monthlyDelta: showMonthlyDelta ? monthlyDelta : null,
        items,
      };
      const res = await fetch(`/api/rental/it-contracts/${contractId}/amend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.details?.message ?? j.error ?? t("msg.amendSaveFail", lang));
        return;
      }

      // reset
      setShowForm(false);
      setType("ADD_EQUIPMENT");
      setWarehouseId("");
      setReason("");
      setMonthlyDelta("");
      setSelectedRemove(new Set());
      setAddLines([]);
      setEffectiveDate(todayISO());
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  const histColumns: DataTableColumn<Amendment>[] = [
    {
      key: "amendmentCode",
      label: t("col.amendCode", lang),
      width: "180px",
      render: (v) => <span className="font-mono text-[12px] font-bold">{v as string}</span>,
    },
    {
      key: "type",
      label: t("field.amendType", lang),
      width: "150px",
      render: (v) => t(`amdType.${v as string}`, lang),
    },
    { key: "effectiveDate", label: t("col.effectiveDate", lang), width: "110px" },
    {
      key: "items",
      label: t("col.lines", lang),
      width: "70px",
      align: "right",
      render: (v) => (v as Amendment["items"]).length,
    },
    {
      key: "monthlyDelta",
      label: t("field.monthlyDelta", lang),
      width: "150px",
      align: "right",
      render: (v) => formatVnd(v as string | null),
    },
    {
      key: "source",
      label: "Source",
      width: "120px",
      render: (v) => (
        <span className="text-[10px] text-[color:var(--tts-muted)]">{v as string}</span>
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
        <SectionTitle icon="🔧" title={t("section.amendments", lang)} />
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            {t("btn.newAmendment", lang)}
          </Button>
        )}
      </div>

      <Note tone="info">{t("note.amendPolicy", lang)}</Note>

      {showForm && (
        <div className="mb-4 mt-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3">
          <Row>
            <Field label={t("field.amendType", lang)} required width="240px">
              <Select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setSelectedRemove(new Set());
                  setAddLines([]);
                }}
                options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey, lang) }))}
              />
            </Field>
            <Field label={t("field.effectiveDate", lang)} required width="180px">
              <TextInput
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </Field>
            {!isTerminate && (
              <Field label={showAddBuilder ? t("field.outboundWh", lang) : t("field.refundWh", lang)} width="280px">
                <Select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  options={warehouses}
                  placeholder="—"
                />
              </Field>
            )}
            {showMonthlyDelta && (
              <Field label={t("field.monthlyDelta", lang)} required width="200px">
                <TextInput
                  type="number"
                  value={monthlyDelta}
                  onChange={(e) => setMonthlyDelta(e.target.value)}
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

          {showRemoveSelector && (
            <div className="mt-2 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] p-2">
              <div className="mb-2 text-[12px] font-bold text-[color:var(--tts-sub)]">
                {t("label.originalLines", lang)}
              </div>
              {originalEquipment.length === 0 ? (
                <div className="text-[12px] text-[color:var(--tts-muted)]">No active equipment.</div>
              ) : (
                <table className="w-full text-[12px]">
                  <tbody>
                    {originalEquipment.map((eq) => (
                      <tr key={eq.id} className="border-b border-[color:var(--tts-border)] last:border-0">
                        <td className="w-[40px] py-1">
                          <Checkbox checked={selectedRemove.has(eq.id)} onChange={() => toggleRemove(eq.id)} />
                        </td>
                        <td className="font-mono text-[11px]">{eq.serialNumber}</td>
                        <td>{eq.itemName}</td>
                        <td className="text-right font-mono">{formatVnd(eq.monthlyBaseFee)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {showAddBuilder && (
            <div className="mt-3 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] p-2">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[12px] font-bold text-[color:var(--tts-sub)]">
                  {t("label.exchangeLines", lang)}
                </div>
                <Button size="sm" variant="ghost" onClick={addLine}>
                  + Add
                </Button>
              </div>
              {addLines.map((line, i) => (
                <div key={i} className="mb-2 rounded border border-[color:var(--tts-border)] p-2">
                  <Row>
                    <Field label="Item" required>
                      <ItemCombobox
                        value={line.itemId}
                        onChange={(id) => updateLine(i, { itemId: id })}
                        required
                      />
                    </Field>
                    <Field label="S/N" required width="220px">
                      <TextInput
                        value={line.serialNumber}
                        onChange={(e) => updateLine(i, { serialNumber: e.target.value })}
                      />
                    </Field>
                    <Field label="Monthly base fee" width="160px">
                      <TextInput
                        type="number"
                        value={line.monthlyBaseFee}
                        onChange={(e) => updateLine(i, { monthlyBaseFee: e.target.value })}
                      />
                    </Field>
                    <Field label="" width="80px">
                      <Button size="sm" variant="danger" onClick={() => removeLineAt(i)}>
                        {t("btn.removeLine", lang)}
                      </Button>
                    </Field>
                  </Row>
                  <Row>
                    <Field label="B/W incl" width="120px">
                      <TextInput
                        type="number"
                        value={line.bwIncludedPages}
                        onChange={(e) => updateLine(i, { bwIncludedPages: e.target.value })}
                      />
                    </Field>
                    <Field label="B/W overage" width="140px">
                      <TextInput
                        type="number"
                        value={line.bwOverageRate}
                        onChange={(e) => updateLine(i, { bwOverageRate: e.target.value })}
                      />
                    </Field>
                    <Field label="Color incl" width="120px">
                      <TextInput
                        type="number"
                        value={line.colorIncludedPages}
                        onChange={(e) => updateLine(i, { colorIncludedPages: e.target.value })}
                      />
                    </Field>
                    <Field label="Color overage" width="140px">
                      <TextInput
                        type="number"
                        value={line.colorOverageRate}
                        onChange={(e) => updateLine(i, { colorOverageRate: e.target.value })}
                      />
                    </Field>
                    <Field label="Manufacturer" width="160px">
                      <TextInput
                        value={line.manufacturer}
                        onChange={(e) => updateLine(i, { manufacturer: e.target.value })}
                      />
                    </Field>
                  </Row>
                </div>
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
              {submitting ? "..." : t("btn.newAmendment", lang).replace("+ ", "")}
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
        <DataTable columns={histColumns} data={history} rowKey={(a) => a.id} emptyMessage="—" />
      )}
    </div>
  );
}
