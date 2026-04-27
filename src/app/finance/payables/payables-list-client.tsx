"use client";

import Link from "next/link";
import { Badge, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type PayableRow = {
  id: string;
  kind: "RECEIVABLE" | "PAYABLE";
  status: string;
  clientLabel: string;
  clientBlocked: boolean;
  ref: string;
  amount: string;
  paidAmount: string;
  outstanding: string;
  dueDate: string;
};

export function PayablesListClient({ data, lang }: { data: PayableRow[]; lang: Lang }) {
  const cols: DataTableColumn<PayableRow>[] = [
    { key: "kind", label: t("col.kind", lang), width: "90px",
      render: (v, r) => <Link href={`/finance/payables/${r.id}`} className="hover:underline">
        <Badge tone={v === "RECEIVABLE" ? "success" : "warn"}>{v === "RECEIVABLE" ? t("kind.AR", lang) : t("kind.AP", lang)}</Badge>
      </Link> },
    { key: "status", label: t("col.statusShort", lang), width: "110px",
      render: (v) => <Badge tone={v === "PAID" ? "success" : v === "PARTIAL" ? "accent" : v === "WRITTEN_OFF" ? "neutral" : "warn"}>{String(v)}</Badge> },
    { key: "ref", label: t("col.refReceipt", lang), width: "160px",
      render: (v, r) => <Link href={`/finance/payables/${r.id}`} className="font-mono text-[11px] text-[color:var(--tts-accent)] hover:underline">{String(v)}</Link> },
    { key: "clientLabel", label: t("col.client", lang),
      render: (_, r) => <span>{r.clientLabel}{r.clientBlocked && <span className="ml-2"><Badge tone="danger">{t("label.AR_blocked", lang)}</Badge></span>}</span> },
    { key: "amount", label: t("field.amount", lang), width: "130px", align: "right",
      render: (v) => <span className="font-mono text-[12px]">{new Intl.NumberFormat("vi-VN").format(Number(v))}</span> },
    { key: "paidAmount", label: t("col.paidVnd", lang), width: "130px", align: "right",
      render: (v) => <span className="font-mono text-[12px] text-[color:var(--tts-success)]">{new Intl.NumberFormat("vi-VN").format(Number(v))}</span> },
    { key: "outstanding", label: t("field.outstanding", lang), width: "130px", align: "right",
      render: (v) => {
        const n = Number(v);
        return <span className={`font-mono text-[13px] font-bold ${n > 0 ? "text-[color:var(--tts-danger)]" : ""}`}>{new Intl.NumberFormat("vi-VN").format(n)}</span>;
      } },
    { key: "dueDate", label: t("col.dueDateShort", lang), width: "110px" },
  ];
  return (
    <DataTable
      columns={cols}
      data={data}
      rowKey={(r) => r.id}
      emptyMessage={t("empty.payables", lang)}
    />
  );
}
