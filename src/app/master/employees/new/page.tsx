import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { EmployeeForm } from "../employee-form";
import type { CompanyCode } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const session = await getSession();
  const L = session.language;

  // 허용 회사의 부서를 모두 로드 — 폼에서 회사 선택에 따라 필터링
  const departments = await prisma.department.findMany({
    where: { companyCode: { in: session.allowedCompanies as CompanyCode[] } },
    orderBy: [{ companyCode: "asc" }, { code: "asc" }],
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
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.employees.new", L)}</h1>
        </div>
        <Card>
          <EmployeeForm
            mode="create"
            allowedCompanies={session.allowedCompanies}
            departments={departments}
            initial={{
              companyCode: session.companyCode,
              departmentId: "",
              nameVi: "",
              nameEn: "",
              nameKo: "",
              position: "",
              email: "",
              phone: "",
              hireDate: "",
              status: "ACTIVE",
              idCardNumber: "",
              idCardPhotoUrl: "",
              salary: "",
              insuranceNumber: "",
              contractType: "",
              contractStart: "",
              contractEnd: "",
              photoUrl: "",
            }}
          />
        </Card>
      </div>
    </main>
  );
}
