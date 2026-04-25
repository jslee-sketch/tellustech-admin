import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { AiEvaluationClient } from "./ai-eval-client";

export const dynamic = "force-dynamic";

export default async function AiEvaluationPage() {
  const session = await getSession();
  const L = session.language;
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
          <Link href="/hr/evaluations" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">{t("page.evaluations.back", L)}</Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
            {t("page.evaluations.ai", L)}
            <span className="ml-3 rounded bg-[color:var(--tts-accent-dim)] px-2 py-0.5 text-[11px] text-[color:var(--tts-accent)]">{t("label.aiBeta", L)}</span>
          </h1>
          <p className="mt-1 text-[12px] text-[color:var(--tts-sub)]">
            {t("label.aiDescription", L)}
          </p>
        </div>
        <Card>
          <AiEvaluationClient
            lang={L}
            employees={employees.map((e) => ({ value: e.id, label: `${e.employeeCode} · ${e.nameVi}` }))}
          />
        </Card>
      </div>
    </main>
  );
}
