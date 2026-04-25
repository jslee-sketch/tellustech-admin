import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { ItContractsClient } from "./it-contracts-client";

export const dynamic = "force-dynamic";

export default async function ItContractsPage() {
  const session = await getSession();
  const L = session.language;
  const contracts = await prisma.itContract.findMany({
    orderBy: { contractNumber: "desc" },
    take: 500,
    include: {
      client: { select: { id: true, clientCode: true, companyNameVi: true } },
      _count: { select: { equipment: true } },
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
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.itContract.title", L)}</h1>
        </div>
        <ItContractsClient
          initialData={contracts.map((c) => ({
            id: c.id,
            contractNumber: c.contractNumber,
            clientCode: c.client.clientCode,
            clientName: c.client.companyNameVi,
            status: c.status,
            startDate: c.startDate.toISOString().slice(0, 10),
            endDate: c.endDate.toISOString().slice(0, 10),
            equipmentCount: c._count.equipment,
            installationAddress: c.installationAddress,
          }))}
        />
      </div>
    </main>
  );
}
