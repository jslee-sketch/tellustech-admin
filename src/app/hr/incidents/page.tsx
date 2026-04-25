import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Badge, Card, DataTable, ExcelDownload } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  const session = await getSession();
  const L = session.language;
  const rows = await prisma.incident.findMany({
    where: { companyCode: session.companyCode },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      author: { select: { employeeCode: true, nameVi: true } },
      subject: { select: { employeeCode: true, nameVi: true } },
    },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH ERP</Link>
            <h1 className="mt-1 text-2xl font-extrabold">{t("page.incidents.title", L)}</h1>
          </div>
          <div className="flex gap-2">
            <ExcelDownload
              rows={rows.map((r) => ({
                code: r.incidentCode,
                type: r.type,
                author: r.author ? `${r.author.employeeCode} · ${r.author.nameVi}` : "",
                subject: r.subject ? `${r.subject.employeeCode} · ${r.subject.nameVi}` : "",
                content: (r.contentVi ?? r.contentKo ?? r.contentEn ?? "").slice(0, 200),
                date: r.createdAt.toISOString().slice(0, 10),
              }))}
              columns={[
                { key: "code", header: t("header.codeIncident", L) },
                { key: "type", header: t("header.incidentType", L) },
                { key: "author", header: t("header.author", L) },
                { key: "subject", header: t("header.subject", L) },
                { key: "content", header: t("header.contentH", L) },
                { key: "date", header: t("header.dateH", L) },
              ]}
              filename="incidents.xlsx"
            />
            <Link href="/hr/incidents/new" className="rounded-md bg-[color:var(--tts-primary)] px-3 py-2 text-[12px] font-bold text-white hover:opacity-90">{t("page.incidents.new", L)}</Link>
          </div>
        </div>
        <Card title={t("title.incidentsList", L)} count={rows.length}>
          <DataTable
            columns={[
              { key: "incidentCode", label: t("col.incidentCode", L), width: "160px", render: (v, row) => <Link href={`/hr/incidents/${row.id}`} className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)] hover:underline">{v as string}</Link> },
              { key: "type", label: t("col.incidentType", L), width: "90px", render: (v) => <Badge tone={v === "PRAISE" ? "success" : "warn"}>{v === "PRAISE" ? t("incidentType.PRAISE", L) : t("incidentType.IMPROVEMENT", L)}</Badge> },
              { key: "author", label: t("col.author", L), render: (_, row) => <span>{row.author?.employeeCode} · {row.author?.nameVi}</span> },
              { key: "subject", label: t("col.subjectCol", L), render: (_, row) => <span>{row.subject?.employeeCode} · {row.subject?.nameVi}</span> },
              { key: "contentVi", label: t("col.contentSummary", L), render: (_, row) => {
                const text = row.contentVi ?? row.contentKo ?? row.contentEn ?? "";
                return <span className="text-[12px] text-[color:var(--tts-sub)]">{text.slice(0, 60)}{text.length > 60 ? "..." : ""}</span>;
              } },
              { key: "createdAt", label: t("col.writtenAt", L), width: "110px", render: (v) => <span className="font-mono text-[11px]">{(v as Date).toISOString().slice(0, 10)}</span> },
            ]}
            data={rows}
            rowKey={(r) => r.id}
            emptyMessage={t("empty.incidents", L)}
          />
        </Card>
      </div>
    </main>
  );
}
