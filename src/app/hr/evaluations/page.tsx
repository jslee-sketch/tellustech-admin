import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card, ExcelDownload } from "@/components/ui";
import { EvaluationsListClient } from "./evaluations-list-client";

export const dynamic = "force-dynamic";

export default async function EvaluationsPage() {
  const session = await getSession();
  const L = session.language;
  const rows = await prisma.regularEvaluation.findMany({
    where: { companyCode: session.companyCode },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      reviewer: { select: { employeeCode: true, nameVi: true } },
      subject: { select: { employeeCode: true, nameVi: true } },
    },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH ERP</Link>
            <h1 className="mt-1 text-2xl font-extrabold">{t("page.evaluations.title", L)}</h1>
          </div>
          <div className="flex gap-2">
            <ExcelDownload
              rows={rows.map((r) => ({
                code: r.evaluationCode,
                reviewer: r.reviewer ? `${r.reviewer.employeeCode} · ${r.reviewer.nameVi}` : "",
                subject: r.subject ? `${r.subject.employeeCode} · ${r.subject.nameVi}` : "",
                deadline: r.deadline.toISOString().slice(0, 10),
                submitted: r.submittedAt ? r.submittedAt.toISOString().slice(0, 10) : "",
                score: Number(r.normalizedScore).toFixed(1),
              }))}
              columns={[
                { key: "code", header: t("header.evalCode", L) },
                { key: "reviewer", header: t("header.reviewer", L) },
                { key: "subject", header: t("header.subjectEval", L) },
                { key: "deadline", header: t("header.deadline", L) },
                { key: "submitted", header: t("header.submitted", L) },
                { key: "score", header: t("header.score100", L) },
              ]}
              filename="evaluations.xlsx"
            />
            <Link href="/hr/evaluations/ai" className="rounded-md bg-[color:var(--tts-accent)] px-3 py-2 text-[12px] font-bold text-white hover:opacity-90">{t("btn.aiCompositeEval", L)}</Link>
            <Link href="/hr/evaluations/new" className="rounded-md bg-[color:var(--tts-primary)] px-3 py-2 text-[12px] font-bold text-white hover:opacity-90">{t("page.evaluations.new", L)}</Link>
          </div>
        </div>
        <Card title={t("title.evaluationsList", L)} count={rows.length}>
          <EvaluationsListClient rows={rows.map(r => ({
            id: r.id, evaluationCode: r.evaluationCode,
            reviewer: r.reviewer, subject: r.subject,
            deadline: r.deadline.toISOString(),
            submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
            normalizedScore: r.normalizedScore.toString(),
          }))} lang={L} />
        </Card>
      </div>
    </main>
  );
}
