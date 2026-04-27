"use client";

import { Badge, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type AuditRow = {
  id: string; occurredAt: string; companyCode: string; username: string;
  tableName: string; action: string; recordId: string; beforeAfter: string;
};

export function AuditLogsListClient({ rows, lang }: { rows: AuditRow[]; lang: Lang }) {
  const cols: DataTableColumn<AuditRow>[] = [
    { key: "occurredAt", label: t("col.auditTime", lang), width: "170px",
      render: (v) => <span className="font-mono text-[11px]">{String(v)}</span> },
    { key: "companyCode", label: t("col.auditCompany", lang), width: "60px" },
    { key: "username", label: t("col.auditUser", lang), width: "120px" },
    { key: "action", label: t("col.auditAction", lang), width: "80px",
      render: (v) => {
        const s = String(v);
        const tone = s === "INSERT" ? "success" : s === "UPDATE" ? "warn" : s === "DELETE" ? "danger" : "neutral";
        return <Badge tone={tone}>{s}</Badge>;
      } },
    { key: "tableName", label: t("col.auditTable", lang), width: "160px",
      render: (v) => <span className="font-mono text-[11px]">{String(v)}</span> },
    { key: "recordId", label: t("col.auditRecordId", lang), width: "220px",
      render: (v) => <span className="font-mono text-[10px] text-[color:var(--tts-muted)]">{String(v)}</span> },
    { key: "beforeAfter", label: t("col.auditChange", lang),
      render: (_, r) => <pre className="whitespace-pre-wrap text-[10px] text-[color:var(--tts-sub)]">{r.beforeAfter}</pre> },
  ];
  return <DataTable columns={cols} data={rows} rowKey={(r) => r.id} emptyMessage={t("empty.auditLogs", lang)} />;
}
