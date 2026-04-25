"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type DepartmentRow = {
  id: string;
  code: string;
  name: string;
  branchType: string;
  managerId: string | null;
  managerLabel: string | null;
  companyCode: string;
};

export function DepartmentsClient({ initialData, lang }: { initialData: DepartmentRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState<string>("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((d) => {
      if (branch !== "all" && d.branchType !== branch) return false;
      if (!qLower) return true;
      return d.code.toLowerCase().includes(qLower) || d.name.toLowerCase().includes(qLower);
    });
  }, [initialData, q, branch]);

  const columns: DataTableColumn<DepartmentRow>[] = [
    {
      key: "code",
      label: t("col.deptCode", lang),
      width: "120px",
      render: (v, row) => (
        <Link href={`/master/departments/${row.id}`} className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)] hover:underline">{v as string}</Link>
      ),
    },
    {
      key: "name",
      label: t("col.deptName", lang),
      render: (v, row) => (
        <Link href={`/master/departments/${row.id}`} className="font-semibold hover:underline">
          {v as string}
        </Link>
      ),
    },
    {
      key: "branchType",
      label: t("col.branch", lang),
      width: "80px",
      render: (v) => <Badge tone="primary">{v as string}</Badge>,
    },
    {
      key: "managerLabel",
      label: t("col.deptManager", lang),
      render: (v) =>
        v ? (
          <span className="text-[13px]">{v as string}</span>
        ) : (
          <span className="text-[color:var(--tts-muted)]">—</span>
        ),
    },
    {
      key: "companyCode",
      label: t("col.companyShort", lang),
      width: "60px",
      render: (v) => <Badge tone="accent">{v as string}</Badge>,
    },
  ];

  return (
    <Card
      title={t("title.deptMgmt", lang)}
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "code", header: t("header.deptCode", lang) },
              { key: "name", header: t("header.deptName", lang) },
              { key: "branchType", header: t("col.branch", lang) },
              { key: "managerLabel", header: t("header.deptHead", lang) },
              { key: "companyCode", header: t("header.company", lang) },
            ]}
            filename={`departments-${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
          <Link href="/master/departments/new">
            <Button>{t("btn.addDept", lang)}</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchDept", lang)} />
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">{t("filter.allBranches", lang)}</option>
          <option value="BN">BN (Bắc Ninh)</option>
          <option value="HN">HN (Hà Nội)</option>
          <option value="HCM">HCM (Hồ Chí Minh)</option>
          <option value="NT">NT (Nha Trang)</option>
          <option value="DN">DN (Đà Nẵng)</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(d) => d.id}
        emptyMessage={t("empty.departments", lang)}
      />
    </Card>
  );
}
