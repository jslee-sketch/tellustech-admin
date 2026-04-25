import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { DispatchNewForm } from "./dispatch-new-form";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ ticket?: string }> };

export default async function NewDispatchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const ticketId = sp.ticket;
  if (!ticketId) notFound(); // 출동은 항상 특정 AS 에서 진입

  const session = await getSession();
  const L = session.language;

  const ticket = await prisma.asTicket.findUnique({
    where: { id: ticketId },
    include: {
      client: { select: { clientCode: true, companyNameVi: true, address: true } },
      assignedTo: { select: { id: true, employeeCode: true, nameVi: true } },
    },
  });
  if (!ticket) notFound();

  const employees = await prisma.employee.findMany({
    where: { companyCode: session.companyCode, status: "ACTIVE" },
    orderBy: { employeeCode: "asc" },
    select: { id: true, employeeCode: true, nameVi: true, position: true },
  });

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href={`/as/tickets/${ticket.id}`}
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            {t("page.dispatches.backTickets", L)}
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
            {t("page.dispatches.new", L)}
            <span className="ml-3 font-mono text-[14px] text-[color:var(--tts-primary)]">{ticket.ticketNumber}</span>
          </h1>
        </div>
        <Card>
          <DispatchNewForm
            lang={L}
            ticket={{
              id: ticket.id,
              ticketNumber: ticket.ticketNumber,
              clientLabel: `${ticket.client.clientCode} · ${ticket.client.companyNameVi}`,
              destinationAddress: ticket.client.address ?? "",
              defaultDispatchEmployeeId: ticket.assignedTo?.id ?? "",
            }}
            employeeOptions={employees.map((e) => ({
              value: e.id,
              label: `${e.employeeCode} · ${e.nameVi}${e.position ? ` (${e.position})` : ""}`,
            }))}
          />
        </Card>
      </div>
    </main>
  );
}
