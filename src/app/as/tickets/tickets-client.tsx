"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";

export type TicketRow = {
  id: string;
  ticketNumber: string;
  clientCode: string;
  clientName: string;
  clientReceivable: string;
  receivableBlocked: boolean;
  assigneeLabel: string | null;
  serialNumber: string | null;
  status: string;
  receivedAt: string;
  dispatchCount: number;
};

const statusTone: Record<string, BadgeTone> = {
  RECEIVED: "neutral",
  IN_PROGRESS: "primary",
  DISPATCHED: "accent",
  COMPLETED: "success",
  CANCELED: "danger",
};
const statusLabel: Record<string, string> = {
  RECEIVED: "접수",
  IN_PROGRESS: "처리중",
  DISPATCHED: "출동중",
  COMPLETED: "완료",
  CANCELED: "취소",
};

export function TicketsClient({ initialData }: { initialData: TicketRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (!qLower) return true;
      return (
        t.ticketNumber.toLowerCase().includes(qLower) ||
        t.clientCode.toLowerCase().includes(qLower) ||
        t.clientName.toLowerCase().includes(qLower) ||
        (t.serialNumber?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [initialData, q, status]);

  const columns: DataTableColumn<TicketRow>[] = [
    {
      key: "ticketNumber",
      label: "AS 전표번호",
      width: "140px",
      render: (v, row) => (
        <Link
          href={`/as/tickets/${row.id}`}
          className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)] hover:underline"
        >
          {v as string}
        </Link>
      ),
    },
    { key: "receivedAt", label: "접수일", width: "110px" },
    {
      key: "clientName",
      label: "거래처",
      render: (_v, row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{row.clientName}</span>
          <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.clientCode}</span>
          {row.receivableBlocked && <Badge tone="danger">미수금 차단</Badge>}
        </div>
      ),
    },
    {
      key: "serialNumber",
      label: "S/N",
      render: (v) =>
        v ? (
          <span className="font-mono text-[11px]">{v as string}</span>
        ) : (
          <span className="text-[color:var(--tts-muted)]">—</span>
        ),
    },
    {
      key: "assigneeLabel",
      label: "담당자",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">미지정</span>,
    },
    {
      key: "status",
      label: "상태",
      width: "90px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={statusTone[s] ?? "neutral"}>{statusLabel[s] ?? s}</Badge>;
      },
    },
    {
      key: "dispatchCount",
      label: "출동",
      width: "90px",
      align: "right",
      render: (v, row) => {
        const count = v as number;
        const canDispatch = row.status !== "COMPLETED" && row.status !== "CANCELED";
        return (
          <div className="flex items-center justify-end gap-2">
            {count > 0 && <span className="font-mono text-[11px]">{count}회</span>}
            {canDispatch && (
              <Link href={`/as/dispatches/new?ticket=${row.id}`}>
                <Button size="sm" variant="accent">
                  🚗 출동
                </Button>
              </Link>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Card
      title="AS 전표"
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "ticketNumber", header: "전표번호" },
              { key: "receivedAt", header: "접수일" },
              { key: "clientCode", header: "거래처코드" },
              { key: "clientName", header: "거래처명" },
              { key: "serialNumber", header: "S/N" },
              { key: "assigneeLabel", header: "담당자" },
              { key: "status", header: "상태" },
              { key: "dispatchCount", header: "출동건수" },
            ]}
            filename={`as-tickets-${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
          <Link href="/as/tickets/new">
            <Button>+ AS 접수</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="전표번호/거래처/S/N 검색..." />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">전체 상태</option>
          <option value="RECEIVED">접수</option>
          <option value="IN_PROGRESS">처리중</option>
          <option value="DISPATCHED">출동중</option>
          <option value="COMPLETED">완료</option>
          <option value="CANCELED">취소</option>
        </select>
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(t) => t.id} emptyMessage="접수된 AS가 없습니다" />
    </Card>
  );
}
