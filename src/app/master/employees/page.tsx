import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companyScope } from "@/lib/api-utils";
import { t } from "@/lib/i18n";
import { EmployeesClient } from "./employees-client";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const session = await getSession();
  const L = session.language;
  const employees = await prisma.employee.findMany({
    where: companyScope(session),
    orderBy: [{ status: "asc" }, { employeeCode: "asc" }],
    include: { department: { select: { code: true } } },
  });

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            TELLUSTECH ERP
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
            {t("page.employees.title", L)}
            <span className="ml-3 rounded bg-[color:var(--tts-primary-dim)] px-2 py-0.5 text-[12px] text-[color:var(--tts-primary)]">
              {session.companyCode}
            </span>
          </h1>
        </div>
        <EmployeesClient
          lang={L}
          initialData={employees.map((e) => ({
            id: e.id,
            employeeCode: e.employeeCode,
            nameVi: e.nameVi,
            nameEn: e.nameEn,
            nameKo: e.nameKo,
            position: e.position,
            email: e.email,
            phone: e.phone,
            departmentCode: e.department?.code ?? null,
            status: e.status,
            hireDate: e.hireDate ? e.hireDate.toISOString().slice(0, 10) : null,
          }))}
        />
      </div>
    </main>
  );
}
