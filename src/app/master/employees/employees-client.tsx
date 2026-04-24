"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";
import { EmployeesImport } from "./employees-import";

export type EmployeeRow = {
  id: string;
  employeeCode: string;
  nameVi: string;
  nameEn: string | null;
  nameKo: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  departmentCode: string | null;
  status: string;
  hireDate: string | null;
};

const statusTone: Record<string, BadgeTone> = {
  ACTIVE: "success",
  ON_LEAVE: "warn",
  TERMINATED: "neutral",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "재직",
  ON_LEAVE: "휴직",
  TERMINATED: "퇴사",
};

export function EmployeesClient({ initialData }: { initialData: EmployeeRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (!qLower) return true;
      return (
        e.employeeCode.toLowerCase().includes(qLower) ||
        e.nameVi.toLowerCase().includes(qLower) ||
        (e.nameEn?.toLowerCase().includes(qLower) ?? false) ||
        (e.nameKo?.toLowerCase().includes(qLower) ?? false) ||
        (e.email?.toLowerCase().includes(qLower) ?? false) ||
        (e.position?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [initialData, q, status]);

  const columns: DataTableColumn<EmployeeRow>[] = [
    {
      key: "employeeCode",
      label: "사원코드",
      width: "110px",
      render: (v) => (
        <span className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)]">{v as string}</span>
      ),
    },
    {
      key: "nameVi",
      label: "성명",
      render: (v, row) => (
        <Link href={`/master/employees/${row.id}`} className="font-semibold hover:underline">
          {v as string}
        </Link>
      ),
    },
    {
      key: "departmentCode",
      label: "부서",
      width: "90px",
      render: (v) =>
        v ? <Badge tone="accent">{v as string}</Badge> : <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "position",
      label: "직책",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "phone",
      label: "전화",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "hireDate",
      label: "입사일",
      width: "110px",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "status",
      label: "상태",
      width: "80px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={statusTone[s] ?? "neutral"}>{statusLabel[s] ?? s}</Badge>;
      },
    },
  ];

  return (
    <Card
      title="직원 관리"
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "employeeCode", header: "사원코드" },
              { key: "nameVi", header: "성명(VI)" },
              { key: "nameEn", header: "성명(EN)" },
              { key: "nameKo", header: "성명(KO)" },
              { key: "position", header: "직책" },
              { key: "departmentCode", header: "부서코드" },
              { key: "email", header: "이메일" },
              { key: "phone", header: "전화" },
              { key: "hireDate", header: "입사일" },
              { key: "status", header: "상태" },
            ]}
            filename={`employees-${new Date().toISOString().slice(0, 10)}.xlsx`}
            sheetName="Employees"
          />
          <Link href="/master/employees/new">
            <Button>+ 직원 등록</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="사원코드/이름/직책/이메일 검색..." />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">전체 상태</option>
          <option value="ACTIVE">재직</option>
          <option value="ON_LEAVE">휴직</option>
          <option value="TERMINATED">퇴사</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(e) => e.id}
        emptyMessage="등록된 직원이 없습니다"
      />
      <div className="mt-4">
        <EmployeesImport />
      </div>
    </Card>
  );
}
