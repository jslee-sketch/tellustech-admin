"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

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

const statusLabelKey: Record<string, string> = {
  RECEIVED: "asStatus.received",
  IN_PROGRESS: "asStatus.inProgress",
  DISPATCHED: "asStatus.dispatched",
  COMPLETED: "asStatus.completed",
  CANCELED: "asStatus.canceled",
};

export function TicketsClient({ initialData, lang }: { initialData: TicketRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((tk) => {
      if (status !== "all" && tk.status !== status) return false;
      if (!qLower) return true;
      return (
        tk.ticketNumber.toLowerCase().includes(qLower) ||
        tk.clientCode.toLowerCase().includes(qLower) ||
        tk.clientName.toLowerCase().includes(qLower) ||
        (tk.serialNumber?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [initialData, q, status]);

  const columns: DataTableColumn<TicketRow>[] = [
    {
      key: "ticketNumber",
      label: t("col.asTicketNumber", lang),
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
    { key: "receivedAt", label: t("col.receivedAt", lang), width: "110px" },
    {
      key: "clientName",
      label: t("col.client", lang),
      render: (_v, row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{row.clientName}</span>
          <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.clientCode}</span>
          {row.receivableBlocked && <Badge tone="danger">{t("col.recvBlocked", lang)}</Badge>}
        </div>
      ),
    },
    {
      key: "serialNumber",
      label: t("col.serial", lang),
      render: (v) =>
        v ? (
          <span className="font-mono text-[11px]">{v as string}</span>
        ) : (
          <span className="text-[color:var(--tts-muted)]">—</span>
        ),
    },
    {
      key: "assigneeLabel",
      label: t("col.assignee", lang),
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">{t("label.unassigned", lang)}</span>,
    },
    {
      key: "status",
      label: t("col.status", lang),
      width: "90px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={statusTone[s] ?? "neutral"}>{statusLabelKey[s] ? t(statusLabelKey[s], lang) : s}</Badge>;
      },
    },
    {
      key: "dispatchCount",
      label: t("col.dispatchCount", lang),
      width: "90px",
      align: "right",
      render: (v, row) => {
        const count = v as number;
        const canDispatch = row.status !== "COMPLETED" && row.status !== "CANCELED";
        return (
          <div className="flex items-center justify-end gap-2">
            {count > 0 && <span className="font-mono text-[11px]">{t("col.dispatchTimes", lang).replace("{count}", String(count))}</span>}
            {canDispatch && (
              <Link href={`/as/dispatches/new?ticket=${row.id}`}>
                <Button size="sm" variant="accent">
                  {t("col.dispatchAction", lang)}
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
      title={t("title.asTicketsList", lang)}
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "ticketNumber", header: t("col.asTicketNumber", lang) },
              { key: "receivedAt", header: t("col.receivedAt", lang) },
              { key: "clientCode", header: t("col.clientCode", lang) },
              { key: "clientName", header: t("col.clientName", lang) },
              { key: "serialNumber", header: t("col.serial", lang) },
              { key: "assigneeLabel", header: t("col.assignee", lang) },
              { key: "status", header: t("col.status", lang) },
              { key: "dispatchCount", header: t("col.dispatchCount", lang) },
            ]}
            filename={`as-tickets-${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
          <Link href="/as/tickets/new">
            <Button>{t("btn.newAsTicket", lang)}</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchAsTicket", lang)} />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">{t("filter.allStatus", lang)}</option>
          <option value="RECEIVED">{t("asStatus.received", lang)}</option>
          <option value="IN_PROGRESS">{t("asStatus.inProgress", lang)}</option>
          <option value="DISPATCHED">{t("asStatus.dispatched", lang)}</option>
          <option value="COMPLETED">{t("asStatus.completed", lang)}</option>
          <option value="CANCELED">{t("asStatus.canceled", lang)}</option>
        </select>
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(tk) => tk.id} emptyMessage={t("empty.asTickets", lang)} />
    </Card>
  );
}
