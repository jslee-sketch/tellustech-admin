"use client";

import Link from "next/link";
import { Badge, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type LeaveRow = {
  id: string; leaveCode: string;
  employee: { employeeCode: string; nameVi: string } | null;
  leaveType: string; startDate: string; endDate: string; days: string; status: string;
};

export function LeaveListClient({ rows, lang }: { rows: LeaveRow[]; lang: Lang }) {
  const cols: DataTableColumn<LeaveRow>[] = [
    { key: "leaveCode", label: t("col.leaveCode", lang), width: "160px",
      render: (v, r) => <Link href={`/hr/leave/${r.id}`} className="font-mono text-[11px] font-bold hover:underline">{String(v)}</Link> },
    { key: "employee", label: t("col.employeeHr", lang),
      render: (_, r) => <span>{r.employee?.employeeCode} · {r.employee?.nameVi}</span> },
    { key: "leaveType", label: t("col.leaveType", lang), width: "80px",
      render: (v) => <Badge tone="primary">{String(v)}</Badge> },
    { key: "startDate", label: t("col.leaveStart", lang), width: "110px",
      render: (v) => <span className="font-mono text-[11px]">{String(v).slice(0,10)}</span> },
    { key: "endDate", label: t("col.leaveEnd", lang), width: "110px",
      render: (v) => <span className="font-mono text-[11px]">{String(v).slice(0,10)}</span> },
    { key: "days", label: t("col.leaveDays", lang), width: "70px", align: "right",
      render: (v) => <span className="font-mono text-[11px]">{Number(v).toFixed(1)}</span> },
    { key: "status", label: t("col.leaveStatus", lang), width: "90px",
      render: (v) => <Badge tone={v === "APPROVED" ? "success" : v === "REJECTED" ? "danger" : "warn"}>{String(v)}</Badge> },
  ];
  return <DataTable columns={cols} data={rows} rowKey={(r) => r.id} emptyMessage={t("empty.leave", lang)} />;
}
