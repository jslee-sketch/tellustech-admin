"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

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

export function TmRentalsClient({ initialData, lang }: { initialData: TmRentalRow[]; lang: Lang }) {
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
      label: t("col.tmCode", lang),
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
      label: t("col.contractNumberCol", lang),
      width: "140px",
      render: (v) =>
        v ? <span className="font-mono text-[11px]">{v as string}</span> : <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "clientName",
      label: t("col.client", lang),
      render: (_v, row) => (
        <div>
          <span className="font-semibold">{row.clientName}</span>{" "}
          <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.clientCode}</span>
        </div>
      ),
    },
    { key: "startDate", label: t("col.startCol2", lang), width: "110px" },
    { key: "endDate", label: t("col.endCol2", lang), width: "110px" },
    {
      key: "itemCount",
      label: t("col.itemColTm", lang),
      width: "60px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{v as number}</span>,
    },
    {
      key: "totalSales",
      label: t("col.totalSalesCol", lang),
      width: "140px",
      align: "right",
      render: (v) => <span className="font-mono text-[13px] font-bold">{formatVnd(v as string)}</span>,
    },
    {
      key: "totalProfit",
      label: t("col.totalProfitCol", lang),
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
      title={t("title.tmRentals", lang)}
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "rentalCode", header: t("header.tmCode", lang) },
              { key: "contractNumber", header: t("header.contractNumberHd", lang) },
              { key: "clientCode", header: t("header.clientCodeHd", lang) },
              { key: "clientName", header: t("header.clientNameHd", lang) },
              { key: "startDate", header: t("header.startHd", lang) },
              { key: "endDate", header: t("header.endHd", lang) },
              { key: "itemCount", header: t("header.itemCount", lang) },
              { key: "totalSales", header: t("header.totalSales", lang) },
              { key: "totalProfit", header: t("header.totalProfit", lang) },
            ]}
            filename="tm-rentals.xlsx"
          />
          <Link href="/rental/tm-rentals/new">
            <Button>{t("btn.tmRentalRegister", lang)}</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchTm", lang)} />
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(r) => r.id} emptyMessage={t("empty.tmRentals", lang)} />
    </Card>
  );
}
