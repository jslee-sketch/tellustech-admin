import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ id: string }> };

export default async function LicenseDetailPage({ params }: PageProps) {
  const { id } = await params;
  await getSession();
  const r = await prisma.license.findUnique({
    where: { id },
    include: { owner: { select: { employeeCode: true, nameVi: true } } },
  });
  if (!r) notFound();
  const daysLeft = Math.ceil((r.expiresAt.getTime() - Date.now()) / 86400000);
  const tone: "success" | "warn" | "accent" = daysLeft < 0 ? "warn" : daysLeft < (r.alertBeforeDays ?? 30) ? "accent" : "success";

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/master/licenses" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">← 라이선스 목록</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{r.licenseCode}</span>
            <span className="text-[16px]">{r.name}</span>
            <Badge tone={tone}>{daysLeft < 0 ? "만료됨" : `${daysLeft}일 남음`}</Badge>
          </h1>
        </div>
        <Card title="상세">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <dt className="text-[color:var(--tts-sub)]">소유자</dt><dd>{r.owner ? `${r.owner.employeeCode} · ${r.owner.nameVi}` : "회사 소유"}</dd>
            <dt className="text-[color:var(--tts-sub)]">취득일</dt><dd className="font-mono">{r.acquiredAt.toISOString().slice(0, 10)}</dd>
            <dt className="text-[color:var(--tts-sub)]">만료일</dt><dd className="font-mono">{r.expiresAt.toISOString().slice(0, 10)}</dd>
            <dt className="text-[color:var(--tts-sub)]">갱신 비용</dt><dd className="font-mono">{r.renewalCost ? Number(r.renewalCost).toLocaleString() : "-"}</dd>
            <dt className="text-[color:var(--tts-sub)]">사전 알림 (일)</dt><dd>{r.alertBeforeDays ?? "-"}</dd>
          </dl>
        </Card>
      </div>
    </main>
  );
}
