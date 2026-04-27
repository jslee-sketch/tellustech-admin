import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card, ExcelDownload } from "@/components/ui";
import { LicensesListClient } from "./licenses-list-client";

export const dynamic = "force-dynamic";

export default async function LicensesPage() {
  const session = await getSession();
  const L = session.language;
  const rows = await prisma.license.findMany({
    where: { companyCode: session.companyCode },
    orderBy: { expiresAt: "asc" },
    take: 300,
    include: { owner: { select: { employeeCode: true, nameVi: true } } },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH ERP</Link>
            <h1 className="mt-1 text-2xl font-extrabold">{t("page.licenses.title", L)}</h1>
          </div>
          <div className="flex gap-2">
            <ExcelDownload
              rows={rows.map((r) => ({
                licenseCode: r.licenseCode,
                name: r.name,
                owner: r.owner ? `${r.owner.employeeCode} · ${r.owner.nameVi}` : "",
                acquiredAt: r.acquiredAt.toISOString().slice(0, 10),
                expiresAt: r.expiresAt.toISOString().slice(0, 10),
                renewalCost: r.renewalCost ? Number(r.renewalCost) : 0,
              }))}
              columns={[
                { key: "licenseCode", header: t("header.licenseCode", L) },
                { key: "name", header: t("header.licenseName", L) },
                { key: "owner", header: t("header.licenseOwner", L) },
                { key: "acquiredAt", header: t("header.acquiredAt", L) },
                { key: "expiresAt", header: t("header.expiresAt", L) },
                { key: "renewalCost", header: t("header.renewalCostVnd", L) },
              ]}
              filename={`licenses-${new Date().toISOString().slice(0, 10)}.xlsx`}
            />
            <Link href="/master/licenses/new" className="rounded-md bg-[color:var(--tts-primary)] px-3 py-2 text-[12px] font-bold text-white hover:opacity-90">{t("page.licenses.new", L)}</Link>
          </div>
        </div>
        <Card title={t("title.licenses", L)} count={rows.length}>
          <LicensesListClient rows={rows.map(r => ({
            id: r.id, licenseCode: r.licenseCode, name: r.name,
            owner: r.owner,
            acquiredAt: r.acquiredAt.toISOString(),
            expiresAt: r.expiresAt.toISOString(),
            renewalCost: r.renewalCost ? r.renewalCost.toString() : null,
          }))} lang={L} />
        </Card>
      </div>
    </main>
  );
}
