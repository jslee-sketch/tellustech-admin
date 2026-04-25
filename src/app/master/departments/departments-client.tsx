"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";

export type DepartmentRow = {
  id: string;
  code: string;
  name: string;
  branchType: string;
  managerId: string | null;
  managerLabel: string | null;
  companyCode: string;
};

export function DepartmentsClient({ initialData }: { initialData: DepartmentRow[] }) {
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState<string>("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((d) => {
      if (branch !== "all" && d.branchType !== branch) return false;
      if (!qLower) return true;
      return d.code.toLowerCase().includes(qLower) || d.name.toLowerCase().includes(qLower);
    });
  }, [initialData, q, branch]);

  const columns: DataTableColumn<DepartmentRow>[] = [
    {
      key: "code",
      label: "부서코드",
      width: "120px",
      render: (v, row) => (
        <Link href={`/master/departments/${row.id}`} className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)] hover:underline">{v as string}</Link>
      ),
    },
    {
      key: "name",
      label: "부서명",
      render: (v, row) => (
        <Link href={`/master/departments/${row.id}`} className="font-semibold hover:underline">
          {v as string}
        </Link>
      ),
    },
    {
      key: "branchType",
      label: "지점",
      width: "80px",
      render: (v) => <Badge tone="primary">{v as string}</Badge>,
    },
    {
      key: "managerLabel",
      label: "관리자",
      render: (v) =>
        v ? (
          <span className="text-[13px]">{v as string}</span>
        ) : (
          <span className="text-[color:var(--tts-muted)]">—</span>
        ),
    },
    {
      key: "companyCode",
      label: "회사",
      width: "60px",
      render: (v) => <Badge tone="accent">{v as string}</Badge>,
    },
  ];

  return (
    <Card
      title="부서(지점) 관리"
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "code", header: "부서코드" },
              { key: "name", header: "부서명" },
              { key: "branchType", header: "지점" },
              { key: "managerLabel", header: "부서장" },
              { key: "companyCode", header: "회사" },
            ]}
            filename={`departments-${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
          <Link href="/master/departments/new">
            <Button>+ 부서 추가</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="부서코드 또는 부서명 검색..." />
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">전체 지점</option>
          <option value="BN">BN (Bắc Ninh)</option>
          <option value="HN">HN (Hà Nội)</option>
          <option value="HCM">HCM (Hồ Chí Minh)</option>
          <option value="NT">NT (Nha Trang)</option>
          <option value="DN">DN (Đà Nẵng)</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(d) => d.id}
        emptyMessage="등록된 부서가 없습니다"
      />
    </Card>
  );
}
