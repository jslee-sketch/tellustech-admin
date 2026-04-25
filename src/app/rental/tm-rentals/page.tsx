import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { TmRentalsClient } from "./tm-rentals-client";

export const dynamic = "force-dynamic";

export default async function TmRentalsPage() {
  const session = await getSession();
  const L = session.language;
  const rentals = await prisma.tmRental.findMany({
    orderBy: { rentalCode: "desc" },
    take: 500,
    include: {
      client: { select: { id: true, clientCode: true, companyNameVi: true } },
      items: { select: { salesPrice: true, profit: true } },
      _count: { select: { items: true } },
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
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.tmRental.title", L)}</h1>
        </div>
        <TmRentalsClient
          initialData={rentals.map((r) => ({
            id: r.id,
            rentalCode: r.rentalCode,
            contractNumber: r.contractNumber,
            clientCode: r.client.clientCode,
            clientName: r.client.companyNameVi,
            startDate: r.startDate.toISOString().slice(0, 10),
            endDate: r.endDate.toISOString().slice(0, 10),
            itemCount: r._count.items,
            totalSales: r.items.reduce((sum, it) => sum + Number(it.salesPrice), 0).toFixed(2),
            totalProfit: r.items.reduce((sum, it) => sum + Number(it.profit ?? 0), 0).toFixed(2),
          }))}
        />
      </div>
    </main>
  );
}
