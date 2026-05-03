import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { EmployeeForm } from "../employee-form";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

function dateToInput(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function EditEmployeePage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const L = session.language;

  const emp = await prisma.employee.findUnique({
    where: { id },
    include: { department: { select: { id: true, code: true, name: true, companyCode: true } } },
  });
  if (!emp) notFound();
  if (!session.allowedCompanies.includes(emp.companyCode)) notFound();

  // 수정 시에는 해당 직원 회사의 부서만 보여 주면 충분 (회사 변경 불가)
  const departments = await prisma.department.findMany({
    where: { companyCode: emp.companyCode },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, companyCode: true },
  });

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href="/master/employees"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            {t("page.employees.back", L)}
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
            {t("page.employees.detail", L)}
            <span className="ml-3 font-mono text-[13px] text-[color:var(--tts-primary)]">
              {emp.employeeCode}
            </span>
          </h1>
        </div>
        <Card>
          <EmployeeForm
            lang={L}
            mode="edit"
            allowedCompanies={[emp.companyCode]}
            departments={departments}
            initial={{
              id: emp.id,
              employeeCode: emp.employeeCode,
              companyCode: emp.companyCode,
              departmentId: emp.departmentId ?? "",
              nameVi: emp.nameVi,
              nameEn: emp.nameEn ?? "",
              nameKo: emp.nameKo ?? "",
              position: emp.position ?? "",
              email: emp.email ?? "",
              personalEmail: emp.personalEmail ?? "",
              zaloId: emp.zaloId ?? "",
              phone: emp.phone ?? "",
              hireDate: dateToInput(emp.hireDate),
              status: emp.status,
              idCardNumber: emp.idCardNumber ?? "",
              idCardPhotoUrl: emp.idCardPhotoUrl ?? "",
              salary: emp.salary?.toString() ?? "",
              insuranceNumber: emp.insuranceNumber ?? "",
              contractType: emp.contractType ?? "",
              contractStart: dateToInput(emp.contractStart),
              contractEnd: dateToInput(emp.contractEnd),
              photoUrl: emp.photoUrl ?? "",
            }}
          />
        </Card>
      </div>
    </main>
  );
}
