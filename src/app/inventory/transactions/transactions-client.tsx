"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";

export type TxnRow = {
  id: string;
  itemCode: string;
  itemName: string;
  fromWarehouseCode: string | null;
  fromWarehouseName: string | null;
  toWarehouseCode: string | null;
  toWarehouseName: string | null;
  owner: string;
  serialNumber: string | null;
  txnType: string;
  reason: string;
  quantity: number;
  targetEquipmentSN: string | null;
  performedAt: string;
  note: string | null;
};

const reasonLabel: Record<string, string> = {
  PURCHASE: "매입",
  RETURN_IN: "반품입고",
  OTHER_IN: "기타입고",
  SALE: "매출",
  CONSUMABLE_OUT: "소모품",
  CALIBRATION: "교정",
  REPAIR: "수리",
  RENTAL: "렌탈",
  DEMO: "데모",
};

const reasonTone: Record<string, BadgeTone> = {
  PURCHASE: "success",
  RETURN_IN: "neutral",
  OTHER_IN: "neutral",
  SALE: "danger",
  CONSUMABLE_OUT: "warn",
  CALIBRATION: "primary",
  REPAIR: "warn",
  RENTAL: "accent",
  DEMO: "purple",
};

const typeLabel = { IN: "입고", OUT: "출고", TRANSFER: "이동" } as const;
const typeTone: Record<string, BadgeTone> = { IN: "success", OUT: "danger", TRANSFER: "primary" };

function today() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function TransactionsClient({ initialData }: { initialData: TxnRow[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [reason, setReason] = useState("all");
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((t) => {
      if (type !== "all" && t.txnType !== type) return false;
      if (reason !== "all" && t.reason !== reason) return false;
      const dateStr = t.performedAt.slice(0, 10);
      if (from && dateStr < from) return false;
      if (to && dateStr > to) return false;
      if (!qLower) return true;
      return (
        t.itemCode.toLowerCase().includes(qLower) ||
        t.itemName.toLowerCase().includes(qLower) ||
        (t.fromWarehouseCode?.toLowerCase().includes(qLower) ?? false) ||
        (t.toWarehouseCode?.toLowerCase().includes(qLower) ?? false) ||
        (t.serialNumber?.toLowerCase().includes(qLower) ?? false) ||
        (t.targetEquipmentSN?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [initialData, q, type, reason, from, to]);

  const columns: DataTableColumn<TxnRow>[] = [
    { key: "performedAt", label: "일자", width: "130px", render: (v) => <span className="font-mono text-[11px]">{(v as string).slice(0, 10)}</span> },
    {
      key: "txnType",
      label: "유형",
      width: "70px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={typeTone[s] ?? "neutral"}>{typeLabel[s as keyof typeof typeLabel] ?? s}</Badge>;
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
      key: "serialNumber",
      label: "S/N",
      render: (v, row) => (
        <div>
          {v ? <span className="font-mono text-[11px]">{v as string}</span> : <span className="text-[color:var(--tts-muted)]">—</span>}
          {row.targetEquipmentSN && <div className="font-mono text-[10px] text-[color:var(--tts-accent)]">→ 장비 {row.targetEquipmentSN}</div>}
        </div>
      ),
    },
    {
      key: "fromWarehouseCode",
      label: "출고창고",
      render: (_, row) => row.fromWarehouseCode ? <span className="font-mono text-[11px]">{row.fromWarehouseCode}</span> : <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "toWarehouseCode",
      label: "입고창고",
      render: (_, row) => row.toWarehouseCode ? <span className="font-mono text-[11px]">{row.toWarehouseCode}</span> : <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "owner",
      label: "소속",
      render: (v) => <span className="text-[12px]">{v as string}</span>,
    },
    {
      key: "note",
      label: "비고",
      render: (v) => v ? <span className="text-[11px] text-[color:var(--tts-sub)]">{(v as string).slice(0, 40)}</span> : null,
    },
  ];

  return (
    <Card
      title="입출고 현황"
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "performedAt", header: "일시" },
              { key: "txnType", header: "유형" },
              { key: "reason", header: "사유" },
              { key: "itemCode", header: "품목코드" },
              { key: "itemName", header: "품목명" },
              { key: "serialNumber", header: "S/N" },
              { key: "fromWarehouseCode", header: "출고창고" },
              { key: "toWarehouseCode", header: "입고창고" },
              { key: "owner", header: "소속" },
              { key: "targetEquipmentSN", header: "대상장비 S/N" },
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
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="품목/창고/S/N/장비S/N 검색..." />
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] outline-none">
          <option value="all">전체 유형</option>
          <option value="IN">입고</option>
          <option value="OUT">출고</option>
          <option value="TRANSFER">이동</option>
        </select>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] outline-none">
          <option value="all">전체 사유</option>
          {Object.entries(reasonLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-2 text-[12px] outline-none" />
        <span className="text-[color:var(--tts-muted)]">~</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-2 text-[12px] outline-none" />
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(t) => t.id} emptyMessage="입출고 기록이 없습니다" />
    </Card>
  );
}
