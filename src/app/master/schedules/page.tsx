import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Badge, Card, DataTable, ExcelDownload } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const session = await getSession();
  const L = session.language;
  const rows = await prisma.schedule.findMany({
    where: { companyCode: session.companyCode },
    orderBy: { dueAt: "asc" }, take: 300,
    include: { _count: { select: { targets: true, reporters: true, confirmations: true } } },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH ERP</Link>
            <h1 className="mt-1 text-2xl font-extrabold">{t("page.schedules.title", L)}</h1>
          </div>
          <div className="flex gap-2">
            <ExcelDownload
              rows={rows.map((r) => ({
                scheduleCode: r.scheduleCode,
                title: r.title,
                dueAt: r.dueAt.toISOString().slice(0, 10),
                repeatCron: r.repeatCron ?? "",
              }))}
              columns={[
                { key: "scheduleCode", header: t("header.scheduleCode", L) },
                { key: "title", header: t("header.scheduleTitle", L) },
                { key: "dueAt", header: t("header.scheduleDue", L) },
                { key: "repeatCron", header: t("header.scheduleRepeat", L) },
              ]}
              filename={`schedules-${new Date().toISOString().slice(0, 10)}.xlsx`}
            />
            <Link href="/master/schedules/new" className="rounded-md bg-[color:var(--tts-primary)] px-3 py-2 text-[12px] font-bold text-white hover:opacity-90">{t("page.schedules.new", L)}</Link>
          </div>
        </div>
        <Card title={t("title.schedules", L)} count={rows.length}>
          <DataTable
            columns={[
              { key: "scheduleCode", label: t("col.scheduleCode", L), width: "160px", render: (v, row) => <Link href={`/master/schedules/${row.id}`} className="font-mono text-[11px] text-[color:var(--tts-primary)] hover:underline">{v as string}</Link> },
              { key: "title", label: t("col.scheduleTitle", L) },
              { key: "dueAt", label: t("col.scheduleDeadline", L), width: "170px", render: (v) => {
                const d = v as Date;
                const left = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return <span className="font-mono text-[11px]">{d.toISOString().slice(0, 10)} {left >= 0 ? `(D-${left})` : <Badge tone="danger">{t("label.expiredBadge", L)}</Badge>}</span>;
              } },
              { key: "repeatCron", label: t("col.scheduleRepeat", L), width: "100px", render: (v) => (v as string | null) ?? "—" },
              { key: "_count", label: t("col.scheduleTrc", L), width: "140px", render: (_, r) => <span className="font-mono text-[11px]">{r._count.targets}/{r._count.reporters}/{r._count.confirmations}</span> },
            ]}
            data={rows}
            rowKey={(r) => r.id}
            emptyMessage={t("empty.schedules", L)}
          />
        </Card>
      </div>
    </main>
  );
}
