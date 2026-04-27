"use client";
import Link from "next/link";
import { Badge, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { pickName, t, type Lang } from "@/lib/i18n";

export type LicenseRow = {
  id: string; licenseCode: string; name: string;
  owner: { employeeCode: string; nameVi: string } | null;
  acquiredAt: string; expiresAt: string; renewalCost: string | null;
};

export function LicensesListClient({ rows, lang }: { rows: LicenseRow[]; lang: Lang }) {
  const cols: DataTableColumn<LicenseRow>[] = [
    { key: "licenseCode", label: t("col.licenseCode", lang), width: "160px",
      render: (v, r) => <Link href={`/master/licenses/${r.id}`} className="font-mono text-[11px] text-[color:var(--tts-primary)] hover:underline">{String(v)}</Link> },
    { key: "name", label: t("col.licenseName", lang) },
    { key: "owner", label: t("col.licenseOwner", lang),
      render: (_, r) => r.owner ? <span>{r.owner.employeeCode} · {pickName(r.owner, lang)}</span> : <span className="text-[color:var(--tts-muted)]">—</span> },
    { key: "acquiredAt", label: t("col.acquiredAtCol", lang), width: "110px",
      render: (v) => <span className="font-mono text-[11px]">{String(v).slice(0,10)}</span> },
    { key: "expiresAt", label: t("col.expiresAtCol", lang), width: "140px",
      render: (v) => {
        const d = new Date(String(v));
        const left = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return <span><span className="font-mono text-[11px]">{String(v).slice(0,10)}</span>{" "}{left < 0 ? <Badge tone="danger">{t("label.expired", lang)}</Badge> : left < 30 ? <Badge tone="warn">D-{left}</Badge> : null}</span>;
      } },
    { key: "renewalCost", label: t("col.renewalCost", lang), width: "140px", align: "right",
      render: (v) => v ? <span className="font-mono text-[12px]">{new Intl.NumberFormat("vi-VN").format(Number(v))}</span> : <span className="text-[color:var(--tts-muted)]">—</span> },
  ];
  return <DataTable columns={cols} data={rows} rowKey={(r) => r.id} emptyMessage={t("empty.licenses", lang)} />;
}
