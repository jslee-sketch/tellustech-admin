import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { AiEvaluationClient } from "./ai-eval-client";

export const dynamic = "force-dynamic";

export default async function AiEvaluationPage() {
  const session = await getSession();
  const employees = await prisma.employee.findMany({
    where: { companyCode: session.companyCode, status: "ACTIVE" },
    orderBy: { employeeCode: "asc" },
    select: { id: true, employeeCode: true, nameVi: true, nameKo: true },
    take: 500,
  });

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link href="/hr/evaluations" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">← 정기평가 목록</Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
            AI 종합 인사평가
            <span className="ml-3 rounded bg-[color:var(--tts-accent-dim)] px-2 py-0.5 text-[11px] text-[color:var(--tts-accent)]">Beta</span>
          </h1>
          <p className="mt-1 text-[12px] text-[color:var(--tts-sub)]">
            9지표 가중합 + Claude API 사건/편향 분석. API 키 없으면 규칙기반 점수만 산출.
          </p>
        </div>
        <Card>
          <AiEvaluationClient
            employees={employees.map((e) => ({ value: e.id, label: `${e.employeeCode} · ${e.nameVi}` }))}
          />
        </Card>
      </div>
    </main>
  );
}
