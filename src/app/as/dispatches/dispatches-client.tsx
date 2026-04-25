"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

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

const transportLabelKey: Record<string, string> = {
  company_car: "transport.companyCar",
  motorbike: "transport.motorbike",
  grab: "transport.grab",
  taxi: "transport.taxi",
};

function formatVnd(raw: string | null): string {
  if (!raw) return "—";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function DispatchesClient({ initialData, lang }: { initialData: DispatchRow[]; lang: Lang }) {
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
      label: t("label.asTicket", lang),
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
      label: t("col.client", lang),
      render: (_v, row) => (
        <div>
          <span className="font-semibold">{row.clientName}</span>{" "}
          <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.clientCode}</span>
        </div>
      ),
    },
    {
      key: "dispatchEmployeeLabel",
      label: t("col.dispatcher", lang),
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "transportMethod",
      label: t("col.transportShort", lang),
      width: "120px",
      render: (v) => {
        const s = v as string | null;
        return s ? (transportLabelKey[s] ? t(transportLabelKey[s], lang) : s) : "—";
      },
    },
    {
      key: "googleDistanceKm",
      label: t("col.distanceGM", lang),
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
                  <Badge tone="success">{t("label.distanceMatch", lang)}</Badge>
                ) : (
                  <Badge tone="danger">{t("label.distanceMismatch", lang)}</Badge>
                )}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "transportCost",
      label: t("col.transportCostShort", lang),
      width: "120px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{formatVnd(v as string | null)}</span>,
    },
    {
      key: "departedAt",
      label: t("col.departedAt", lang),
      width: "110px",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "completedAt",
      label: t("col.completedAt", lang),
      width: "110px",
      render: (v, row) =>
        v ? (
          <Link href={`/as/dispatches/${row.id}`} className="text-[color:var(--tts-primary)] hover:underline">
            {v as string}
          </Link>
        ) : (
          <Link href={`/as/dispatches/${row.id}`} className="text-[color:var(--tts-accent)] hover:underline">
            {t("label.inProgress", lang)}
          </Link>
        ),
    },
  ];

  return (
    <Card title={t("title.dispatchesList", lang)} count={filtered.length} action={
      <ExcelDownload
        rows={filtered}
        columns={[
          { key: "ticketNumber", header: t("col.asTicketNumber", lang) },
          { key: "clientCode", header: t("col.clientCode", lang) },
          { key: "clientName", header: t("col.clientName", lang) },
          { key: "dispatchEmployeeLabel", header: t("col.assignee", lang) },
          { key: "transportMethod", header: t("col.transportShort", lang) },
          { key: "departedAt", header: t("col.departedAt", lang) },
          { key: "completedAt", header: t("col.completedAt", lang) },
          { key: "googleDistanceKm", header: "Google km" },
          { key: "meterOcrKm", header: "Meter km" },
          { key: "transportCost", header: t("col.transportCostShort", lang) },
        ]}
        filename="as-dispatches.xlsx"
      />
    }>
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchDispatch", lang)} />
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(d) => d.id} emptyMessage={t("empty.dispatches", lang)} />
    </Card>
  );
}
