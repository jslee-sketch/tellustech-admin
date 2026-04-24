import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companyScope } from "@/lib/api-utils";
import { TransactionsClient } from "./transactions-client";

export const dynamic = "force-dynamic";

export default async function InventoryTransactionsPage() {
  const session = await getSession();
  const txns = await prisma.inventoryTransaction.findMany({
    where: companyScope(session),
    orderBy: { performedAt: "desc" },
    take: 500,
    include: {
      item: { select: { itemCode: true, name: true } },
      warehouse: { select: { code: true, name: true } },
    },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">
              TELLUSTECH ERP
            </Link>
            <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
              재고 · 입출고
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
              바코드 스캔 →
            </Link>
          </div>
        </div>
        <TransactionsClient
          initialData={txns.map((t) => ({
            id: t.id,
            itemCode: t.item.itemCode,
            itemName: t.item.name,
            warehouseCode: t.warehouse.code,
            warehouseName: t.warehouse.name,
            serialNumber: t.serialNumber,
            txnType: t.txnType,
            reason: t.reason,
            quantity: t.quantity,
            scannedBarcode: t.scannedBarcode,
            performedAt: t.performedAt.toISOString().slice(0, 16).replace("T", " "),
            note: t.note,
          }))}
        />
      </div>
    </main>
  );
}
