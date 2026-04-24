"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";
import { ItemsImport } from "./items-import";

export type ItemRow = {
  id: string;
  itemCode: string;
  itemType: string;
  name: string;
  unit: string | null;
  category: string | null;
};

const typeTone: Record<string, BadgeTone> = {
  PRODUCT: "primary",
  CONSUMABLE: "success",
  PART: "warn",
};

const typeLabel: Record<string, string> = {
  PRODUCT: "상품",
  CONSUMABLE: "소모품",
  PART: "부품",
};

export function ItemsClient({ initialData }: { initialData: ItemRow[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((it) => {
      if (type !== "all" && it.itemType !== type) return false;
      if (!qLower) return true;
      return (
        it.itemCode.toLowerCase().includes(qLower) ||
        it.name.toLowerCase().includes(qLower) ||
        (it.category?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [initialData, q, type]);

  const columns: DataTableColumn<ItemRow>[] = [
    {
      key: "itemCode",
      label: "품목코드",
      width: "180px",
      render: (v) => (
        <span className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)]">{v as string}</span>
      ),
    },
    {
      key: "name",
      label: "품목명",
      render: (v, row) => (
        <Link href={`/master/items/${row.id}`} className="font-semibold hover:underline">
          {v as string}
        </Link>
      ),
    },
    {
      key: "itemType",
      label: "구분",
      width: "80px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={typeTone[s] ?? "neutral"}>{typeLabel[s] ?? s}</Badge>;
      },
    },
    {
      key: "unit",
      label: "단위",
      width: "80px",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "category",
      label: "카테고리",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
  ];

  return (
    <Card
      title="품목 관리"
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "itemCode", header: "품목코드" },
              { key: "name", header: "품목명" },
              { key: "itemType", header: "구분" },
              { key: "unit", header: "단위" },
              { key: "category", header: "카테고리" },
            ]}
            filename={`items-${new Date().toISOString().slice(0, 10)}.xlsx`}
            sheetName="Items"
          />
          <Link href="/master/items/new">
            <Button>+ 품목 추가</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="코드/이름/카테고리 검색..." />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">전체 구분</option>
          <option value="PRODUCT">상품</option>
          <option value="CONSUMABLE">소모품</option>
          <option value="PART">부품</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(it) => it.id}
        emptyMessage="등록된 품목이 없습니다"
      />
      <div className="mt-4">
        <ItemsImport />
      </div>
    </Card>
  );
}
