import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companyScope } from "@/lib/api-utils";
import { Card } from "@/components/ui";
import { ExpenseNewForm } from "./expense-new-form";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const session = await getSession();
  const [projects, depts, sales, purchases] = await Promise.all([
    prisma.project.findMany({ where: companyScope(session), orderBy: { projectCode: "asc" }, select: { id: true, projectCode: true, name: true } }),
    prisma.department.findMany({ where: companyScope(session), orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.sales.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, salesNumber: true, totalAmount: true, client: { select: { companyNameVi: true } } },
    }),
    prisma.purchase.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, purchaseNumber: true, totalAmount: true, supplier: { select: { companyNameVi: true } } },
    }),
  ]);
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/finance/expenses" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">← 비용 목록</Link>
        <h1 className="mt-1 mb-3 text-2xl font-extrabold">비용 등록</h1>
        <Card>
          <ExpenseNewForm
            projects={projects.map((p) => ({ value: p.id, label: `${p.projectCode} · ${p.name}` }))}
            departments={depts.map((d) => ({ value: d.id, label: `${d.code} · ${d.name}` }))}
            salesOptions={sales.map((s) => ({
              value: s.id,
              label: `${s.salesNumber} · ${s.client?.companyNameVi ?? "—"} · ${new Intl.NumberFormat("vi-VN").format(Number(s.totalAmount))}`,
            }))}
            purchaseOptions={purchases.map((p) => ({
              value: p.id,
              label: `${p.purchaseNumber} · ${p.supplier?.companyNameVi ?? "—"} · ${new Intl.NumberFormat("vi-VN").format(Number(p.totalAmount))}`,
            }))}
          />
        </Card>
      </div>
    </main>
  );
}
