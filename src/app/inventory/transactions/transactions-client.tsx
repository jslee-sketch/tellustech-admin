"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";

export type TxnRow = {
  id: string;
  itemCode: string;
  itemName: string;
  warehouseCode: string;
  warehouseName: string;
  serialNumber: string | null;
  txnType: string;
  reason: string;
  quantity: number;
  scannedBarcode: string | null;
  performedAt: string;
  note: string | null;
};

const reasonLabel: Record<string, string> = {
  PURCHASE: "매입",
  CALIBRATION: "교정",
  REPAIR: "수리",
  RENTAL: "렌탈",
  DEMO: "데모",
  RETURN: "회수",
  CONSUMABLE_OUT: "소모품",
};

const reasonTone: Record<string, BadgeTone> = {
  PURCHASE: "success",
  CALIBRATION: "primary",
  REPAIR: "warn",
  RENTAL: "accent",
  DEMO: "purple",
  RETURN: "neutral",
  CONSUMABLE_OUT: "neutral",
};

export function TransactionsClient({ initialData }: { initialData: TxnRow[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((t) => {
      if (type !== "all" && t.txnType !== type) return false;
      if (!qLower) return true;
      return (
        t.itemCode.toLowerCase().includes(qLower) ||
        t.itemName.toLowerCase().includes(qLower) ||
        t.warehouseCode.toLowerCase().includes(qLower) ||
        (t.serialNumber?.toLowerCase().includes(qLower) ?? false) ||
        (t.scannedBarcode?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [initialData, q, type]);

  const columns: DataTableColumn<TxnRow>[] = [
    { key: "performedAt", label: "일시", width: "140px" },
    {
      key: "txnType",
      label: "방향",
      width: "70px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={s === "IN" ? "success" : "danger"}>{s === "IN" ? "입고" : "출고"}</Badge>;
      },
    },
    {
      key: "reason",
      label: "사유",
      width: "90px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={reasonTone[s] ?? "neutral"}>{reasonLabel[s] ?? s}</Badge>;
      },
    },
    {
      key: "itemName",
      label: "품목",
      render: (_, row) => (
        <div>
          <div className="font-semibold">{row.itemName}</div>
          <div className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.itemCode}</div>
        </div>
      ),
    },
    {
      key: "warehouseName",
      label: "창고",
      render: (_, row) => (
        <div>
          <div>{row.warehouseName}</div>
          <div className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.warehouseCode}</div>
        </div>
      ),
    },
    {
      key: "serialNumber",
      label: "S/N",
      render: (v) => (v ? <span className="font-mono text-[11px]">{v as string}</span> : <span className="text-[color:var(--tts-muted)]">—</span>),
    },
    {
      key: "quantity",
      label: "수량",
      width: "70px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px] font-bold">{v as number}</span>,
    },
  ];

  return (
    <Card
      title="입출고 이력"
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "performedAt", header: "일시" },
              { key: "itemCode", header: "품목코드" },
              { key: "itemName", header: "품목명" },
              { key: "warehouseCode", header: "창고" },
              { key: "serialNumber", header: "S/N" },
              { key: "txnType", header: "타입" },
              { key: "reason", header: "사유" },
              { key: "quantity", header: "수량" },
              { key: "note", header: "비고" },
            ]}
            filename="inventory-transactions.xlsx"
          />
          <Link href="/inventory/transactions/new">
            <Button>+ 입출고 등록</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="품목/창고/S/N/바코드 검색..." />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">전체 방향</option>
          <option value="IN">입고</option>
          <option value="OUT">출고</option>
        </select>
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(t) => t.id} emptyMessage="입출고 기록이 없습니다" />
    </Card>
  );
}
