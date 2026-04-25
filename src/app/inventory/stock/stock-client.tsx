"use client";

import { useMemo, useState } from "react";
import { Badge, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type StockRow = {
  itemId: string;
  warehouseId: string;
  itemCode: string;
  itemName: string;
  warehouseCode: string;
  warehouseName: string;
  inQty: number;
  outQty: number;
  onHand: number;
};

export function StockClient({ initialData, lang }: { initialData: StockRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const [onHandOnly, setOnHandOnly] = useState(false);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((s) => {
      if (onHandOnly && s.onHand <= 0) return false;
      if (!qLower) return true;
      return (
        s.itemCode.toLowerCase().includes(qLower) ||
        s.itemName.toLowerCase().includes(qLower) ||
        s.warehouseCode.toLowerCase().includes(qLower) ||
        s.warehouseName.toLowerCase().includes(qLower)
      );
    });
  }, [initialData, q, onHandOnly]);

  const columns: DataTableColumn<StockRow>[] = [
    {
      key: "warehouseCode",
      label: t("col.warehouseStock", lang),
      width: "160px",
      render: (_, row) => (
        <div>
          <div className="font-semibold">{row.warehouseName}</div>
          <div className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.warehouseCode}</div>
        </div>
      ),
    },
    {
      key: "itemCode",
      label: t("col.itemStock", lang),
      render: (_, row) => (
        <div>
          <div className="font-semibold">{row.itemName}</div>
          <div className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.itemCode}</div>
        </div>
      ),
    },
    {
      key: "inQty",
      label: t("col.cumIn", lang),
      width: "100px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px] text-[color:var(--tts-success)]">{v as number}</span>,
    },
    {
      key: "outQty",
      label: t("col.cumOut", lang),
      width: "100px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px] text-[color:var(--tts-danger)]">{v as number}</span>,
    },
    {
      key: "onHand",
      label: t("col.currentStock", lang),
      width: "110px",
      align: "right",
      render: (v) => {
        const n = v as number;
        return (
          <span className={`font-mono text-[13px] font-bold ${n <= 0 ? "text-[color:var(--tts-danger)]" : "text-[color:var(--tts-primary)]"}`}>
            {n}
          </span>
        );
      },
    },
    {
      key: "onHand",
      label: t("col.statusStock", lang),
      width: "90px",
      render: (v) => {
        const n = v as number;
        return n > 0 ? <Badge tone="success">{t("label.inStock", lang)}</Badge> : n === 0 ? <Badge tone="neutral">{t("label.zeroStock", lang)}</Badge> : <Badge tone="danger">{t("label.negStock", lang)}</Badge>;
      },
    },
  ];

  return (
    <Card title={t("title.stockRealtime", lang)} count={filtered.length} action={
      <ExcelDownload
        rows={filtered}
        columns={[
          { key: "itemCode", header: t("header.stockItemCode", lang) },
          { key: "itemName", header: t("header.stockItemName", lang) },
          { key: "warehouseCode", header: t("header.stockWhCode", lang) },
          { key: "warehouseName", header: t("header.stockWhName", lang) },
          { key: "inQty", header: t("header.stockIn", lang) },
          { key: "outQty", header: t("header.stockOut", lang) },
          { key: "onHand", header: t("header.stockOnHand", lang) },
        ]}
        filename="inventory-stock.xlsx"
      />
    }>
      <div className="mb-3 flex flex-wrap gap-3">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchStock", lang)} />
        <label className="inline-flex items-center gap-2 text-[13px] text-[color:var(--tts-text)]">
          <input type="checkbox" checked={onHandOnly} onChange={(e) => setOnHandOnly(e.target.checked)} />
          {t("label.onlyInStock", lang)}
        </label>
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(s) => `${s.warehouseId}|${s.itemId}`} emptyMessage={t("empty.stockData", lang)} />
    </Card>
  );
}
