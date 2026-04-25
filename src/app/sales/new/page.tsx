import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companyScope } from "@/lib/api-utils";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { SalesNewForm } from "./sales-new-form";

export const dynamic = "force-dynamic";

export default async function NewSalesPage() {
  const session = await getSession();
  const L = session.language;

  const [clients, projects, warehouses, employees] = await Promise.all([
    prisma.client.findMany({
      orderBy: { clientCode: "desc" },
      take: 200,
      select: { id: true, clientCode: true, companyNameVi: true, paymentTerms: true },
    }),
    prisma.project.findMany({
      where: companyScope(session),
      orderBy: { projectCode: "asc" },
      select: { id: true, projectCode: true, name: true, salesType: true },
    }),
    prisma.warehouse.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.employee.findMany({
      where: { companyCode: session.companyCode, status: "ACTIVE" },
      orderBy: { employeeCode: "asc" },
      select: { id: true, employeeCode: true, nameVi: true },
    }),
  ]);

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/sales"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            {t("page.sales.back", L)}
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.sales.new", L)}</h1>
        </div>
        <Card>
          <SalesNewForm
            lang={L}
            clients={clients.map((c) => ({
              id: c.id,
              label: `${c.clientCode} · ${c.companyNameVi}`,
              paymentTerms: c.paymentTerms ?? 30,
            }))}
            projects={projects.map((p) => ({
              id: p.id,
              code: p.projectCode,
              name: p.name,
              salesType: p.salesType,
            }))}
            employeeOptions={employees.map((e) => ({
              value: e.id,
              label: `${e.employeeCode} · ${e.nameVi}`,
            }))}
            warehouseOptions={warehouses.map((w) => ({ value: w.id, label: `${w.code} · ${w.name}` }))}
          />
        </Card>
      </div>
    </main>
  );
}
