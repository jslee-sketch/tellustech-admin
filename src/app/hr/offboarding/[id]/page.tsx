import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ id: string }> };

export default async function OffboardingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const L = session.language;
  const r = await prisma.offboardingCard.findUnique({
    where: { id },
    include: { employee: { select: { employeeCode: true, nameVi: true } } },
  });
  if (!r) notFound();
  const checklists: [string, unknown][] = [
    ["반납 (returned)", r.returnedItems],
    ["지급 (paid)", r.paidItems],
    ["중지 (stopped)", r.stoppedItems],
    ["생성/증명서 (issued)", r.issuedItems],
  ];

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/hr/offboarding" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">{t("page.offboarding.back", L)}</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{r.offboardingCode}</span>
            <Badge tone={r.status === "COMPLETED" ? "success" : "accent"}>{r.status}</Badge>
          </h1>
        </div>
        <Card title="퇴사자">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <dt className="text-[color:var(--tts-sub)]">사원</dt><dd>{r.employee.employeeCode} · {r.employee.nameVi}</dd>
            <dt className="text-[color:var(--tts-sub)]">생성</dt><dd className="font-mono">{r.createdAt.toISOString().slice(0, 10)}</dd>
          </dl>
        </Card>
        {checklists.map(([label, json]) => json !== null && json !== undefined ? (
          <div key={label} className="mt-4">
            <Card title={label}>
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-[color:var(--tts-sub)]">{JSON.stringify(json, null, 2)}</pre>
            </Card>
          </div>
        ) : null)}
      </div>
    </main>
  );
}
