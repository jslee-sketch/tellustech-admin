import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Badge, Card } from "@/components/ui";
import { AsTicketDetail } from "./as-ticket-detail";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

const statusLabel: Record<string, string> = {
  RECEIVED: "접수",
  IN_PROGRESS: "처리중",
  DISPATCHED: "출동중",
  COMPLETED: "완료",
  CANCELED: "취소",
};
const statusTone: Record<string, "neutral" | "primary" | "accent" | "success" | "danger"> = {
  RECEIVED: "neutral",
  IN_PROGRESS: "primary",
  DISPATCHED: "accent",
  COMPLETED: "success",
  CANCELED: "danger",
};

export default async function AsTicketDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const L = session.language;

  const ticket = await prisma.asTicket.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          clientCode: true,
          companyNameVi: true,
          receivableStatus: true,
          phone: true,
          address: true,
        },
      },
      assignedTo: { select: { id: true, employeeCode: true, nameVi: true } },
      photos: { select: { id: true, originalName: true, sizeBytes: true } },
      dispatches: { orderBy: { createdAt: "desc" } },
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
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/as/tickets"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            {t("page.asTickets.back", L)}
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold text-[color:var(--tts-text)]">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{ticket.ticketNumber}</span>
            <Badge tone={statusTone[ticket.status] ?? "neutral"}>{statusLabel[ticket.status] ?? ticket.status}</Badge>
            {ticket.receivableBlocked && <Badge tone="danger">미수금 차단</Badge>}
          </h1>
          <div className="mt-1 text-[13px] text-[color:var(--tts-sub)]">
            {ticket.client.companyNameVi}{" "}
            <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{ticket.client.clientCode}</span>
            {ticket.client.phone && <span className="ml-2 text-[11px]">· {ticket.client.phone}</span>}
          </div>
        </div>
        <Card>
          <AsTicketDetail
            ticketId={ticket.id}
            initial={{
              ticketNumber: ticket.ticketNumber,
              clientLabel: `${ticket.client.clientCode} · ${ticket.client.companyNameVi}`,
              clientAddress: ticket.client.address ?? "",
              status: ticket.status,
              receivedAt: ticket.receivedAt.toISOString().slice(0, 16),
              completedAt: ticket.completedAt ? ticket.completedAt.toISOString().slice(0, 16) : "",
              assignedToId: ticket.assignedToId ?? "",
              itemId: ticket.itemId ?? "",
              serialNumber: ticket.serialNumber ?? "",
              originalLang: ticket.originalLang ?? "VI",
              symptomVi: ticket.symptomVi ?? "",
              symptomEn: ticket.symptomEn ?? "",
              symptomKo: ticket.symptomKo ?? "",
              receivableBlocked: ticket.receivableBlocked,
            }}
            photos={ticket.photos.map((p) => ({ id: p.id, name: p.originalName, sizeBytes: p.sizeBytes ?? 0 }))}
            dispatches={ticket.dispatches.map((d) => ({
              id: d.id,
              transportMethod: d.transportMethod ?? "",
              departedAt: d.departedAt ? d.departedAt.toISOString().slice(0, 10) : "",
              completedAt: d.completedAt ? d.completedAt.toISOString().slice(0, 10) : "",
            }))}
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
