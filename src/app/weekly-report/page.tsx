import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { WeeklyReportShell } from "./weekly-report-shell";

export const dynamic = "force-dynamic";

function nextFridayDeadline(): Date {
  const now = new Date();
  const d = new Date(now);
  const day = d.getUTCDay();
  const diff = (5 - day + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(11, 0, 0, 0);
  if (diff === 0 && now.getTime() > d.getTime()) {
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return d;
}

export default async function WeeklyReportPage() {
  const session = await getSession();
  const L = session.language;
  if (session.role === "CLIENT") return <div className="p-8">고객 포탈에서 접근할 수 없습니다.</div>;

  const deadline = nextFridayDeadline();

  const [backlogs, tasks, clients, employees] = await Promise.all([
    prisma.weeklyBacklog.findMany({
      where: { companyCode: session.companyCode },
      orderBy: { registeredAt: "desc" },
      take: 200,
      include: {
        client: { select: { clientCode: true, companyNameVi: true } },
        salesEmployee: { select: { employeeCode: true, nameVi: true } },
        histories: { orderBy: { date: "desc" } },
      },
    }),
    prisma.weeklyTask.findMany({
      where: { companyCode: session.companyCode },
      orderBy: { registeredAt: "desc" },
      take: 200,
      include: {
        writer: { select: { employeeCode: true, nameVi: true } },
        assignee: { select: { employeeCode: true, nameVi: true } },
      },
    }),
    prisma.client.findMany({ orderBy: { clientCode: "asc" }, select: { id: true, clientCode: true, companyNameVi: true } }),
    prisma.employee.findMany({
      where: { companyCode: session.companyCode, status: "ACTIVE" },
      orderBy: { employeeCode: "asc" },
      select: { id: true, employeeCode: true, nameVi: true },
    }),
  ]);

  const allConfirmed =
    backlogs.length + tasks.length > 0 &&
    backlogs.every((b) => !!b.confirmedAt) &&
    tasks.every((t) => !!t.confirmedAt);

  const isManager = ["ADMIN", "MANAGER"].includes(session.role);

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH ERP</Link>
            <h1 className="mt-1 text-2xl font-extrabold">{t("page.weekly.title", L)}</h1>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[color:var(--tts-muted)]">금주 마감</div>
            <div className="font-mono text-[14px] text-[color:var(--tts-accent)]">
              {deadline.toISOString().slice(0, 16).replace("T", " ")} UTC
            </div>
            {allConfirmed && (
              <div className="mt-1 inline-block rounded-md bg-[color:var(--tts-success-dim,rgba(74,222,128,0.15))] px-2 py-1 text-[11px] font-bold text-[color:var(--tts-success,#4ade80)]">
                ✅ 이번주 보고 확정
              </div>
            )}
          </div>
        </div>
        <Card>
          <WeeklyReportShell
            backlogs={backlogs.map((b) => ({
              id: b.id,
              backlogCode: b.backlogCode,
              registeredAt: b.registeredAt.toISOString(),
              salesType: b.salesType,
              client: { code: b.client.clientCode, name: b.client.companyNameVi },
              salesEmployee: b.salesEmployee ? { code: b.salesEmployee.employeeCode, name: b.salesEmployee.nameVi } : null,
              representativeItem: b.representativeItem,
              amount: b.amount?.toString() ?? null,
              currency: b.currency,
              status: b.status,
              expectedCloseDate: b.expectedCloseDate ? b.expectedCloseDate.toISOString() : null,
              confirmedAt: b.confirmedAt ? b.confirmedAt.toISOString() : null,
              histories: b.histories.map((h) => ({
                id: h.id,
                date: h.date.toISOString(),
                ko: h.contentKo, vi: h.contentVi, en: h.contentEn,
              })),
            }))}
            tasks={tasks.map((t) => ({
              id: t.id,
              taskCode: t.taskCode,
              registeredAt: t.registeredAt.toISOString(),
              writer: { code: t.writer.employeeCode, name: t.writer.nameVi },
              assignee: { code: t.assignee.employeeCode, name: t.assignee.nameVi },
              title: t.title,
              instructionKo: t.instructionKo,
              contentKo: t.contentKo,
              expectedEndDate: t.expectedEndDate ? t.expectedEndDate.toISOString() : null,
              actualEndDate: t.actualEndDate ? t.actualEndDate.toISOString() : null,
              status: t.status,
              confirmedAt: t.confirmedAt ? t.confirmedAt.toISOString() : null,
            }))}
            clients={clients.map((c) => ({ id: c.id, label: `${c.clientCode} · ${c.companyNameVi}` }))}
            employees={employees.map((e) => ({ id: e.id, label: `${e.employeeCode} · ${e.nameVi}` }))}
            canConfirm={isManager}
          />
        </Card>
      </div>
    </main>
  );
}
