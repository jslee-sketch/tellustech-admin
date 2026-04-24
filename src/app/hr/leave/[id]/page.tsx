import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ id: string }> };

export default async function LeaveDetailPage({ params }: PageProps) {
  const { id } = await params;
  await getSession();
  const r = await prisma.leaveRecord.findUnique({
    where: { id },
    include: { employee: { select: { employeeCode: true, nameVi: true } } },
  });
  if (!r) notFound();
  const tones: Record<string, "success" | "warn" | "accent"> = { APPROVED: "success", PENDING: "accent", REJECTED: "warn" };

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/hr/leave" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">← 연차 목록</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{r.leaveCode}</span>
            <Badge tone={tones[r.status] ?? "accent"}>{r.status}</Badge>
          </h1>
        </div>
        <Card title="상세">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <dt className="text-[color:var(--tts-sub)]">신청자</dt>
            <dd>{r.employee.employeeCode} · {r.employee.nameVi}</dd>
            <dt className="text-[color:var(--tts-sub)]">유형</dt>
            <dd>{r.leaveType}</dd>
            <dt className="text-[color:var(--tts-sub)]">기간</dt>
            <dd>{r.startDate.toISOString().slice(0,10)} ~ {r.endDate.toISOString().slice(0,10)}</dd>
            <dt className="text-[color:var(--tts-sub)]">일수</dt>
            <dd>{Number(r.days)}</dd>
            <dt className="text-[color:var(--tts-sub)]">사유</dt>
            <dd className="whitespace-pre-wrap">{r.reason ?? "-"}</dd>
          </dl>
        </Card>
      </div>
    </main>
  );
}
