import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { DispatchesClient } from "./dispatches-client";

export const dynamic = "force-dynamic";

export default async function DispatchesPage() {
  const session = await getSession();
  const L = session.language;
  const dispatches = await prisma.asDispatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      asTicket: {
        select: { id: true, ticketNumber: true, status: true, client: { select: { clientCode: true, companyNameVi: true } } },
      },
      dispatchEmployee: { select: { employeeCode: true, nameVi: true } },
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
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.dispatches.title", L)}</h1>
        </div>
        <DispatchesClient
          lang={L}
          initialData={dispatches.map((d) => ({
            id: d.id,
            ticketId: d.asTicket.id,
            ticketNumber: d.asTicket.ticketNumber,
            clientCode: d.asTicket.client.clientCode,
            clientName: d.asTicket.client.companyNameVi,
            dispatchEmployeeLabel: d.dispatchEmployee
              ? `${d.dispatchEmployee.employeeCode} · ${d.dispatchEmployee.nameVi}`
              : null,
            transportMethod: d.transportMethod,
            departedAt: d.departedAt ? d.departedAt.toISOString().slice(0, 10) : null,
            completedAt: d.completedAt ? d.completedAt.toISOString().slice(0, 10) : null,
            googleDistanceKm: d.googleDistanceKm?.toString() ?? null,
            meterOcrKm: d.meterOcrKm?.toString() ?? null,
            distanceMatch: d.distanceMatch,
            transportCost: d.transportCost?.toString() ?? null,
          }))}
        />
      </div>
    </main>
  );
}
