"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type ProjectRow = {
  id: string;
  projectCode: string;
  name: string;
  salesType: string;
};

const salesTone: Record<string, BadgeTone> = {
  TRADE: "purple",
  MAINTENANCE: "neutral",
  RENTAL: "primary",
  CALIBRATION: "success",
  REPAIR: "warn",
  OTHER: "neutral",
};

const salesShortKey: Record<string, string> = {
  TRADE: "salesTypeShort.TRADE",
  MAINTENANCE: "salesTypeShort.MAINTENANCE",
  RENTAL: "salesTypeShort.RENTAL",
  CALIBRATION: "salesTypeShort.CALIBRATION",
  REPAIR: "salesTypeShort.REPAIR",
  OTHER: "salesTypeShort.OTHER",
};

export function ProjectsClient({ initialData, lang }: { initialData: ProjectRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((p) => {
      if (type !== "all" && p.salesType !== type) return false;
      if (!qLower) return true;
      return (
        p.projectCode.toLowerCase().includes(qLower) ||
        p.name.toLowerCase().includes(qLower)
      );
    });
  }, [initialData, q, type]);

  const columns: DataTableColumn<ProjectRow>[] = [
    {
      key: "projectCode",
      label: t("col.projectCode", lang),
      width: "140px",
      render: (v, row) => (
        <Link href={`/master/projects/${row.id}`} className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)] hover:underline">{v as string}</Link>
      ),
    },
    {
      key: "name",
      label: t("col.projectName", lang),
      render: (v, row) => (
        <Link href={`/master/projects/${row.id}`} className="font-semibold hover:underline">
          {v as string}
        </Link>
      ),
    },
    {
      key: "salesType",
      label: t("col.salesType", lang),
      width: "140px",
      render: (v) => {
        const s = v as string;
        const key = salesShortKey[s];
        return <Badge tone={salesTone[s] ?? "neutral"}>{key ? t(key, lang) : s}</Badge>;
      },
    },
  ];

  return (
    <Card
      title={t("title.projectsMgmt", lang)}
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "projectCode", header: t("header.projectCode", lang) },
              { key: "name", header: t("header.projectName", lang) },
              { key: "salesType", header: t("header.salesType", lang) },
            ]}
            filename={`projects-${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
          <Link href="/master/projects/new">
            <Button>{t("btn.addProject", lang)}</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchProject", lang)} />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">{t("filter.allSalesType", lang)}</option>
          {Object.keys(salesShortKey).map((k) => (
            <option key={k} value={k}>
              {t(salesShortKey[k], lang)}
            </option>
          ))}
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(p) => p.id}
        emptyMessage={t("empty.projects", lang)}
      />
    </Card>
  );
}
