import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Button, Card, ExcelDownload } from "@/components/ui";
import { OffboardingListClient } from "./offboarding-list-client";

export const dynamic = "force-dynamic";

export default async function OffboardingPage() {
  const session = await getSession();
  const L = session.language;
  const rows = await prisma.offboardingCard.findMany({
    where: { companyCode: session.companyCode },
    orderBy: { createdAt: "desc" }, take: 200,
    include: { employee: { select: { employeeCode: true, nameVi: true } } },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH ERP</Link>
            <h1 className="mt-1 text-2xl font-extrabold">{t("page.offboarding.title", L)}</h1>
          </div>
          <div className="flex gap-2">
            <ExcelDownload
              rows={rows.map((r) => ({ code: r.offboardingCode, emp: r.employee ? `${r.employee.employeeCode} · ${r.employee.nameVi}` : "", status: r.status, date: r.createdAt.toISOString().slice(0, 10) }))}
              columns={[
                { key: "code", header: t("header.codeH", L) },
                { key: "emp", header: t("header.employee", L) },
                { key: "status", header: t("header.statusH", L) },
                { key: "date", header: t("header.createdAt", L) },
              ]}
              filename="offboarding.xlsx"
            />
            <Link href="/hr/offboarding/new"><Button>{t("page.offboarding.new", L)}</Button></Link>
          </div>
        </div>
        <Card title={t("title.offboardingCard", L)} count={rows.length}>
          <OffboardingListClient rows={rows.map(r => ({
            id: r.id, offboardingCode: r.offboardingCode,
            employee: r.employee, status: r.status,
            createdAt: r.createdAt.toISOString(),
          }))} lang={L} />
        </Card>
      </div>
    </main>
  );
}
