import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { IncidentNewForm } from "./incident-new-form";

export const dynamic = "force-dynamic";

export default async function NewIncidentPage() {
  const session = await getSession();
  const employees = await prisma.employee.findMany({
    where: { companyCode: session.companyCode, status: "ACTIVE" },
    orderBy: { employeeCode: "asc" },
    select: { id: true, employeeCode: true, nameVi: true },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/hr/incidents" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">← 사건평가 목록</Link>
        <h1 className="mt-1 mb-3 text-2xl font-extrabold">사건기반 수시평가 등록</h1>
        <Card>
          <IncidentNewForm
            defaultLang={session.language}
            subjectOptions={employees.map((e) => ({ value: e.id, label: `${e.employeeCode} · ${e.nameVi}` }))}
          />
        </Card>
      </div>
    </main>
  );
}
