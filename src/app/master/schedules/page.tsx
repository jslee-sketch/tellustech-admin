import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Badge, Card, DataTable, ExcelDownload } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const session = await getSession();
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
            <h1 className="mt-1 text-2xl font-extrabold">일정(마감) 관리 · CFM</h1>
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
                { key: "scheduleCode", header: "일정코드" },
                { key: "title", header: "제목" },
                { key: "dueAt", header: "마감일" },
                { key: "repeatCron", header: "반복" },
              ]}
              filename={`schedules-${new Date().toISOString().slice(0, 10)}.xlsx`}
            />
            <Link href="/master/schedules/new" className="rounded-md bg-[color:var(--tts-primary)] px-3 py-2 text-[12px] font-bold text-white hover:opacity-90">+ 일정 등록</Link>
          </div>
        </div>
        <Card title="일정" count={rows.length}>
          <DataTable
            columns={[
              { key: "scheduleCode", label: "코드", width: "160px", render: (v) => <span className="font-mono text-[11px]">{v as string}</span> },
              { key: "title", label: "제목" },
              { key: "dueAt", label: "마감", width: "170px", render: (v) => {
                const d = v as Date;
                const left = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return <span className="font-mono text-[11px]">{d.toISOString().slice(0, 10)} {left >= 0 ? `(D-${left})` : <Badge tone="danger">만료</Badge>}</span>;
              } },
              { key: "repeatCron", label: "반복", width: "100px", render: (v) => (v as string | null) ?? "—" },
              { key: "_count", label: "타깃/보고/CFM", width: "140px", render: (_, r) => <span className="font-mono text-[11px]">{r._count.targets}/{r._count.reporters}/{r._count.confirmations}</span> },
            ]}
            data={rows}
            rowKey={(r) => r.id}
            emptyMessage="등록된 일정이 없습니다"
          />
        </Card>
      </div>
    </main>
  );
}
