"use client";
import Link from "next/link";
import { Badge, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type EvalRow = {
  id: string; evaluationCode: string;
  reviewer: { employeeCode: string; nameVi: string } | null;
  subject:  { employeeCode: string; nameVi: string } | null;
  deadline: string; submittedAt: string | null; normalizedScore: string;
};

export function EvaluationsListClient({ rows, lang }: { rows: EvalRow[]; lang: Lang }) {
  const cols: DataTableColumn<EvalRow>[] = [
    { key: "evaluationCode", label: t("col.evalCode", lang), width: "170px",
      render: (v, r) => <Link href={`/hr/evaluations/${r.id}`} className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)] hover:underline">{String(v)}</Link> },
    { key: "reviewer", label: t("col.reviewer", lang),
      render: (_, r) => <span>{r.reviewer?.employeeCode} · {r.reviewer?.nameVi}</span> },
    { key: "subject", label: t("col.subjectEval", lang),
      render: (_, r) => <span>{r.subject?.employeeCode} · {r.subject?.nameVi}</span> },
    { key: "deadline", label: t("col.deadlineCol", lang), width: "110px",
      render: (v) => <span className="font-mono text-[11px]">{String(v).slice(0,10)}</span> },
    { key: "submittedAt", label: t("col.submittedCol", lang), width: "110px",
      render: (v) => v ? <Badge tone="success">{String(v).slice(0,10)}</Badge> : <Badge tone="warn">{t("label.notSubmitted", lang)}</Badge> },
    { key: "normalizedScore", label: t("col.score100Col", lang), width: "100px", align: "right",
      render: (v) => <span className="font-mono font-bold">{Number(v).toFixed(1)}</span> },
  ];
  return <DataTable columns={cols} data={rows} rowKey={(r) => r.id} emptyMessage={t("empty.evaluations", lang)} />;
}
