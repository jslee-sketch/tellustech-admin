import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Badge, Card, Multilingual } from "@/components/ui";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ id: string }> };

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const L = session.language;
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
          <Link href="/hr/incidents" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">{t("page.incidents.back", L)}</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold text-[color:var(--tts-text)]">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{r.incidentCode}</span>
            <Badge tone={r.type === "PRAISE" ? "success" : "warn"}>{r.type === "PRAISE" ? t("incidentType.PRAISE", L) : t("incidentType.IMPROVEMENT", L)}</Badge>
          </h1>
        </div>
        <Card title={t("section.incidentOverview", L)}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <dt className="text-[color:var(--tts-sub)]">{t("field.authorField", L)}</dt>
            <dd>{r.author ? `${r.author.employeeCode} · ${r.author.nameVi}` : "-"}</dd>
            <dt className="text-[color:var(--tts-sub)]">{t("field.subjectField", L)}</dt>
            <dd>{r.subject ? `${r.subject.employeeCode} · ${r.subject.nameVi}` : "-"}</dd>
            <dt className="text-[color:var(--tts-sub)]">{t("field.originalLangField", L)}</dt>
            <dd>{r.originalLang}</dd>
            <dt className="text-[color:var(--tts-sub)]">{t("field.writtenAt", L)}</dt>
            <dd>{r.createdAt.toISOString().slice(0, 10)}</dd>
          </dl>
        </Card>
        <div className="mt-4">
          <Card title={t("section.contentSec", L)}>
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
