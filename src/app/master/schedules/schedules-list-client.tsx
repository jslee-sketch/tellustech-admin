"use client";
import Link from "next/link";
import { Badge, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type ScheduleRow = {
  id: string; scheduleCode: string; title: string;
  dueAt: string; repeatCron: string | null;
  _count: { targets: number; reporters: number; confirmations: number };
};

export function SchedulesListClient({ rows, lang }: { rows: ScheduleRow[]; lang: Lang }) {
  const cols: DataTableColumn<ScheduleRow>[] = [
    { key: "scheduleCode", label: t("col.scheduleCode", lang), width: "160px",
      render: (v, r) => <Link href={`/master/schedules/${r.id}`} className="font-mono text-[11px] text-[color:var(--tts-primary)] hover:underline">{String(v)}</Link> },
    { key: "title", label: t("col.scheduleTitle", lang) },
    { key: "dueAt", label: t("col.scheduleDeadline", lang), width: "170px",
      render: (v) => {
        const d = new Date(String(v));
        const left = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return <span className="font-mono text-[11px]">{String(v).slice(0,10)} {left >= 0 ? `(D-${left})` : <Badge tone="danger">{t("label.expiredBadge", lang)}</Badge>}</span>;
      } },
    { key: "repeatCron", label: t("col.scheduleRepeat", lang), width: "100px",
      render: (v) => (v as string | null) ?? "—" },
    { key: "_count", label: t("col.scheduleTrc", lang), width: "140px",
      render: (_, r) => <span className="font-mono text-[11px]">{r._count.targets}/{r._count.reporters}/{r._count.confirmations}</span> },
  ];
  return <DataTable columns={cols} data={rows} rowKey={(r) => r.id} emptyMessage={t("empty.schedules", lang)} />;
}
