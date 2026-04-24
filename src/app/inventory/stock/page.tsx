import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companyScope } from "@/lib/api-utils";
import { StockClient } from "./stock-client";

export const dynamic = "force-dynamic";

type StockRow = {
  itemId: string;
  warehouseId: string;
  itemCode: string;
  itemName: string;
  warehouseCode: string;
  warehouseName: string;
  inQty: number;
  outQty: number;
  onHand: number;
};

export default async function InventoryStockPage() {
  const session = await getSession();

  // Server-side 집계 — /api/inventory/stock 과 같은 로직을 SSR 로 구성.
  const groups = await prisma.inventoryTransaction.groupBy({
    by: ["itemId", "warehouseId", "txnType"],
    where: companyScope(session),
    _sum: { quantity: true },
  });
  const acc = new Map<string, { itemId: string; warehouseId: string; inQty: number; outQty: number }>();
  for (const g of groups) {
    const key = `${g.itemId}|${g.warehouseId}`;
    const e = acc.get(key) ?? { itemId: g.itemId, warehouseId: g.warehouseId, inQty: 0, outQty: 0 };
    if (g.txnType === "IN") e.inQty += Number(g._sum.quantity ?? 0);
    else e.outQty += Number(g._sum.quantity ?? 0);
    acc.set(key, e);
  }
  const itemIds = Array.from(new Set(Array.from(acc.values()).map((v) => v.itemId)));
  const whIds = Array.from(new Set(Array.from(acc.values()).map((v) => v.warehouseId)));
  const [items, warehouses] = await Promise.all([
    prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, itemCode: true, name: true } }),
    prisma.warehouse.findMany({ where: { id: { in: whIds } }, select: { id: true, code: true, name: true } }),
  ]);
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const whMap = new Map(warehouses.map((w) => [w.id, w]));
  const stock: StockRow[] = Array.from(acc.values())
    .map((r) => {
      const item = itemMap.get(r.itemId);
      const wh = whMap.get(r.warehouseId);
      if (!item || !wh) return null;
      return {
        itemId: r.itemId,
        warehouseId: r.warehouseId,
        itemCode: item.itemCode,
        itemName: item.name,
        warehouseCode: wh.code,
        warehouseName: wh.name,
        inQty: r.inQty,
        outQty: r.outQty,
        onHand: r.inQty - r.outQty,
      };
    })
    .filter((s): s is StockRow => s !== null)
    .sort((a, b) => `${a.warehouseCode}|${a.itemCode}`.localeCompare(`${b.warehouseCode}|${b.itemCode}`));

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">
              TELLUSTECH ERP
            </Link>
            <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
              재고 · 현황
              <span className="ml-3 rounded bg-[color:var(--tts-primary-dim)] px-2 py-0.5 text-[12px] text-[color:var(--tts-primary)]">
                {session.companyCode}
              </span>
            </h1>
          </div>
          <Link href="/inventory/transactions" className="text-[13px] text-[color:var(--tts-primary)] hover:underline">
            입출고 이력 →
          </Link>
        </div>
        <StockClient initialData={stock} />
      </div>
    </main>
  );
}
