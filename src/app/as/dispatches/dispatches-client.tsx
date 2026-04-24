"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";

export type DispatchRow = {
  id: string;
  ticketId: string;
  ticketNumber: string;
  clientCode: string;
  clientName: string;
  dispatchEmployeeLabel: string | null;
  transportMethod: string | null;
  departedAt: string | null;
  completedAt: string | null;
  googleDistanceKm: string | null;
  meterOcrKm: string | null;
  distanceMatch: boolean | null;
  transportCost: string | null;
};

const transportLabel: Record<string, string> = {
  company_car: "🚗 회사차량",
  motorbike: "🏍️ 오토바이",
  grab: "🚕 Grab",
  taxi: "🚖 택시",
};

function formatVnd(raw: string | null): string {
  if (!raw) return "—";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function DispatchesClient({ initialData }: { initialData: DispatchRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    if (!qLower) return initialData;
    return initialData.filter((d) =>
      d.ticketNumber.toLowerCase().includes(qLower) ||
      d.clientCode.toLowerCase().includes(qLower) ||
      d.clientName.toLowerCase().includes(qLower) ||
      (d.transportMethod?.toLowerCase().includes(qLower) ?? false),
    );
  }, [initialData, q]);

  const columns: DataTableColumn<DispatchRow>[] = [
    {
      key: "ticketNumber",
      label: "AS 전표",
      width: "140px",
      render: (v, row) => (
        <Link
          href={`/as/tickets/${row.ticketId}`}
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
          <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.clientCode}</span>
        </div>
      ),
    },
    {
      key: "dispatchEmployeeLabel",
      label: "출동자",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "transportMethod",
      label: "수단",
      width: "120px",
      render: (v) => {
        const s = v as string | null;
        return s ? transportLabel[s] ?? s : "—";
      },
    },
    {
      key: "googleDistanceKm",
      label: "거리 (G/미터기)",
      width: "130px",
      align: "right",
      render: (_v, row) => {
        const g = row.googleDistanceKm;
        const m = row.meterOcrKm;
        if (!g && !m) return <span className="text-[color:var(--tts-muted)]">—</span>;
        return (
          <span className="font-mono text-[11px]">
            {g ?? "—"} / {m ?? "—"}
            {row.distanceMatch !== null && (
              <span className="ml-1">
                {row.distanceMatch ? (
                  <Badge tone="success">일치</Badge>
                ) : (
                  <Badge tone="danger">불일치</Badge>
                )}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "transportCost",
      label: "교통비",
      width: "120px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{formatVnd(v as string | null)}</span>,
    },
    {
      key: "departedAt",
      label: "출발",
      width: "110px",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "completedAt",
      label: "완료",
      width: "110px",
      render: (v, row) =>
        v ? (
          <Link href={`/as/dispatches/${row.id}`} className="text-[color:var(--tts-primary)] hover:underline">
            {v as string}
          </Link>
        ) : (
          <Link href={`/as/dispatches/${row.id}`} className="text-[color:var(--tts-accent)] hover:underline">
            진행중
          </Link>
        ),
    },
  ];

  return (
    <Card title="출동 기록" count={filtered.length} action={
      <ExcelDownload
        rows={filtered}
        columns={[
          { key: "ticketNumber", header: "전표번호" },
          { key: "clientCode", header: "거래처코드" },
          { key: "clientName", header: "거래처명" },
          { key: "dispatchEmployeeLabel", header: "담당자" },
          { key: "transportMethod", header: "수단" },
          { key: "departedAt", header: "출발일" },
          { key: "completedAt", header: "완료일" },
          { key: "googleDistanceKm", header: "Google km" },
          { key: "meterOcrKm", header: "실제 km" },
          { key: "transportCost", header: "교통비" },
        ]}
        filename="as-dispatches.xlsx"
      />
    }>
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="전표번호/거래처/수단 검색..." />
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(d) => d.id} emptyMessage="출동 기록이 없습니다" />
    </Card>
  );
}
