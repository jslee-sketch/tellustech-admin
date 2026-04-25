"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";

export type ProjectRow = {
  id: string;
  projectCode: string;
  name: string;
  salesType: string;
};

const salesTone: Record<string, BadgeTone> = {
  TRADE: "purple",
  MAINTENANCE: "neutral",
  RENTAL: "primary",
  CALIBRATION: "success",
  REPAIR: "warn",
  OTHER: "neutral",
};

const salesLabel: Record<string, string> = {
  TRADE: "판매/구매",
  MAINTENANCE: "유지보수",
  RENTAL: "렌탈",
  CALIBRATION: "교정",
  REPAIR: "수리",
  OTHER: "기타",
};

export function ProjectsClient({ initialData }: { initialData: ProjectRow[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((p) => {
      if (type !== "all" && p.salesType !== type) return false;
      if (!qLower) return true;
      return (
        p.projectCode.toLowerCase().includes(qLower) ||
        p.name.toLowerCase().includes(qLower)
      );
    });
  }, [initialData, q, type]);

  const columns: DataTableColumn<ProjectRow>[] = [
    {
      key: "projectCode",
      label: "프로젝트코드",
      width: "140px",
      render: (v, row) => (
        <Link href={`/master/projects/${row.id}`} className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)] hover:underline">{v as string}</Link>
      ),
    },
    {
      key: "name",
      label: "프로젝트명",
      render: (v, row) => (
        <Link href={`/master/projects/${row.id}`} className="font-semibold hover:underline">
          {v as string}
        </Link>
      ),
    },
    {
      key: "salesType",
      label: "매출유형",
      width: "140px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={salesTone[s] ?? "neutral"}>{salesLabel[s] ?? s}</Badge>;
      },
    },
  ];

  return (
    <Card
      title="프로젝트 관리"
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "projectCode", header: "프로젝트코드" },
              { key: "name", header: "프로젝트명" },
              { key: "salesType", header: "타입" },
            ]}
            filename={`projects-${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
          <Link href="/master/projects/new">
            <Button>+ 프로젝트 추가</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="코드 또는 이름 검색..." />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">전체 매출유형</option>
          {Object.entries(salesLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(p) => p.id}
        emptyMessage="등록된 프로젝트가 없습니다"
      />
    </Card>
  );
}
