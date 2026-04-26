"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  warehouseType: string;
  branchType: string | null;
  location: string | null;
};

const typeTone: Record<string, BadgeTone> = {
  INTERNAL: "primary",
  EXTERNAL: "warn",
  CLIENT: "purple",
};

const typeLabelKey: Record<string, string> = {
  INTERNAL: "whType.INTERNAL",
  EXTERNAL: "whType.EXTERNAL",
  CLIENT: "whType.CLIENT",
};

export function WarehousesClient({ initialData, lang }: { initialData: WarehouseRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((w) => {
      if (type !== "all" && w.warehouseType !== type) return false;
      if (!qLower) return true;
      return (
        w.code.toLowerCase().includes(qLower) ||
        w.name.toLowerCase().includes(qLower) ||
        (w.location?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [initialData, q, type]);

  const columns: DataTableColumn<WarehouseRow>[] = [
    {
      key: "code",
      label: t("col.warehouseCode", lang),
      width: "120px",
      render: (v, row) => (
        <Link href={`/master/warehouses/${row.id}`} className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)] hover:underline">{v as string}</Link>
      ),
    },
    {
      key: "name",
      label: t("col.warehouseName", lang),
      render: (v, row) => (
        <Link href={`/master/warehouses/${row.id}`} className="font-semibold hover:underline">
          {v as string}
        </Link>
      ),
    },
    {
      key: "warehouseType",
      label: t("col.warehouseType", lang),
      width: "80px",
      render: (v) => {
        const s = v as string;
        const key = typeLabelKey[s];
        return <Badge tone={typeTone[s] ?? "neutral"}>{key ? t(key, lang) : s}</Badge>;
      },
    },
    {
      key: "branchType",
      label: t("col.branchType", lang),
      width: "80px",
      render: (v) =>
        v ? <Badge tone="accent">{v as string}</Badge> : <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "location",
      label: t("col.location", lang),
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
  ];

  return (
    <Card
      title={t("title.warehousesMgmt", lang)}
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "code", header: t("header.warehouseCode", lang) },
              { key: "name", header: t("header.warehouseName", lang) },
              { key: "warehouseType", header: t("header.warehouseType", lang) },
              { key: "branchType", header: t("header.branchType", lang) },
            ]}
            filename={`warehouses-${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
          <Link href="/master/warehouses/new">
            <Button>{t("btn.addWarehouse", lang)}</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchWarehouse", lang)} />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">{t("filter.allWhTypes", lang)}</option>
          <option value="INTERNAL">{t("whType.INTERNAL", lang)}</option>
          <option value="EXTERNAL">{t("whType.EXTERNAL", lang)}</option>
          <option value="CLIENT">{t("whType.CLIENT", lang)}</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(w) => w.id}
        emptyMessage={t("empty.warehouses", lang)}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActionBar={(ids, clear) => (
          <Button type="button" size="sm" variant="ghost" onClick={async () => {
            if (!confirm(`선택된 ${ids.length}건 (warehouse) 삭제(soft)?`)) return;
            setBusy(true);
            for (const id of ids) await fetch(`/api/master/warehouses/${id}`, { method: 'DELETE' });
            setBusy(false); clear(); location.reload();
          }} disabled={busy}>{busy ? '삭제 중…' : `선택 삭제 (${ids.length})`}</Button>
        )}
      />
    </Card>
  );
}
