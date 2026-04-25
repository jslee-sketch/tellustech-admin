import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Badge, Card, DataTable, ExcelDownload } from "@/components/ui";

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
                { key: "licenseCode", header: "라이선스코드" },
                { key: "name", header: "라이선스명" },
                { key: "owner", header: "담당자" },
                { key: "acquiredAt", header: "취득일" },
                { key: "expiresAt", header: "만료일" },
                { key: "renewalCost", header: "갱신비용(VND)" },
              ]}
              filename={`licenses-${new Date().toISOString().slice(0, 10)}.xlsx`}
            />
            <Link href="/master/licenses/new" className="rounded-md bg-[color:var(--tts-primary)] px-3 py-2 text-[12px] font-bold text-white hover:opacity-90">{t("page.licenses.new", L)}</Link>
          </div>
        </div>
        <Card title="라이선스" count={rows.length}>
          <DataTable
            columns={[
              { key: "licenseCode", label: "코드", width: "160px", render: (v, row) => <Link href={`/master/licenses/${row.id}`} className="font-mono text-[11px] text-[color:var(--tts-primary)] hover:underline">{v as string}</Link> },
              { key: "name", label: "라이선스명" },
              { key: "owner", label: "담당자", render: (_, r) => r.owner ? <span>{r.owner.employeeCode} · {r.owner.nameVi}</span> : <span className="text-[color:var(--tts-muted)]">—</span> },
              { key: "acquiredAt", label: "취득일", width: "110px", render: (v) => (v as Date).toISOString().slice(0, 10) },
              { key: "expiresAt", label: "만료일", width: "140px", render: (v) => {
                const d = v as Date;
                const left = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <span>
                    <span className="font-mono text-[11px]">{d.toISOString().slice(0, 10)}</span>{" "}
                    {left < 0 ? <Badge tone="danger">만료</Badge> : left < 30 ? <Badge tone="warn">D-{left}</Badge> : null}
                  </span>
                );
              } },
              { key: "renewalCost", label: "갱신비용", width: "140px", align: "right", render: (v) => v ? <span className="font-mono text-[12px]">{new Intl.NumberFormat("vi-VN").format(Number(v))}</span> : <span className="text-[color:var(--tts-muted)]">—</span> },
            ]}
            data={rows}
            rowKey={(r) => r.id}
            emptyMessage="등록된 라이선스 없음"
          />
        </Card>
      </div>
    </main>
  );
}
