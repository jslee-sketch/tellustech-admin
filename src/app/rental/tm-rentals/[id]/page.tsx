import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Badge, Card } from "@/components/ui";
import { TmRentalDetail } from "./tm-rental-detail";
import { TmItemsImport } from "./items-import";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

function d2i(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}
function dec(d: { toString(): string } | null): string {
  return d ? d.toString() : "";
}

export default async function TmRentalDetailPage({ params }: PageProps) {
  const { id } = await params;
  await getSession();
  const rental = await prisma.tmRental.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          clientCode: true,
          companyNameVi: true,
          paymentTerms: true,
          receivableStatus: true,
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
        include: { item: { select: { itemCode: true, name: true } } },
      },
    },
  });
  if (!rental) notFound();

  const totalSales = rental.items.reduce((s, it) => s + Number(it.salesPrice), 0).toFixed(2);
  const totalProfit = rental.items.reduce((s, it) => s + Number(it.profit ?? 0), 0).toFixed(2);

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/rental/tm-rentals"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            ← TM 렌탈 목록
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold text-[color:var(--tts-text)]">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{rental.rentalCode}</span>
            {rental.client.receivableStatus === "BLOCKED" && <Badge tone="danger">미수금 차단</Badge>}
          </h1>
          <div className="mt-1 text-[13px] text-[color:var(--tts-sub)]">
            {rental.client.companyNameVi}{" "}
            <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{rental.client.clientCode}</span>
          </div>
        </div>
        <Card>
          <TmRentalDetail
            rentalId={rental.id}
            paymentTerms={rental.client.paymentTerms ?? 30}
            totalSales={totalSales}
            totalProfit={totalProfit}
            initial={{
              rentalCode: rental.rentalCode,
              clientLabel: `${rental.client.clientCode} · ${rental.client.companyNameVi}`,
              contractNumber: rental.contractNumber ?? "",
              address: rental.address ?? "",
              startDate: d2i(rental.startDate),
              endDate: d2i(rental.endDate),
              contractMgrName: rental.contractMgrName ?? "",
              contractMgrPhone: rental.contractMgrPhone ?? "",
              contractMgrEmail: rental.contractMgrEmail ?? "",
              technicalMgrName: rental.technicalMgrName ?? "",
              technicalMgrPhone: rental.technicalMgrPhone ?? "",
              technicalMgrEmail: rental.technicalMgrEmail ?? "",
              financeMgrName: rental.financeMgrName ?? "",
              financeMgrPhone: rental.financeMgrPhone ?? "",
              financeMgrEmail: rental.financeMgrEmail ?? "",
            }}
            items={rental.items.map((it) => ({
              id: it.id,
              itemId: it.itemId,
              itemCode: it.item.itemCode,
              itemName: it.item.name,
              options: it.options ?? "",
              serialNumber: it.serialNumber,
              startDate: d2i(it.startDate),
              endDate: d2i(it.endDate),
              salesPrice: dec(it.salesPrice),
              supplierName: it.supplierName ?? "",
              purchasePrice: dec(it.purchasePrice),
              commission: dec(it.commission),
              profit: dec(it.profit),
            }))}
          />
        </Card>
        <div className="mt-4">
          <Card title="📥 품목 엑셀 일괄 업로드">
            <TmItemsImport rentalId={rental.id} />
          </Card>
        </div>
      </div>
    </main>
  );
}
