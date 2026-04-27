"use client";
import Link from "next/link";
import { Badge, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type IncidentRow = {
  id: string; incidentCode: string; type: string;
  author: { employeeCode: string; nameVi: string } | null;
  subject: { employeeCode: string; nameVi: string } | null;
  contentVi: string | null; contentKo: string | null; contentEn: string | null;
  createdAt: string;
};

export function IncidentsListClient({ rows, lang }: { rows: IncidentRow[]; lang: Lang }) {
  const cols: DataTableColumn<IncidentRow>[] = [
    { key: "incidentCode", label: t("col.incidentCode", lang), width: "160px",
      render: (v, r) => <Link href={`/hr/incidents/${r.id}`} className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)] hover:underline">{String(v)}</Link> },
    { key: "type", label: t("col.incidentType", lang), width: "90px",
      render: (v) => <Badge tone={v === "PRAISE" ? "success" : "warn"}>{String(v)}</Badge> },
    { key: "author", label: t("col.author", lang),
      render: (_, r) => <span>{r.author?.employeeCode} · {r.author?.nameVi}</span> },
    { key: "subject", label: t("col.subjectCol", lang),
      render: (_, r) => <span>{r.subject?.employeeCode} · {r.subject?.nameVi}</span> },
    { key: "contentVi", label: t("col.contentSummary", lang),
      render: (_, r) => {
        const text = r.contentVi ?? r.contentKo ?? r.contentEn ?? "";
        return <span className="text-[12px] text-[color:var(--tts-sub)]">{text.slice(0, 60)}{text.length > 60 ? "..." : ""}</span>;
      } },
    { key: "createdAt", label: t("col.writtenAt", lang), width: "110px",
      render: (v) => <span className="font-mono text-[11px]">{String(v).slice(0,10)}</span> },
  ];
  return <DataTable columns={cols} data={rows} rowKey={(r) => r.id} emptyMessage={t("empty.incidents", lang)} />;
}
