"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";
import { EmployeesImport } from "./employees-import";
import { t, type Lang } from "@/lib/i18n";

export type EmployeeRow = {
  id: string;
  employeeCode: string;
  nameVi: string;
  nameEn: string | null;
  nameKo: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  departmentCode: string | null;
  status: string;
  hireDate: string | null;
};

const statusTone: Record<string, BadgeTone> = {
  ACTIVE: "success",
  ON_LEAVE: "warn",
  TERMINATED: "neutral",
};

const statusLabelKey: Record<string, string> = {
  ACTIVE: "filter.empActive",
  ON_LEAVE: "filter.empOnLeave",
  TERMINATED: "filter.empTerminated",
};

export function EmployeesClient({ initialData, lang }: { initialData: EmployeeRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (!qLower) return true;
      return (
        e.employeeCode.toLowerCase().includes(qLower) ||
        e.nameVi.toLowerCase().includes(qLower) ||
        (e.nameEn?.toLowerCase().includes(qLower) ?? false) ||
        (e.nameKo?.toLowerCase().includes(qLower) ?? false) ||
        (e.email?.toLowerCase().includes(qLower) ?? false) ||
        (e.position?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [initialData, q, status]);

  const columns: DataTableColumn<EmployeeRow>[] = [
    {
      key: "employeeCode",
      label: t("col.empCode", lang),
      width: "110px",
      render: (v, row) => (
        <Link href={`/master/employees/${row.id}`} className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)] hover:underline">{v as string}</Link>
      ),
    },
    {
      key: "nameVi",
      label: t("col.empName", lang),
      render: (v, row) => (
        <Link href={`/master/employees/${row.id}`} className="font-semibold hover:underline">
          {v as string}
        </Link>
      ),
    },
    {
      key: "departmentCode",
      label: t("col.empDepartment", lang),
      width: "90px",
      render: (v) =>
        v ? <Badge tone="accent">{v as string}</Badge> : <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "position",
      label: t("col.empPosition", lang),
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "phone",
      label: t("col.empPhone", lang),
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "hireDate",
      label: t("col.empHireDate", lang),
      width: "110px",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "status",
      label: t("col.empStatus", lang),
      width: "80px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={statusTone[s] ?? "neutral"}>{statusLabelKey[s] ? t(statusLabelKey[s], lang) : s}</Badge>;
      },
    },
  ];

  return (
    <Card
      title={t("title.employeesMgmt", lang)}
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "employeeCode", header: t("col.empCode", lang) },
              { key: "nameVi", header: t("field.nameVi", lang) },
              { key: "nameEn", header: t("field.nameEn", lang) },
              { key: "nameKo", header: t("field.nameKo", lang) },
              { key: "position", header: t("col.empPosition", lang) },
              { key: "departmentCode", header: t("col.empDepartment", lang) },
              { key: "email", header: t("col.email", lang) },
              { key: "phone", header: t("col.empPhone", lang) },
              { key: "hireDate", header: t("col.empHireDate", lang) },
              { key: "status", header: t("col.empStatus", lang) },
            ]}
            filename={`employees-${new Date().toISOString().slice(0, 10)}.xlsx`}
            sheetName="Employees"
          />
          <Link href="/master/employees/new">
            <Button>{t("btn.registerEmployee", lang)}</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchEmp", lang)} />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">{t("filter.empAll", lang)}</option>
          <option value="ACTIVE">{t("filter.empActive", lang)}</option>
          <option value="ON_LEAVE">{t("filter.empOnLeave", lang)}</option>
          <option value="TERMINATED">{t("filter.empTerminated", lang)}</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(e) => e.id}
        emptyMessage={t("empty.employees", lang)}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActionBar={(ids, clear) => (
          <Button type="button" size="sm" variant="ghost" onClick={async () => {
            if (!confirm(`선택된 ${ids.length}건 (employee) 삭제(soft)?`)) return;
            setBusy(true);
            for (const id of ids) await fetch(`/api/master/employees/${id}`, { method: 'DELETE' });
            setBusy(false); clear(); location.reload();
          }} disabled={busy}>{busy ? '삭제 중…' : `선택 삭제 (${ids.length})`}</Button>
        )}
      />
      <div className="mt-4">
        <EmployeesImport lang={lang} />
      </div>
    </Card>
  );
}
