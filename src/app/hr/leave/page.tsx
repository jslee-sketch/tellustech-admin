import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card, ExcelDownload } from "@/components/ui";
import { LeaveListClient } from "./leave-list-client";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const session = await getSession();
  const L = session.language;
  const rows = await prisma.leaveRecord.findMany({
    where: { companyCode: session.companyCode },
    orderBy: { createdAt: "desc" }, take: 500,
    include: { employee: { select: { employeeCode: true, nameVi: true } } },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH ERP</Link>
            <h1 className="mt-1 text-2xl font-extrabold">{t("page.leave.title", L)}</h1>
          </div>
          <div className="flex gap-2">
            <ExcelDownload
              rows={rows.map((r) => ({
                code: r.leaveCode,
                emp: r.employee ? `${r.employee.employeeCode} · ${r.employee.nameVi}` : "",
                type: r.leaveType,
                start: r.startDate.toISOString().slice(0, 10),
                end: r.endDate.toISOString().slice(0, 10),
                days: Number(r.days).toFixed(1),
                status: r.status,
              }))}
              columns={[
                { key: "code", header: t("header.leaveCode", L) },
                { key: "emp", header: t("header.employee", L) },
                { key: "type", header: t("header.leaveType", L) },
                { key: "start", header: t("header.startLv", L) },
                { key: "end", header: t("header.endLv", L) },
                { key: "days", header: t("header.daysLv", L) },
                { key: "status", header: t("header.statusLv", L) },
              ]}
              filename="leaves.xlsx"
            />
            <Link href="/hr/leave/new" className="rounded-md bg-[color:var(--tts-primary)] px-3 py-2 text-[12px] font-bold text-white hover:opacity-90">{t("page.leave.new", L)}</Link>
          </div>
        </div>
        <Card title={t("title.leaveList", L)} count={rows.length}>
          <LeaveListClient
            rows={rows.map(r => ({
              id: r.id, leaveCode: r.leaveCode,
              employee: r.employee,
              leaveType: r.leaveType,
              startDate: r.startDate.toISOString(),
              endDate: r.endDate.toISOString(),
              days: r.days.toString(),
              status: r.status,
            }))}
            lang={L}
          />
        </Card>
      </div>
    </main>
  );
}
