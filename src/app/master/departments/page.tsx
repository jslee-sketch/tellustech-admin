import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companyScope } from "@/lib/api-utils";
import { t, type Lang } from "@/lib/i18n";
import { DepartmentsClient } from "./departments-client";

// 부서 리스트 — Server Component 로 세션 회사 스코프 데이터 SSR,
// 검색/필터는 Client Component(DepartmentsClient) 가 담당.

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const session = await getSession();
  const departments = await prisma.department.findMany({
    where: companyScope(session),
    orderBy: [{ branchType: "asc" }, { code: "asc" }],
    include: { manager: { select: { id: true, employeeCode: true, nameVi: true } } },
  });

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <Breadcrumb companyCode={session.companyCode} L={session.language} />
        <DepartmentsClient
          lang={session.language}
          initialData={departments.map((d) => ({
            id: d.id,
            code: d.code,
            name: d.name,
            branchType: d.branchType,
            managerId: d.managerId,
            managerLabel: d.manager
              ? `${d.manager.employeeCode} · ${d.manager.nameVi}`
              : null,
            companyCode: d.companyCode,
          }))}
        />
      </div>
    </main>
  );
}

function Breadcrumb({ companyCode, L }: { companyCode: string; L: Lang }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <Link
          href="/"
          className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
        >
          TELLUSTECH ERP
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
          {t("page.departments.title", L)}
          <span className="ml-3 rounded bg-[color:var(--tts-primary-dim)] px-2 py-0.5 text-[12px] text-[color:var(--tts-primary)]">
            {companyCode}
          </span>
        </h1>
      </div>
    </div>
  );
}
