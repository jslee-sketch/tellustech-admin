import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ id: string }> };

export default async function EvaluationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const L = session.language;
  const r = await prisma.regularEvaluation.findUnique({
    where: { id },
    include: {
      reviewer: { select: { employeeCode: true, nameVi: true } },
      subject: { select: { employeeCode: true, nameVi: true } },
    },
  });
  if (!r) notFound();
  const answers = (r.answersJson as Record<string, number>) ?? {};

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/hr/evaluations" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">{t("page.evaluations.back", L)}</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{r.evaluationCode}</span>
            <span className="text-[20px] text-[color:var(--tts-accent)]">{Number(r.normalizedScore).toFixed(1)}점</span>
          </h1>
        </div>
        <Card title="개요">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <dt className="text-[color:var(--tts-sub)]">평가자</dt>
            <dd>{r.reviewer.employeeCode} · {r.reviewer.nameVi}</dd>
            <dt className="text-[color:var(--tts-sub)]">피평가자</dt>
            <dd>{r.subject.employeeCode} · {r.subject.nameVi}</dd>
            <dt className="text-[color:var(--tts-sub)]">마감일</dt>
            <dd>{r.deadline.toISOString().slice(0, 10)}</dd>
            <dt className="text-[color:var(--tts-sub)]">제출일</dt>
            <dd>{r.submittedAt ? r.submittedAt.toISOString().slice(0, 10) : "미제출"}</dd>
            <dt className="text-[color:var(--tts-sub)]">정규화 점수</dt>
            <dd className="font-bold text-[color:var(--tts-accent)]">{Number(r.normalizedScore).toFixed(2)} / 100</dd>
          </dl>
        </Card>
        <div className="mt-4">
          <Card title="답변 (5단계: 10/8/6/4/2)">
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"><th className="py-2 text-left">질문</th><th className="py-2 text-right">점수</th></tr></thead>
              <tbody>
                {Object.entries(answers).map(([q, s]) => (
                  <tr key={q} className="border-b border-[color:var(--tts-border)]/50"><td className="py-2">{q}</td><td className="py-2 text-right font-mono">{s}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </main>
  );
}
