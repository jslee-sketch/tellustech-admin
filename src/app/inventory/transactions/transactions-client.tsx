"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

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

function reasonLabel(r: string, lang: Lang): string {
  switch (r) {
    case "PURCHASE": return t("reason.purchase", lang);
    case "RETURN_IN": return t("reason.returnIn", lang);
    case "OTHER_IN": return t("reason.otherIn", lang);
    case "SALE": return t("reason.sale", lang);
    case "CONSUMABLE_OUT": return t("reason.consumable", lang);
    case "CALIBRATION": return t("reason.calibration", lang);
    case "REPAIR": return t("reason.repair", lang);
    case "RENTAL": return t("reason.rental", lang);
    case "DEMO": return t("reason.demo", lang);
    default: return r;
  }
}

const ALL_REASONS = ["PURCHASE","RETURN_IN","OTHER_IN","SALE","CONSUMABLE_OUT","CALIBRATION","REPAIR","RENTAL","DEMO"];

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

function typeLabel(typ: string, lang: Lang): string {
  switch (typ) {
    case "IN": return t("status.in", lang);
    case "OUT": return t("status.out", lang);
    case "TRANSFER": return t("status.transfer", lang);
    default: return typ;
  }
}

const typeTone: Record<string, BadgeTone> = { IN: "success", OUT: "danger", TRANSFER: "primary" };

function today() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function TransactionsClient({ initialData, lang }: { initialData: TxnRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [reason, setReason] = useState("all");
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((tx) => {
      if (type !== "all" && tx.txnType !== type) return false;
      if (reason !== "all" && tx.reason !== reason) return false;
      const dateStr = tx.performedAt.slice(0, 10);
      if (from && dateStr < from) return false;
      if (to && dateStr > to) return false;
      if (!qLower) return true;
      return (
        tx.itemCode.toLowerCase().includes(qLower) ||
        tx.itemName.toLowerCase().includes(qLower) ||
        (tx.fromWarehouseCode?.toLowerCase().includes(qLower) ?? false) ||
        (tx.toWarehouseCode?.toLowerCase().includes(qLower) ?? false) ||
        (tx.serialNumber?.toLowerCase().includes(qLower) ?? false) ||
        (tx.targetEquipmentSN?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [initialData, q, type, reason, from, to]);

  const columns: DataTableColumn<TxnRow>[] = [
    { key: "performedAt", label: t("col.date", lang), width: "130px", render: (v) => <span className="font-mono text-[11px]">{(v as string).slice(0, 10)}</span> },
    {
      key: "txnType",
      label: t("col.txnType", lang),
      width: "70px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={typeTone[s] ?? "neutral"}>{typeLabel(s, lang)}</Badge>;
      },
    },
    {
      key: "reason",
      label: t("col.reason", lang),
      width: "90px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={reasonTone[s] ?? "neutral"}>{reasonLabel(s, lang)}</Badge>;
      },
    },
    {
      key: "itemName",
      label: t("col.item", lang),
      render: (_, row) => (
        <div>
          <div className="font-semibold">{row.itemName}</div>
          <div className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.itemCode}</div>
        </div>
      ),
    },
    {
      key: "serialNumber",
      label: t("col.serial", lang),
      render: (v, row) => (
        <div>
          {v ? <span className="font-mono text-[11px]">{v as string}</span> : <span className="text-[color:var(--tts-muted)]">—</span>}
          {row.targetEquipmentSN && <div className="font-mono text-[10px] text-[color:var(--tts-accent)]">→ {t("label.equipShort", lang)} {row.targetEquipmentSN}</div>}
        </div>
      ),
    },
    {
      key: "fromWarehouseCode",
      label: t("col.warehouseOut", lang),
      render: (_, row) => row.fromWarehouseCode ? <span className="font-mono text-[11px]">{row.fromWarehouseCode}</span> : <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "toWarehouseCode",
      label: t("col.warehouseIn", lang),
      render: (_, row) => row.toWarehouseCode ? <span className="font-mono text-[11px]">{row.toWarehouseCode}</span> : <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "owner",
      label: t("col.belongsTo", lang),
      render: (v) => <span className="text-[12px]">{v as string}</span>,
    },
    {
      key: "note",
      label: t("col.note", lang),
      render: (v) => v ? <span className="text-[11px] text-[color:var(--tts-sub)]">{(v as string).slice(0, 40)}</span> : null,
    },
  ];

  return (
    <Card
      title={t("label.transactionsTitle", lang)}
      count={filtered.length}
      countLabel={t("common.itemsShort", lang)}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            lang={lang}
            rows={filtered}
            columns={[
              { key: "performedAt", header: t("col.performedAt", lang) },
              { key: "txnType", header: t("col.txnType", lang) },
              { key: "reason", header: t("col.reason", lang) },
              { key: "itemCode", header: t("col.itemCode", lang) },
              { key: "itemName", header: t("col.itemName", lang) },
              { key: "serialNumber", header: t("col.serial", lang) },
              { key: "fromWarehouseCode", header: t("col.warehouseOut", lang) },
              { key: "toWarehouseCode", header: t("col.warehouseIn", lang) },
              { key: "owner", header: t("col.belongsTo", lang) },
              { key: "targetEquipmentSN", header: t("col.targetEquipSn", lang) },
              { key: "note", header: t("col.note", lang) },
            ]}
            filename="inventory-transactions.xlsx"
          />
          <Link href="/inventory/transactions/new">
            <Button>{t("btn.registerTxn", lang)}</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchTxn", lang)} />
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] outline-none">
          <option value="all">{t("filter.allTypeShort", lang)}</option>
          <option value="IN">{t("status.in", lang)}</option>
          <option value="OUT">{t("status.out", lang)}</option>
          <option value="TRANSFER">{t("status.transfer", lang)}</option>
        </select>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] outline-none">
          <option value="all">{t("filter.allReasons", lang)}</option>
          {ALL_REASONS.map((r) => <option key={r} value={r}>{reasonLabel(r, lang)}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-2 text-[12px] outline-none" />
        <span className="text-[color:var(--tts-muted)]">~</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-2 text-[12px] outline-none" />
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(t) => t.id} emptyMessage={t("empty.txns", lang)} />
    </Card>
  );
}
