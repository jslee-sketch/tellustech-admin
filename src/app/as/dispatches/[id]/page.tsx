import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Badge, Card } from "@/components/ui";
import { DispatchDetail } from "./dispatch-detail";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function DispatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();

  const dispatch = await prisma.asDispatch.findUnique({
    where: { id },
    include: {
      asTicket: {
        select: {
          id: true,
          ticketNumber: true,
          status: true,
          client: { select: { clientCode: true, companyNameVi: true, address: true } },
        },
      },
      dispatchEmployee: { select: { id: true, employeeCode: true, nameVi: true } },
      receipt: { select: { id: true, originalName: true } },
    },
  });
  if (!dispatch) notFound();

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
            href="/as/dispatches"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            ← 출동 목록
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold text-[color:var(--tts-text)]">
            출동 상세
            <Link
              href={`/as/tickets/${dispatch.asTicket.id}`}
              className="font-mono text-[15px] text-[color:var(--tts-primary)] hover:underline"
            >
              {dispatch.asTicket.ticketNumber}
            </Link>
            {dispatch.distanceMatch === true && <Badge tone="success">거리 일치</Badge>}
            {dispatch.distanceMatch === false && <Badge tone="danger">거리 불일치</Badge>}
          </h1>
          <div className="mt-1 text-[13px] text-[color:var(--tts-sub)]">
            {dispatch.asTicket.client.companyNameVi}{" "}
            <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">
              {dispatch.asTicket.client.clientCode}
            </span>
          </div>
        </div>
        <Card>
          <DispatchDetail
            dispatchId={dispatch.id}
            initial={{
              ticketId: dispatch.asTicket.id,
              ticketNumber: dispatch.asTicket.ticketNumber,
              dispatchEmployeeId: dispatch.dispatchEmployeeId ?? "",
              transportMethod: dispatch.transportMethod ?? "",
              originAddress: dispatch.originAddress ?? "",
              destinationAddress: dispatch.destinationAddress ?? "",
              googleDistanceKm: dispatch.googleDistanceKm?.toString() ?? "",
              meterOcrKm: dispatch.meterOcrKm?.toString() ?? "",
              meterPhotoUrl: dispatch.meterPhotoUrl ?? "",
              distanceMatch: dispatch.distanceMatch,
              transportCost: dispatch.transportCost?.toString() ?? "",
              receiptFileId: dispatch.receiptFileId ?? "",
              receiptName: dispatch.receipt?.originalName ?? "",
              departedAt: dispatch.departedAt ? dispatch.departedAt.toISOString().slice(0, 16) : "",
              arrivedAt: dispatch.arrivedAt ? dispatch.arrivedAt.toISOString().slice(0, 16) : "",
              completedAt: dispatch.completedAt ? dispatch.completedAt.toISOString().slice(0, 16) : "",
              note: dispatch.note ?? "",
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
