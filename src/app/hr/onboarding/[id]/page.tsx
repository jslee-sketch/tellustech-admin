import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ id: string }> };

export default async function OnboardingDetailPage({ params }: PageProps) {
  const { id } = await params;
  await getSession();
  const r = await prisma.onboardingCard.findUnique({
    where: { id },
    include: { employee: { select: { employeeCode: true, nameVi: true, nameEn: true } } },
  });
  if (!r) notFound();

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/hr/onboarding" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">← 입사카드 목록</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{r.onboardingCode}</span>
            <Badge tone={r.status === "COMPLETED" ? "success" : "accent"}>{r.status}</Badge>
          </h1>
        </div>
        <Card title="입사자">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <dt className="text-[color:var(--tts-sub)]">사원코드</dt><dd className="font-mono">{r.employee.employeeCode}</dd>
            <dt className="text-[color:var(--tts-sub)]">이름(VI)</dt><dd>{r.employee.nameVi}</dd>
            <dt className="text-[color:var(--tts-sub)]">이름(EN)</dt><dd>{r.employee.nameEn ?? "-"}</dd>
            <dt className="text-[color:var(--tts-sub)]">생성</dt><dd className="font-mono">{r.createdAt.toISOString().slice(0, 10)}</dd>
          </dl>
        </Card>
        <div className="mt-4">
          <Card title="개인정보 (raw)">
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-[color:var(--tts-sub)]">{JSON.stringify(r.personalInfo ?? {}, null, 2)}</pre>
          </Card>
        </div>
        {r.education !== null && r.education !== undefined && (
          <div className="mt-4">
            <Card title="학력">
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-[color:var(--tts-sub)]">{JSON.stringify(r.education, null, 2)}</pre>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
