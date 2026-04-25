"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Badge, Button, DataTable, Field, Note, Row, SectionTitle, Select, TextInput } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type DepRow = {
  id: string;
  itemCode: string;
  itemName: string;
  serialNumber: string;
  acquisitionDate: string;
  acquisitionCost: string;
  method: string;
  usefulLifeMonths: number;
  month: string; // YYYY-MM
  depreciationAmount: string;
  bookValue: string;
};

function formatVnd(raw: string | number): string {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function DepreciationClient({
  initialData,
  itemOptions,
  lang,
}: {
  initialData: DepRow[];
  itemOptions: { value: string; label: string }[];
  lang: Lang;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    itemId: "",
    serialNumber: "",
    acquisitionDate: "",
    acquisitionCost: "",
    method: "STRAIGHT_LINE",
    usefulLifeMonths: "60",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snFilter, setSnFilter] = useState("");

  // S/N 별 최신 월만 모아 "현재 자산 목록" 뷰 (bookValue 가 가장 최신인 월)
  const latestBySn = useMemo(() => {
    const map = new Map<string, DepRow>();
    for (const r of initialData) {
      const prev = map.get(r.serialNumber);
      if (!prev || r.month > prev.month) map.set(r.serialNumber, r);
    }
    return Array.from(map.values());
  }, [initialData]);

  const filtered = useMemo(() => {
    const q = snFilter.trim().toLowerCase();
    if (!q) return latestBySn;
    return latestBySn.filter(
      (r) =>
        r.serialNumber.toLowerCase().includes(q) ||
        r.itemCode.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q),
    );
  }, [latestBySn, snFilter]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.details?.message ?? t("msg.assetRegFailed", lang));
        return;
      }
      setShowAdd(false);
      setDraft({
        itemId: "",
        serialNumber: "",
        acquisitionDate: "",
        acquisitionCost: "",
        method: "STRAIGHT_LINE",
        usefulLifeMonths: "60",
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const columns: DataTableColumn<DepRow>[] = [
    {
      key: "serialNumber",
      label: t("col.serial", lang),
      width: "160px",
      render: (v) => <span className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)]">{v as string}</span>,
    },
    {
      key: "itemName",
      label: t("col.itemColShort", lang),
      render: (_, row) => (
        <div>
          <div className="font-semibold">{row.itemName}</div>
          <div className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.itemCode}</div>
        </div>
      ),
    },
    { key: "acquisitionDate", label: t("col.acquisitionDate", lang), width: "110px" },
    {
      key: "acquisitionCost",
      label: t("col.acquisitionCost", lang),
      width: "140px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{formatVnd(v as string)}</span>,
    },
    {
      key: "method",
      label: t("col.depMethod", lang),
      width: "110px",
      render: (v) => (
        <Badge tone={v === "STRAIGHT_LINE" ? "primary" : "accent"}>
          {v === "STRAIGHT_LINE" ? t("method.straightLine", lang) : t("method.declining", lang)}
        </Badge>
      ),
    },
    { key: "month", label: t("col.latestMonth", lang), width: "100px" },
    {
      key: "bookValue",
      label: t("col.bookValue", lang),
      width: "140px",
      align: "right",
      render: (v) => <span className="font-mono text-[13px] font-bold text-[color:var(--tts-success)]">{formatVnd(v as string)}</span>,
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle icon="📉" title={t("label.assetStatusCount", lang).replace("{count}", String(filtered.length))} />
        {!showAdd && <Button size="sm" onClick={() => setShowAdd(true)}>{t("btn.addAsset", lang)}</Button>}
      </div>
      <Note tone="info">
        {t("note.depreciationInfo", lang)}
      </Note>

      {showAdd && (
        <form onSubmit={handleSubmit} className="my-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3">
          <Row>
            <Field label={t("field.item", lang)} required>
              <Select required value={draft.itemId} onChange={(e) => setDraft((p) => ({ ...p, itemId: e.target.value }))} placeholder={t("placeholder.select", lang)} options={itemOptions} />
            </Field>
            <Field label={t("col.serial", lang)} required width="200px">
              <TextInput required value={draft.serialNumber} onChange={(e) => setDraft((p) => ({ ...p, serialNumber: e.target.value }))} />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.acquisitionDate", lang)} required width="200px">
              <TextInput type="date" required value={draft.acquisitionDate} onChange={(e) => setDraft((p) => ({ ...p, acquisitionDate: e.target.value }))} />
            </Field>
            <Field label={t("field.acquisitionCost", lang)} required width="200px">
              <TextInput type="number" required value={draft.acquisitionCost} onChange={(e) => setDraft((p) => ({ ...p, acquisitionCost: e.target.value }))} />
            </Field>
            <Field label={t("field.usefulLife", lang)} required width="160px">
              <TextInput type="number" required value={draft.usefulLifeMonths} onChange={(e) => setDraft((p) => ({ ...p, usefulLifeMonths: e.target.value }))} />
            </Field>
            <Field label={t("field.depMethod", lang)} required width="160px">
              <Select
                required
                value={draft.method}
                onChange={(e) => setDraft((p) => ({ ...p, method: e.target.value }))}
                options={[
                  { value: "STRAIGHT_LINE", label: t("method.straightLine", lang) },
                  { value: "DECLINING_BALANCE", label: t("method.declining", lang) },
                ]}
              />
            </Field>
          </Row>
          {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
          <div className="mt-2 flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>{submitting ? t("action.saving", lang) : t("btn.assetRegister", lang)}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowAdd(false)}>{t("action.cancel", lang)}</Button>
          </div>
        </form>
      )}

      <div className="mb-2">
        <TextInput value={snFilter} onChange={(e) => setSnFilter(e.target.value)} placeholder={t("placeholder.searchAssetSn", lang)} />
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(r) => r.serialNumber} emptyMessage={t("empty.assets", lang)} />
    </div>
  );
}
