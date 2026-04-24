"use client";

import { useMemo, useState } from "react";
import { Badge, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";

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

export function StockClient({ initialData }: { initialData: StockRow[] }) {
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
      label: "창고",
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
      label: "품목",
      render: (_, row) => (
        <div>
          <div className="font-semibold">{row.itemName}</div>
          <div className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.itemCode}</div>
        </div>
      ),
    },
    {
      key: "inQty",
      label: "누적 입고",
      width: "100px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px] text-[color:var(--tts-success)]">{v as number}</span>,
    },
    {
      key: "outQty",
      label: "누적 출고",
      width: "100px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px] text-[color:var(--tts-danger)]">{v as number}</span>,
    },
    {
      key: "onHand",
      label: "현재 재고",
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
      label: "상태",
      width: "90px",
      render: (v) => {
        const n = v as number;
        return n > 0 ? <Badge tone="success">재고있음</Badge> : n === 0 ? <Badge tone="neutral">0</Badge> : <Badge tone="danger">음수</Badge>;
      },
    },
  ];

  return (
    <Card title="실시간 재고 현황" count={filtered.length} action={
      <ExcelDownload
        rows={filtered}
        columns={[
          { key: "itemCode", header: "품목코드" },
          { key: "itemName", header: "품목명" },
          { key: "warehouseCode", header: "창고코드" },
          { key: "warehouseName", header: "창고명" },
          { key: "inQty", header: "입고" },
          { key: "outQty", header: "출고" },
          { key: "onHand", header: "재고" },
        ]}
        filename="inventory-stock.xlsx"
      />
    }>
      <div className="mb-3 flex flex-wrap gap-3">
        <SearchBar value={q} onChange={setQ} placeholder="창고/품목 검색..." />
        <label className="inline-flex items-center gap-2 text-[13px] text-[color:var(--tts-text)]">
          <input type="checkbox" checked={onHandOnly} onChange={(e) => setOnHandOnly(e.target.checked)} />
          재고 있는 것만
        </label>
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(s) => `${s.warehouseId}|${s.itemId}`} emptyMessage="집계된 재고가 없습니다" />
    </Card>
  );
}
