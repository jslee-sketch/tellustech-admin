"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";

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

const typeLabel: Record<string, string> = {
  INTERNAL: "내부",
  EXTERNAL: "외부",
  CLIENT: "고객",
};

export function WarehousesClient({ initialData }: { initialData: WarehouseRow[] }) {
  const [q, setQ] = useState("");
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
      label: "창고코드",
      width: "120px",
      render: (v) => (
        <span className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)]">{v as string}</span>
      ),
    },
    {
      key: "name",
      label: "창고명",
      render: (v, row) => (
        <Link href={`/master/warehouses/${row.id}`} className="font-semibold hover:underline">
          {v as string}
        </Link>
      ),
    },
    {
      key: "warehouseType",
      label: "유형",
      width: "80px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={typeTone[s] ?? "neutral"}>{typeLabel[s] ?? s}</Badge>;
      },
    },
    {
      key: "branchType",
      label: "지점",
      width: "80px",
      render: (v) =>
        v ? <Badge tone="accent">{v as string}</Badge> : <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "location",
      label: "위치",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
  ];

  return (
    <Card
      title="창고 관리"
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "code", header: "창고코드" },
              { key: "name", header: "창고명" },
              { key: "warehouseType", header: "타입" },
              { key: "branchType", header: "지점" },
            ]}
            filename={`warehouses-${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
          <Link href="/master/warehouses/new">
            <Button>+ 창고 추가</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="창고코드/이름/위치 검색..." />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">전체 유형</option>
          <option value="INTERNAL">내부</option>
          <option value="EXTERNAL">외부</option>
          <option value="CLIENT">고객</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(w) => w.id}
        emptyMessage="등록된 창고가 없습니다"
      />
    </Card>
  );
}
