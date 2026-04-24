import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { DepartmentForm } from "../department-form";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditDepartmentPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) notFound();
  if (!session.allowedCompanies.includes(dept.companyCode)) notFound();

  const employees = await prisma.employee.findMany({
    where: { companyCode: dept.companyCode },
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
              ← 부서 목록
            </Link>
            <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
              부서 수정
              <span className="ml-3 font-mono text-[14px] text-[color:var(--tts-primary)]">{dept.code}</span>
            </h1>
          </div>
        </div>
        <Card>
          <DepartmentForm
            mode="edit"
            initial={{
              id: dept.id,
              code: dept.code,
              name: dept.name,
              branchType: dept.branchType,
              managerId: dept.managerId,
              companyCode: dept.companyCode,
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
