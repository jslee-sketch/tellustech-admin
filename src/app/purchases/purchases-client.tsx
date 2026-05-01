"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type PurchaseRow = {
  id: string;
  purchaseNumber: string;
  supplierCode: string;
  supplierName: string;
  projectCode: string | null;
  projectType: string | null;
  totalAmount: string;
  currency: string;
  fxRate: string;
  itemCount: number;
  payableStatus: string | null;
  dueDate: string | null;
  createdAt: string;
};

const projectTypeTone: Record<string, BadgeTone> = {
  TRADE: "purple",
  MAINTENANCE: "neutral",
  RENTAL: "primary",
  CALIBRATION: "success",
  REPAIR: "warn",
  OTHER: "neutral",
};

function projectTypeLabel(type: string, lang: Lang): string {
  switch (type) {
    case "TRADE": return t("status.purchaseTrade", lang);
    case "MAINTENANCE": return t("status.purchaseMaint", lang);
    case "RENTAL": return t("status.purchaseRental", lang);
    case "CALIBRATION": return t("status.purchaseCalibration", lang);
    case "REPAIR": return t("status.purchaseRepair", lang);
    case "OTHER": return t("status.purchaseOther", lang);
    default: return type;
  }
}

const statusTone: Record<string, BadgeTone> = {
  OPEN: "warn",
  PARTIAL: "accent",
  PAID: "success",
  WRITTEN_OFF: "neutral",
};

function statusLabel(s: string, lang: Lang): string {
  switch (s) {
    case "OPEN": return t("status.unpaid", lang);
    case "PARTIAL": return t("status.paidPartial", lang);
    case "PAID": return t("status.paidFull", lang);
    case "WRITTEN_OFF": return t("status.writeOff", lang);
    default: return s;
  }
}

function formatVnd(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function PurchasesClient({ initialData, lang }: { initialData: PurchaseRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((s) => {
      if (status !== "all" && s.payableStatus !== status) return false;
      if (!qLower) return true;
      return (
        s.purchaseNumber.toLowerCase().includes(qLower) ||
        s.supplierCode.toLowerCase().includes(qLower) ||
        s.supplierName.toLowerCase().includes(qLower)
      );
    });
  }, [initialData, q, status]);

  const columns: DataTableColumn<PurchaseRow>[] = [
    {
      key: "purchaseNumber",
      label: t("col.purchaseNumber", lang),
      width: "160px",
      render: (v, row) => (
        <Link
          href={`/purchases/${row.id}`}
          className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)] hover:underline"
        >
          {v as string}
        </Link>
      ),
    },
    { key: "createdAt", label: t("col.createdAt", lang), width: "110px" },
    {
      key: "supplierName",
      label: t("col.supplier", lang),
      render: (_v, row) => (
        <div>
          <span className="font-semibold">{row.supplierName}</span>{" "}
          <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.supplierCode}</span>
        </div>
      ),
    },
    {
      key: "projectCode",
      label: t("col.project", lang),
      width: "150px",
      render: (v, row) => {
        if (!v) return <span className="text-[color:var(--tts-muted)]">—</span>;
        const type = row.projectType;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[11px]">{v as string}</span>
            {type && <Badge tone={projectTypeTone[type] ?? "neutral"}>{projectTypeLabel(type, lang)}</Badge>}
          </div>
        );
      },
    },
    {
      key: "itemCount",
      label: t("col.itemCount", lang),
      width: "60px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{v as number}</span>,
    },
    {
      key: "totalAmount",
      label: t("col.amountVnd", lang),
      width: "170px",
      align: "right",
      render: (v, r) => (
        <div className="font-mono">
          <div className="text-[13px] font-bold">{formatVnd(v as string)}</div>
          {r.currency !== "VND" && (
            <div className="text-[10px] text-[color:var(--tts-muted)]">
              {t("purchase.origShort", lang)} {r.currency} · {t("purchase.fxRateShort", lang)} {r.fxRate}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "payableStatus",
      label: t("col.apStatus", lang),
      width: "100px",
      render: (v) => {
        const s = v as string | null;
        return s ? <Badge tone={statusTone[s] ?? "neutral"}>{statusLabel(s, lang)}</Badge> : "—";
      },
    },
    {
      key: "dueDate",
      label: t("col.dueDate", lang),
      width: "110px",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
  ];

  return (
    <Card
      title={t("card.purchaseVouchers", lang)}
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "purchaseNumber", header: t("col.purchaseNumber", lang) },
              { key: "createdAt", header: t("col.dateCol", lang) },
              { key: "supplierCode", header: t("col.supplierCode", lang) },
              { key: "supplierName", header: t("col.supplierName", lang) },
              { key: "projectCode", header: t("col.project", lang) },
              { key: "totalAmount", header: t("col.amountVnd", lang) },
              { key: "currency", header: t("col.currencyCol", lang) },
              { key: "fxRate", header: t("col.fxRateCol", lang) },
              { key: "itemCount", header: t("col.itemCountShort", lang) },
              { key: "payableStatus", header: t("col.apStatus", lang) },
              { key: "dueDate", header: t("col.dueShort", lang) },
            ]}
            filename={`purchases-${new Date().toISOString().slice(0, 10)}.xlsx`}
            sheetName="Purchases"
          />
          <Link href="/purchases/new">
            <Button>{t("btn.registerPurchase", lang)}</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchPurchase", lang)} />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">{t("filter.allApStatuses", lang)}</option>
          <option value="OPEN">{t("status.unpaid", lang)}</option>
          <option value="PARTIAL">{t("status.paidPartial", lang)}</option>
          <option value="PAID">{t("status.paidFull", lang)}</option>
          <option value="WRITTEN_OFF">{t("status.writeOff", lang)}</option>
        </select>
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(s) => s.id} emptyMessage={t("empty.purchases", lang)}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActionBar={(ids, clear) => (
          <Button type="button" size="sm" variant="ghost" onClick={async () => {
            if (!confirm(t("bulk.confirmDelete", lang).replace("{n}", String(ids.length)).replace("{type}", "purchase"))) return;
            setBusy(true);
            for (const id of ids) {
              await fetch(`/api/purchases/${id}`, { method: "DELETE" });
            }
            setBusy(false); clear(); location.reload();
          }} disabled={busy}>{busy ? t("bulk.deleting", lang) : t("bulk.deleteSelected", lang).replace("{n}", String(ids.length))}</Button>
        )}
      />
    </Card>
  );
}
