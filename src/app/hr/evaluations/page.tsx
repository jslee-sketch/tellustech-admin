import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Badge, Card, DataTable, ExcelDownload } from "@/components/ui";

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
                { key: "code", header: "코드" },
                { key: "reviewer", header: "평가자" },
                { key: "subject", header: "피평가자" },
                { key: "deadline", header: "마감" },
                { key: "submitted", header: "제출" },
                { key: "score", header: "점수(100)" },
              ]}
              filename="evaluations.xlsx"
            />
            <Link href="/hr/evaluations/ai" className="rounded-md bg-[color:var(--tts-accent)] px-3 py-2 text-[12px] font-bold text-white hover:opacity-90">✨ AI 종합평가</Link>
            <Link href="/hr/evaluations/new" className="rounded-md bg-[color:var(--tts-primary)] px-3 py-2 text-[12px] font-bold text-white hover:opacity-90">{t("page.evaluations.new", L)}</Link>
          </div>
        </div>
        <Card title="정기 평가" count={rows.length}>
          <DataTable
            columns={[
              { key: "evaluationCode", label: "코드", width: "170px", render: (v, row) => <Link href={`/hr/evaluations/${row.id}`} className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)] hover:underline">{v as string}</Link> },
              { key: "reviewer", label: "평가자", render: (_, row) => <span>{row.reviewer?.employeeCode} · {row.reviewer?.nameVi}</span> },
              { key: "subject", label: "피평가자", render: (_, row) => <span>{row.subject?.employeeCode} · {row.subject?.nameVi}</span> },
              { key: "deadline", label: "마감", width: "110px", render: (v) => <span className="font-mono text-[11px]">{(v as Date).toISOString().slice(0, 10)}</span> },
              { key: "submittedAt", label: "제출", width: "110px", render: (v) => v ? <Badge tone="success">{(v as Date).toISOString().slice(0, 10)}</Badge> : <Badge tone="warn">미제출</Badge> },
              { key: "normalizedScore", label: "점수(100)", width: "100px", align: "right", render: (v) => <span className="font-mono font-bold">{Number(v).toFixed(1)}</span> },
            ]}
            data={rows}
            rowKey={(r) => r.id}
            emptyMessage="등록된 평가가 없습니다"
          />
        </Card>
      </div>
    </main>
  );
}
