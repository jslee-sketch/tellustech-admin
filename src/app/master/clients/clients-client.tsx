"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";
import { ClientsImport } from "./clients-import";

export type ClientRow = {
  id: string;
  clientCode: string;
  companyNameVi: string;
  companyNameEn: string | null;
  taxCode: string | null;
  phone: string | null;
  grade: string | null;
  receivableStatus: string;
  contactCount: number;
};

const gradeTone: Record<string, BadgeTone> = {
  A: "success",
  B: "primary",
  C: "warn",
  D: "danger",
};

const recvTone: Record<string, BadgeTone> = {
  NORMAL: "success",
  WARNING: "warn",
  BLOCKED: "danger",
};

const recvLabel: Record<string, string> = {
  NORMAL: "정상",
  WARNING: "경고",
  BLOCKED: "차단",
};

export function ClientsClient({ initialData }: { initialData: ClientRow[] }) {
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("all");
  const [receivable, setReceivable] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((c) => {
      if (grade !== "all" && c.grade !== grade) return false;
      if (receivable !== "all" && c.receivableStatus !== receivable) return false;
      if (!qLower) return true;
      return (
        c.clientCode.toLowerCase().includes(qLower) ||
        c.companyNameVi.toLowerCase().includes(qLower) ||
        (c.companyNameEn?.toLowerCase().includes(qLower) ?? false) ||
        (c.taxCode?.toLowerCase().includes(qLower) ?? false) ||
        (c.phone?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [initialData, q, grade, receivable]);

  const columns: DataTableColumn<ClientRow>[] = [
    {
      key: "clientCode",
      label: "거래처코드",
      width: "150px",
      render: (v) => (
        <span className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)]">{v as string}</span>
      ),
    },
    {
      key: "companyNameVi",
      label: "거래처명",
      render: (v, row) => (
        <Link href={`/master/clients/${row.id}`} className="font-semibold hover:underline">
          {v as string}
        </Link>
      ),
    },
    {
      key: "taxCode",
      label: "MST",
      width: "120px",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "phone",
      label: "전화",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "grade",
      label: "등급",
      width: "60px",
      render: (v) => {
        const g = v as string | null;
        return g ? <Badge tone={gradeTone[g] ?? "neutral"}>{g}</Badge> : (
          <span className="text-[color:var(--tts-muted)]">—</span>
        );
      },
    },
    {
      key: "receivableStatus",
      label: "미수금",
      width: "80px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={recvTone[s] ?? "neutral"}>{recvLabel[s] ?? s}</Badge>;
      },
    },
    {
      key: "contactCount",
      label: "담당자",
      width: "80px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{v as number}명</span>,
    },
  ];

  return (
    <Card
      title="거래처 관리"
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "clientCode", header: "거래처코드" },
              { key: "companyNameVi", header: "거래처명(VI)" },
              { key: "companyNameEn", header: "거래처명(EN)" },
              { key: "taxCode", header: "사업자번호" },
              { key: "phone", header: "전화번호" },
              { key: "grade", header: "등급" },
              { key: "receivableStatus", header: "미수상태" },
            ]}
            filename={`clients-${new Date().toISOString().slice(0, 10)}.xlsx`}
            sheetName="Clients"
          />
          <Link href="/master/clients/new">
            <Button>+ 거래처 등록</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="코드/이름/MST/전화 검색..." />
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">전체 등급</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
        <select
          value={receivable}
          onChange={(e) => setReceivable(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">전체 미수금상태</option>
          <option value="NORMAL">정상</option>
          <option value="WARNING">경고</option>
          <option value="BLOCKED">차단</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(c) => c.id}
        emptyMessage="등록된 거래처가 없습니다"
      />
      <div className="mt-4">
        <ClientsImport />
      </div>
    </Card>
  );
}
