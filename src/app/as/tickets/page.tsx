import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TicketsClient } from "./tickets-client";

export const dynamic = "force-dynamic";

export default async function AsTicketsPage() {
  await getSession();
  const tickets = await prisma.asTicket.findMany({
    orderBy: { receivedAt: "desc" },
    take: 500,
    include: {
      client: { select: { id: true, clientCode: true, companyNameVi: true, receivableStatus: true } },
      assignedTo: { select: { employeeCode: true, nameVi: true } },
      _count: { select: { dispatches: true } },
    },
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
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">AS 관리 · 접수</h1>
        </div>
        <TicketsClient
          initialData={tickets.map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            clientCode: t.client.clientCode,
            clientName: t.client.companyNameVi,
            clientReceivable: t.client.receivableStatus,
            receivableBlocked: t.receivableBlocked,
            assigneeLabel: t.assignedTo ? `${t.assignedTo.employeeCode} · ${t.assignedTo.nameVi}` : null,
            serialNumber: t.serialNumber,
            status: t.status,
            receivedAt: t.receivedAt.toISOString().slice(0, 10),
            dispatchCount: t._count.dispatches,
          }))}
        />
      </div>
    </main>
  );
}
