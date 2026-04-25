"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";
import { ClientsImport } from "./clients-import";
import { t, type Lang } from "@/lib/i18n";

export type ClientRow = {
  id: string;
  clientCode: string;
  companyNameVi: string;
  companyNameEn: string | null;
  taxCode: string | null;
  phone: string | null;
  grade: string | null;
  receivableStatus: string;
  contactCount: number;
};

const gradeTone: Record<string, BadgeTone> = {
  A: "success",
  B: "primary",
  C: "warn",
  D: "danger",
};

const recvTone: Record<string, BadgeTone> = {
  NORMAL: "success",
  WARNING: "warn",
  BLOCKED: "danger",
};

const recvLabelKey: Record<string, string> = {
  NORMAL: "filter.recvNormal",
  WARNING: "filter.recvWarning",
  BLOCKED: "filter.recvBlocked",
};

export function ClientsClient({ initialData, lang }: { initialData: ClientRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("all");
  const [receivable, setReceivable] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((c) => {
      if (grade !== "all" && c.grade !== grade) return false;
      if (receivable !== "all" && c.receivableStatus !== receivable) return false;
      if (!qLower) return true;
      return (
        c.clientCode.toLowerCase().includes(qLower) ||
        c.companyNameVi.toLowerCase().includes(qLower) ||
        (c.companyNameEn?.toLowerCase().includes(qLower) ?? false) ||
        (c.taxCode?.toLowerCase().includes(qLower) ?? false) ||
        (c.phone?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [initialData, q, grade, receivable]);

  const columns: DataTableColumn<ClientRow>[] = [
    {
      key: "clientCode",
      label: t("col.clientCode", lang),
      width: "150px",
      render: (v, row) => (
        <Link href={`/master/clients/${row.id}`} className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)] hover:underline">
          {v as string}
        </Link>
      ),
    },
    {
      key: "companyNameVi",
      label: t("col.clientName", lang),
      render: (v, row) => (
        <Link href={`/master/clients/${row.id}`} className="font-semibold hover:underline">
          {v as string}
        </Link>
      ),
    },
    {
      key: "taxCode",
      label: t("col.taxCodeShort", lang),
      width: "120px",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "phone",
      label: t("col.phone", lang),
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "grade",
      label: t("col.gradeShort", lang),
      width: "60px",
      render: (v) => {
        const g = v as string | null;
        return g ? <Badge tone={gradeTone[g] ?? "neutral"}>{g}</Badge> : (
          <span className="text-[color:var(--tts-muted)]">—</span>
        );
      },
    },
    {
      key: "receivableStatus",
      label: t("col.recvShort", lang),
      width: "80px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={recvTone[s] ?? "neutral"}>{recvLabelKey[s] ? t(recvLabelKey[s], lang) : s}</Badge>;
      },
    },
    {
      key: "contactCount",
      label: t("col.contactCount", lang),
      width: "80px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{t("col.contactCountUnit", lang).replace("{count}", String(v as number))}</span>,
    },
  ];

  return (
    <Card
      title={t("title.clientsMgmt", lang)}
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "clientCode", header: t("col.clientCode", lang) },
              { key: "companyNameVi", header: t("field.companyNameVi", lang) },
              { key: "companyNameEn", header: t("field.companyNameEn", lang) },
              { key: "taxCode", header: t("field.taxCode", lang) },
              { key: "phone", header: t("col.phone", lang) },
              { key: "grade", header: t("col.gradeShort", lang) },
              { key: "receivableStatus", header: t("col.recvShort", lang) },
            ]}
            filename={`clients-${new Date().toISOString().slice(0, 10)}.xlsx`}
            sheetName="Clients"
          />
          <Link href="/master/clients/new">
            <Button>{t("btn.clientRegister", lang)}</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchClient", lang)} />
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">{t("filter.gradeAll", lang)}</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
        <select
          value={receivable}
          onChange={(e) => setReceivable(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">{t("filter.recvAll", lang)}</option>
          <option value="NORMAL">{t("filter.recvNormal", lang)}</option>
          <option value="WARNING">{t("filter.recvWarning", lang)}</option>
          <option value="BLOCKED">{t("filter.recvBlocked", lang)}</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(c) => c.id}
        emptyMessage={t("empty.clients", lang)}
      />
      <div className="mt-4">
        <ClientsImport />
      </div>
    </Card>
  );
}
