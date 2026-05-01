"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

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

const statusLabelKey: Record<string, string> = {
  DRAFT: "filter.contractDraft",
  ACTIVE: "filter.contractActive",
  EXPIRED: "filter.contractExpired",
  CANCELED: "filter.contractCanceled",
};

export function ItContractsClient({ initialData, lang }: { initialData: ItContractRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
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
      label: t("col.contractNumber", lang),
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
      label: t("col.client", lang),
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
      label: t("col.installAddress", lang),
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "startDate",
      label: t("col.startCol", lang),
      width: "110px",
    },
    {
      key: "endDate",
      label: t("col.endCol", lang),
      width: "110px",
    },
    {
      key: "equipmentCount",
      label: t("col.equipmentCount", lang),
      width: "70px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{t("col.equipmentUnit", lang).replace("{count}", String(v as number))}</span>,
    },
    {
      key: "status",
      label: t("col.status", lang),
      width: "80px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={statusTone[s] ?? "neutral"}>{statusLabelKey[s] ? t(statusLabelKey[s], lang) : s}</Badge>;
      },
    },
  ];

  return (
    <Card
      title={t("title.itContractsList", lang)}
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "contractNumber", header: t("col.contractNumber", lang) },
              { key: "clientCode", header: t("col.clientCode", lang) },
              { key: "clientName", header: t("col.clientName", lang) },
              { key: "status", header: t("col.status", lang) },
              { key: "startDate", header: t("field.startDate", lang) },
              { key: "endDate", header: t("field.endDate", lang) },
              { key: "equipmentCount", header: t("col.equipmentCount", lang) },
              { key: "installationAddress", header: t("col.installAddress", lang) },
            ]}
            filename="it-contracts.xlsx"
          />
          <Link href="/rental/it-contracts/new">
            <Button>{t("btn.contractRegister", lang)}</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchContract", lang)} />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">{t("filter.contractAll", lang)}</option>
          <option value="DRAFT">{t("filter.contractDraft", lang)}</option>
          <option value="ACTIVE">{t("filter.contractActive", lang)}</option>
          <option value="EXPIRED">{t("filter.contractExpired", lang)}</option>
          <option value="CANCELED">{t("filter.contractCanceled", lang)}</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(c) => c.id}
        emptyMessage={t("empty.itContracts", lang)}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActionBar={(ids, clear) => (
          <Button type="button" size="sm" variant="ghost" onClick={async () => {
            if (!confirm(t("bulk.confirmDelete", lang).replace("{n}", String(ids.length)).replace("{type}", "contract"))) return;
            setBusy(true);
            for (const id of ids) {
              await fetch(`/api/rental/it-contracts/${id}`, { method: "DELETE" });
            }
            setBusy(false); clear(); location.reload();
          }} disabled={busy}>{busy ? t("bulk.deleting", lang) : t("bulk.deleteSelected", lang).replace("{n}", String(ids.length))}</Button>
        )}
      />
    </Card>
  );
}
