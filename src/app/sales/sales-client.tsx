"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";

export type SalesRow = {
  id: string;
  salesNumber: string;
  clientCode: string;
  clientName: string;
  projectCode: string | null;
  projectType: string | null;
  totalAmount: string; // VND 환산값
  currency: string;
  fxRate: string;
  itemCount: number;
  receivableStatus: string | null;
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
const projectTypeLabel: Record<string, string> = {
  TRADE: "판매",
  MAINTENANCE: "유지",
  RENTAL: "렌탈",
  CALIBRATION: "교정",
  REPAIR: "수리",
  OTHER: "기타",
};

const statusTone: Record<string, BadgeTone> = {
  OPEN: "warn",
  PARTIAL: "accent",
  PAID: "success",
  WRITTEN_OFF: "neutral",
};
const statusLabel: Record<string, string> = {
  OPEN: "미수",
  PARTIAL: "부분입금",
  PAID: "완결",
  WRITTEN_OFF: "대손",
};

function formatVnd(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function SalesClient({ initialData }: { initialData: SalesRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((s) => {
      if (status !== "all" && s.receivableStatus !== status) return false;
      if (!qLower) return true;
      return (
        s.salesNumber.toLowerCase().includes(qLower) ||
        s.clientCode.toLowerCase().includes(qLower) ||
        s.clientName.toLowerCase().includes(qLower)
      );
    });
  }, [initialData, q, status]);

  const columns: DataTableColumn<SalesRow>[] = [
    {
      key: "salesNumber",
      label: "매출번호",
      width: "160px",
      render: (v, row) => (
        <Link
          href={`/sales/${row.id}`}
          className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)] hover:underline"
        >
          {v as string}
        </Link>
      ),
    },
    {
      key: "createdAt",
      label: "등록일",
      width: "110px",
    },
    {
      key: "clientName",
      label: "거래처",
      render: (_v, row) => (
        <div>
          <span className="font-semibold">{row.clientName}</span>{" "}
          <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.clientCode}</span>
        </div>
      ),
    },
    {
      key: "projectCode",
      label: "프로젝트",
      width: "150px",
      render: (v, row) => {
        if (!v) return <span className="text-[color:var(--tts-muted)]">—</span>;
        const type = row.projectType;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[11px]">{v as string}</span>
            {type && <Badge tone={projectTypeTone[type] ?? "neutral"}>{projectTypeLabel[type] ?? type}</Badge>}
          </div>
        );
      },
    },
    {
      key: "itemCount",
      label: "품목",
      width: "60px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{v as number}</span>,
    },
    {
      key: "totalAmount",
      label: "금액 (VND)",
      width: "170px",
      align: "right",
      render: (v, r) => (
        <div className="font-mono">
          <div className="text-[13px] font-bold">{formatVnd(v as string)}</div>
          {r.currency !== "VND" && (
            <div className="text-[10px] text-[color:var(--tts-muted)]">원화 {r.currency} · 환율 {r.fxRate}</div>
          )}
        </div>
      ),
    },
    {
      key: "receivableStatus",
      label: "미수금",
      width: "100px",
      render: (v) => {
        const s = v as string | null;
        return s ? <Badge tone={statusTone[s] ?? "neutral"}>{statusLabel[s] ?? s}</Badge> : "—";
      },
    },
    {
      key: "dueDate",
      label: "납기일",
      width: "110px",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
  ];

  return (
    <Card
      title="매출 전표"
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "salesNumber", header: "매출번호" },
              { key: "createdAt", header: "일자" },
              { key: "clientCode", header: "거래처코드" },
              { key: "clientName", header: "거래처명" },
              { key: "projectCode", header: "프로젝트" },
              { key: "totalAmount", header: "금액(VND)" },
              { key: "currency", header: "원통화" },
              { key: "fxRate", header: "환율" },
              { key: "itemCount", header: "품목수" },
              { key: "receivableStatus", header: "미수상태" },
              { key: "dueDate", header: "납기" },
            ]}
            filename={`sales-${new Date().toISOString().slice(0, 10)}.xlsx`}
            sheetName="Sales"
          />
          <Link href="/sales/new">
            <Button>+ 매출 등록</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="매출번호/거래처 검색..." />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">전체 미수금 상태</option>
          <option value="OPEN">미수</option>
          <option value="PARTIAL">부분입금</option>
          <option value="PAID">완결</option>
          <option value="WRITTEN_OFF">대손</option>
        </select>
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(s) => s.id} emptyMessage="등록된 매출이 없습니다" />
    </Card>
  );
}
