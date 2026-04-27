"use client";
import Link from "next/link";
import { Badge, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type OnbRow = {
  id: string; onboardingCode: string;
  employee: { employeeCode: string; nameVi: string } | null;
  status: string; createdAt: string;
};

export function OnboardingListClient({ rows, lang }: { rows: OnbRow[]; lang: Lang }) {
  const cols: DataTableColumn<OnbRow>[] = [
    { key: "onboardingCode", label: t("col.codeHr", lang), width: "170px",
      render: (v, r) => <Link href={`/hr/onboarding/${r.id}`} className="font-mono text-[11px] font-bold hover:underline">{String(v)}</Link> },
    { key: "employee", label: t("col.employeeHr", lang),
      render: (_, r) => r.employee ? <span>{r.employee.employeeCode} · {r.employee.nameVi}</span> : <span>—</span> },
    { key: "status", label: t("col.statusHr", lang), width: "110px",
      render: (v) => <Badge tone={v === "COMPLETED" ? "success" : v === "SUBMITTED" ? "warn" : "neutral"}>{String(v)}</Badge> },
    { key: "createdAt", label: t("col.createdAtHr", lang), width: "110px",
      render: (v) => <span className="font-mono text-[11px]">{String(v).slice(0,10)}</span> },
  ];
  return <DataTable columns={cols} data={rows} rowKey={(r) => r.id} emptyMessage={t("empty.onboardingCards", lang)} />;
}
