import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Badge, Card, Multilingual } from "@/components/ui";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ id: string }> };

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const r = await prisma.incident.findUnique({
    where: { id },
    include: {
      author: { select: { employeeCode: true, nameVi: true } },
      subject: { select: { employeeCode: true, nameVi: true } },
    },
  });
  if (!r) notFound();

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/hr/incidents" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">← 사건평가 목록</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold text-[color:var(--tts-text)]">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{r.incidentCode}</span>
            <Badge tone={r.type === "PRAISE" ? "success" : "warn"}>{r.type === "PRAISE" ? "칭찬" : "개선필요"}</Badge>
          </h1>
        </div>
        <Card title="개요">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <dt className="text-[color:var(--tts-sub)]">작성자</dt>
            <dd>{r.author ? `${r.author.employeeCode} · ${r.author.nameVi}` : "-"}</dd>
            <dt className="text-[color:var(--tts-sub)]">대상자</dt>
            <dd>{r.subject ? `${r.subject.employeeCode} · ${r.subject.nameVi}` : "-"}</dd>
            <dt className="text-[color:var(--tts-sub)]">원문 언어</dt>
            <dd>{r.originalLang}</dd>
            <dt className="text-[color:var(--tts-sub)]">작성일</dt>
            <dd>{r.createdAt.toISOString().slice(0, 10)}</dd>
          </dl>
        </Card>
        <div className="mt-4">
          <Card title="내용">
            <Multilingual
              vi={r.contentVi}
              en={r.contentEn}
              ko={r.contentKo}
              originalLang={r.originalLang ?? "VI"}
              currentLang={session.language}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}
