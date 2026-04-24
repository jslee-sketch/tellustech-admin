import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { OffboardingNewForm } from "./offboarding-new-form";

export const dynamic = "force-dynamic";

export default async function NewOffboardingPage() {
  const session = await getSession();
  const existing = await prisma.offboardingCard.findMany({
    where: { companyCode: session.companyCode },
    select: { employeeId: true },
  });
  const excludeIds = new Set(existing.map((x) => x.employeeId));
  const employees = await prisma.employee.findMany({
    where: { companyCode: session.companyCode },
    orderBy: { employeeCode: "asc" },
    select: { id: true, employeeCode: true, nameVi: true },
  });
  const options = employees.filter((e) => !excludeIds.has(e.id)).map((e) => ({ value: e.id, label: `${e.employeeCode} · ${e.nameVi}` }));
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/hr/offboarding" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">← 퇴사카드 목록</Link>
        <h1 className="mt-1 mb-3 text-2xl font-extrabold">퇴사카드 등록</h1>
        <Card>
          <OffboardingNewForm employees={options} />
        </Card>
      </div>
    </main>
  );
}
