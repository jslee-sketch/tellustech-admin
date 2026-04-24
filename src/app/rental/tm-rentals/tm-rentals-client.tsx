"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";

export type TmRentalRow = {
  id: string;
  rentalCode: string;
  contractNumber: string | null;
  clientCode: string;
  clientName: string;
  startDate: string;
  endDate: string;
  itemCount: number;
  totalSales: string;
  totalProfit: string;
};

function formatVnd(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function TmRentalsClient({ initialData }: { initialData: TmRentalRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    if (!qLower) return initialData;
    return initialData.filter(
      (r) =>
        r.rentalCode.toLowerCase().includes(qLower) ||
        (r.contractNumber?.toLowerCase().includes(qLower) ?? false) ||
        r.clientCode.toLowerCase().includes(qLower) ||
        r.clientName.toLowerCase().includes(qLower),
    );
  }, [initialData, q]);

  const columns: DataTableColumn<TmRentalRow>[] = [
    {
      key: "rentalCode",
      label: "TM 렌탈번호",
      width: "160px",
      render: (v, row) => (
        <Link
          href={`/rental/tm-rentals/${row.id}`}
          className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)] hover:underline"
        >
          {v as string}
        </Link>
      ),
    },
    {
      key: "contractNumber",
      label: "계약번호",
      width: "140px",
      render: (v) =>
        v ? <span className="font-mono text-[11px]">{v as string}</span> : <span className="text-[color:var(--tts-muted)]">—</span>,
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
    { key: "startDate", label: "시작", width: "110px" },
    { key: "endDate", label: "종료", width: "110px" },
    {
      key: "itemCount",
      label: "품목",
      width: "60px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{v as number}</span>,
    },
    {
      key: "totalSales",
      label: "매출 합계",
      width: "140px",
      align: "right",
      render: (v) => <span className="font-mono text-[13px] font-bold">{formatVnd(v as string)}</span>,
    },
    {
      key: "totalProfit",
      label: "이익 합계",
      width: "140px",
      align: "right",
      render: (v) => {
        const n = Number(v as string);
        const cls = n > 0 ? "text-[color:var(--tts-success)]" : n < 0 ? "text-[color:var(--tts-danger)]" : "";
        return <span className={`font-mono text-[13px] font-bold ${cls}`}>{formatVnd(v as string)}</span>;
      },
    },
  ];

  return (
    <Card
      title="TM 렌탈"
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "rentalCode", header: "렌탈코드" },
              { key: "contractNumber", header: "계약번호" },
              { key: "clientCode", header: "거래처코드" },
              { key: "clientName", header: "거래처명" },
              { key: "startDate", header: "시작" },
              { key: "endDate", header: "종료" },
              { key: "itemCount", header: "품목수" },
              { key: "totalSales", header: "매출합계" },
              { key: "totalProfit", header: "이익합계" },
            ]}
            filename="tm-rentals.xlsx"
          />
          <Link href="/rental/tm-rentals/new">
            <Button>+ TM 렌탈 등록</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="TM번호/계약번호/거래처 검색..." />
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(r) => r.id} emptyMessage="등록된 TM 렌탈이 없습니다" />
    </Card>
  );
}
