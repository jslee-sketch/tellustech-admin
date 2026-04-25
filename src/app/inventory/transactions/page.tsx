import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companyScope } from "@/lib/api-utils";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { TransactionsClient } from "./transactions-client";
import { InventoryImport } from "./inventory-import";

export const dynamic = "force-dynamic";

export default async function InventoryTransactionsPage() {
  const session = await getSession();
  const L = session.language;
  const [items, warehouses, clients] = await Promise.all([
    prisma.item.findMany({ orderBy: { itemCode: "desc" }, take: 2000, select: { id: true, itemCode: true, name: true } }),
    prisma.warehouse.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, warehouseType: true } }),
    prisma.client.findMany({ orderBy: { clientCode: "asc" }, take: 1000, select: { id: true, clientCode: true, companyNameVi: true } }),
  ]);
  const txns = await prisma.inventoryTransaction.findMany({
    where: companyScope(session),
    orderBy: { performedAt: "desc" },
    take: 500,
    include: {
      item: { select: { itemCode: true, name: true } },
      fromWarehouse: { select: { code: true, name: true, warehouseType: true } },
      toWarehouse: { select: { code: true, name: true, warehouseType: true } },
      client: { select: { clientCode: true, companyNameVi: true } },
    },
  });

  // 소속 표시: Internal/Main 창고 → 회사명, External 창고 → 고객명
  const companyName = session.companyCode === "TV" ? "Tellustech Vina" : "Vietrental";
  const ownerLabel = (wh: { warehouseType: string } | null, client: { companyNameVi: string } | null) => {
    if (!wh) return client?.companyNameVi ?? "-";
    return wh.warehouseType === "EXTERNAL" ? (client?.companyNameVi ?? "-") : companyName;
  };

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">
              TELLUSTECH ERP
            </Link>
            <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
              {t("page.invTxn.title", L)}
              <span className="ml-3 rounded bg-[color:var(--tts-primary-dim)] px-2 py-0.5 text-[12px] text-[color:var(--tts-primary)]">
                {session.companyCode}
              </span>
            </h1>
          </div>
          <div className="flex gap-2">
            <Link href="/inventory/stock" className="text-[13px] text-[color:var(--tts-primary)] hover:underline">
              재고 현황 →
            </Link>
            <Link href="/inventory/scan" className="text-[13px] text-[color:var(--tts-accent)] hover:underline">
              QR 스캔 →
            </Link>
          </div>
        </div>
        <TransactionsClient
          initialData={txns.map((t) => ({
            id: t.id,
            itemCode: t.item.itemCode,
            itemName: t.item.name,
            fromWarehouseCode: t.fromWarehouse?.code ?? null,
            fromWarehouseName: t.fromWarehouse?.name ?? null,
            toWarehouseCode: t.toWarehouse?.code ?? null,
            toWarehouseName: t.toWarehouse?.name ?? null,
            owner: ownerLabel(t.toWarehouse ?? t.fromWarehouse, t.client),
            serialNumber: t.serialNumber,
            txnType: t.txnType,
            reason: t.reason,
            quantity: t.quantity,
            targetEquipmentSN: t.targetEquipmentSN,
            performedAt: t.performedAt.toISOString().slice(0, 16).replace("T", " "),
            note: t.note,
          }))}
        />
        <div className="mt-4">
          <Card title={t("page.invTxn.import", L)}>
            <InventoryImport items={items} warehouses={warehouses} clients={clients} />
          </Card>
        </div>
      </div>
    </main>
  );
}
