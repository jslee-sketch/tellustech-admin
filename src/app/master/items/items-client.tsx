"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";
import { ItemsImport } from "./items-import";
import { t, type Lang } from "@/lib/i18n";

export type ItemRow = {
  id: string;
  itemCode: string;
  itemType: string;
  name: string;
  unit: string | null;
  description: string;
  colorChannel: string | null;
};

const typeTone: Record<string, BadgeTone> = {
  PRODUCT: "primary",
  CONSUMABLE: "success",
  PART: "warn",
  SUPPLIES: "neutral",
};

const typeLabelKey: Record<string, string> = {
  PRODUCT: "itemType.PRODUCT",
  CONSUMABLE: "itemType.CONSUMABLE",
  PART: "itemType.PART",
  SUPPLIES: "itemType.SUPPLIES",
};

export function ItemsClient({ initialData, lang }: { initialData: ItemRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((it) => {
      if (type !== "all" && it.itemType !== type) return false;
      if (!qLower) return true;
      return (
        it.itemCode.toLowerCase().includes(qLower) ||
        it.name.toLowerCase().includes(qLower) ||
        (it.description?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [initialData, q, type]);

  const printOne = (id: string) => {
    window.open(`/inventory/labels?items=${encodeURIComponent(id)}`, "_blank");
  };

  const columns: DataTableColumn<ItemRow>[] = [
    {
      key: "itemCode",
      label: t("col.itemCode", lang),
      width: "180px",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <Link href={`/master/items/${row.id}`} className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)] hover:underline">{v as string}</Link>
          <button
            type="button"
            onClick={(ev) => { ev.stopPropagation(); ev.preventDefault(); printOne(row.id); }}
            className="rounded bg-[color:var(--tts-accent)] px-1.5 py-0.5 text-[10px] text-white hover:opacity-90"
            title={t("label.printOne", lang)}
          >
            🏷
          </button>
        </div>
      ),
    },
    {
      key: "name",
      label: t("col.itemNameCol", lang),
      render: (v, row) => (
        <Link href={`/master/items/${row.id}`} className="font-semibold hover:underline">
          {v as string}
        </Link>
      ),
    },
    {
      key: "itemType",
      label: t("col.itemTypeCol", lang),
      width: "80px",
      render: (v) => {
        const s = v as string;
        const key = typeLabelKey[s];
        return <Badge tone={typeTone[s] ?? "neutral"}>{key ? t(key, lang) : s}</Badge>;
      },
    },
    {
      key: "unit",
      label: t("col.unit", lang),
      width: "80px",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "colorChannel",
      label: t("item.colorChannel", lang),
      width: "100px",
      render: (v) => {
        const s = v as string | null;
        if (!s) return <span className="text-[color:var(--tts-muted)]">—</span>;
        const emoji: Record<string, string> = { BLACK: "🖤", CYAN: "🩵", MAGENTA: "💗", YELLOW: "💛", DRUM: "🥁", FUSER: "🔥", NONE: "—" };
        return <span className="font-mono text-[11px]">{emoji[s] ?? ""} {s}</span>;
      },
    },
    {
      key: "description",
      label: t("item.description", lang),
      render: (v) => (v as string) || <span className="text-[color:var(--tts-muted)]">—</span>,
    },
  ];

  return (
    <Card
      title={t("title.itemsMgmt", lang)}
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "itemCode", header: t("col.itemCode", lang) },
              { key: "name", header: t("col.itemNameCol", lang) },
              { key: "itemType", header: t("col.itemTypeCol", lang) },
              { key: "unit", header: t("col.unit", lang) },
              { key: "colorChannel", header: t("item.colorChannel", lang) },
              { key: "description", header: t("item.description", lang) },
            ]}
            filename={`items-${new Date().toISOString().slice(0, 10)}.xlsx`}
            sheetName="Items"
          />
          <Link href="/master/items/new">
            <Button>{t("btn.addItemBtn", lang)}</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchItem", lang)} />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">{t("filter.allTypes", lang)}</option>
          <option value="PRODUCT">{t("itemType.PRODUCT", lang)}</option>
          <option value="CONSUMABLE">{t("itemType.CONSUMABLE", lang)}</option>
          <option value="PART">{t("itemType.PART", lang)}</option>
          <option value="SUPPLIES">{t("itemType.SUPPLIES", lang)}</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(it) => it.id}
        emptyMessage={t("empty.items", lang)}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActionBar={(ids, clear) => (
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => {
              window.open(`/inventory/labels?items=${encodeURIComponent(ids.join(","))}`, "_blank");
            }}>
              🏷 {t("label.bulkPrintBtn", lang).replace("{n}", String(ids.length))}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={async () => {
              if (!confirm(t("bulk.confirmDelete", lang).replace("{n}", String(ids.length)).replace("{type}", "item"))) return;
              setBusy(true);
              for (const id of ids) await fetch(`/api/master/items/${id}`, { method: 'DELETE' });
              setBusy(false); clear(); location.reload();
            }} disabled={busy}>{busy ? t("bulk.deleting", lang) : t("bulk.deleteSelected", lang).replace("{n}", String(ids.length))}</Button>
          </div>
        )}
      />
      <div className="mt-4">
        <ItemsImport lang={lang} />
      </div>
    </Card>
  );
}
