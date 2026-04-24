"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";

export type ItContractRow = {
  id: string;
  contractNumber: string;
  clientCode: string;
  clientName: string;
  status: string;
  startDate: string;
  endDate: string;
  equipmentCount: number;
  installationAddress: string | null;
};

const statusTone: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  ACTIVE: "success",
  EXPIRED: "warn",
  CANCELED: "danger",
};

const statusLabel: Record<string, string> = {
  DRAFT: "작성중",
  ACTIVE: "활성",
  EXPIRED: "만료",
  CANCELED: "취소",
};

export function ItContractsClient({ initialData }: { initialData: ItContractRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!qLower) return true;
      return (
        c.contractNumber.toLowerCase().includes(qLower) ||
        c.clientCode.toLowerCase().includes(qLower) ||
        c.clientName.toLowerCase().includes(qLower) ||
        (c.installationAddress?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [initialData, q, status]);

  const columns: DataTableColumn<ItContractRow>[] = [
    {
      key: "contractNumber",
      label: "계약번호",
      width: "180px",
      render: (v, row) => (
        <Link
          href={`/rental/it-contracts/${row.id}`}
          className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)] hover:underline"
        >
          {v as string}
        </Link>
      ),
    },
    {
      key: "clientName",
      label: "거래처",
      render: (_v, row) => (
        <div>
          <span className="font-semibold">{row.clientName}</span>{" "}
          <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">
            {row.clientCode}
          </span>
        </div>
      ),
    },
    {
      key: "installationAddress",
      label: "설치 주소",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "startDate",
      label: "시작",
      width: "110px",
    },
    {
      key: "endDate",
      label: "종료",
      width: "110px",
    },
    {
      key: "equipmentCount",
      label: "장비",
      width: "70px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{v as number}대</span>,
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
      title="IT 렌탈 계약"
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "contractNumber", header: "계약번호" },
              { key: "clientCode", header: "거래처코드" },
              { key: "clientName", header: "거래처명" },
              { key: "status", header: "상태" },
              { key: "startDate", header: "시작일" },
              { key: "endDate", header: "종료일" },
              { key: "equipmentCount", header: "장비수" },
              { key: "installationAddress", header: "설치주소" },
            ]}
            filename="it-contracts.xlsx"
          />
          <Link href="/rental/it-contracts/new">
            <Button>+ 계약 등록</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="계약번호/거래처/주소 검색..." />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">전체 상태</option>
          <option value="DRAFT">작성중</option>
          <option value="ACTIVE">활성</option>
          <option value="EXPIRED">만료</option>
          <option value="CANCELED">취소</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(c) => c.id}
        emptyMessage="등록된 IT 계약이 없습니다"
      />
    </Card>
  );
}
