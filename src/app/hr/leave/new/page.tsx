import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { LeaveNewForm } from "./leave-new-form";

export const dynamic = "force-dynamic";

export default async function NewLeavePage() {
  const session = await getSession();
  const employees = await prisma.employee.findMany({
    where: { companyCode: session.companyCode, status: "ACTIVE" },
    orderBy: { employeeCode: "asc" },
    select: { id: true, employeeCode: true, nameVi: true },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/hr/leave" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">← 연차 목록</Link>
        <h1 className="mt-1 mb-3 text-2xl font-extrabold">연차/휴가 신청</h1>
        <Card>
          <LeaveNewForm employees={employees.map((e) => ({ value: e.id, label: `${e.employeeCode} · ${e.nameVi}` }))} />
        </Card>
      </div>
    </main>
  );
}
