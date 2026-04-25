import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { DepartmentForm } from "../department-form";

export const dynamic = "force-dynamic";

export default async function NewDepartmentPage() {
  const session = await getSession();
  const L = session.language;
  // 현재 세션 회사(또는 관리자라면 첫 허용 회사)의 직원 목록
  const defaultCompany = session.companyCode;
  const employees = await prisma.employee.findMany({
    where: { companyCode: defaultCompany },
    orderBy: { employeeCode: "asc" },
    select: { id: true, employeeCode: true, nameVi: true },
  });

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/master/departments"
              className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
            >
              {t("page.departments.back", L)}
            </Link>
            <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.departments.new", L)}</h1>
          </div>
        </div>
        <Card>
          <DepartmentForm
            mode="create"
            lang={L}
            initial={{
              code: "",
              name: "",
              branchType: "",
              managerId: null,
              companyCode: defaultCompany,
            }}
            managerOptions={employees.map((e) => ({
              value: e.id,
              label: `${e.employeeCode} · ${e.nameVi}`,
            }))}
            sessionCompany={session.companyCode}
            allowedCompanies={session.allowedCompanies}
          />
        </Card>
      </div>
    </main>
  );
}
