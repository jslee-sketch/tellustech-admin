import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Badge, Button, Card, DataTable, ExcelDownload } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();
  const rows = await prisma.onboardingCard.findMany({
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
            <h1 className="mt-1 text-2xl font-extrabold">HR · 입사카드</h1>
          </div>
          <div className="flex gap-2">
            <ExcelDownload
              rows={rows.map((r) => ({ code: r.onboardingCode, emp: r.employee ? `${r.employee.employeeCode} · ${r.employee.nameVi}` : "", status: r.status, date: r.createdAt.toISOString().slice(0, 10) }))}
              columns={[
                { key: "code", header: "코드" },
                { key: "emp", header: "직원" },
                { key: "status", header: "상태" },
                { key: "date", header: "등록일" },
              ]}
              filename="onboarding.xlsx"
            />
            <Link href="/hr/onboarding/new"><Button>+ 입사카드 등록</Button></Link>
          </div>
        </div>
        <Card title="입사카드" count={rows.length}>
          <DataTable
            columns={[
              { key: "onboardingCode", label: "코드", width: "170px", render: (v, row) => <Link href={`/hr/onboarding/${row.id}`} className="font-mono text-[11px] font-bold hover:underline">{v as string}</Link> },
              { key: "employee", label: "직원", render: (_, r) => r.employee ? <span>{r.employee.employeeCode} · {r.employee.nameVi}</span> : "—" },
              { key: "status", label: "상태", width: "110px", render: (v) => <Badge tone={v === "COMPLETED" ? "success" : v === "SUBMITTED" ? "warn" : "neutral"}>{v as string}</Badge> },
              { key: "createdAt", label: "등록일", width: "110px", render: (v) => <span className="font-mono text-[11px]">{(v as Date).toISOString().slice(0, 10)}</span> },
            ]}
            data={rows}
            rowKey={(r) => r.id}
            emptyMessage="등록된 입사카드 없음"
          />
        </Card>
      </div>
    </main>
  );
}
