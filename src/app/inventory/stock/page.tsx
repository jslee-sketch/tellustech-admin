import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companyScope } from "@/lib/api-utils";
import { t } from "@/lib/i18n";
import { StockClient } from "./stock-client";
import { InventoryItemsSection } from "./inventory-items-section";

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
  const L = session.language;

  // Server-side 집계 — from/to 이중구조:
  //   창고 X 의 재고 = Σ(toWarehouseId=X) - Σ(fromWarehouseId=X)
  const baseWhere = companyScope(session);
  const [ins, outs] = await Promise.all([
    prisma.inventoryTransaction.groupBy({
      by: ["itemId", "toWarehouseId"],
      where: { ...baseWhere, toWarehouseId: { not: null } },
      _sum: { quantity: true },
    }),
    prisma.inventoryTransaction.groupBy({
      by: ["itemId", "fromWarehouseId"],
      where: { ...baseWhere, fromWarehouseId: { not: null } },
      _sum: { quantity: true },
    }),
  ]);
  const acc = new Map<string, { itemId: string; warehouseId: string; inQty: number; outQty: number }>();
  for (const g of ins) {
    if (!g.toWarehouseId) continue;
    const key = `${g.itemId}|${g.toWarehouseId}`;
    const e = acc.get(key) ?? { itemId: g.itemId, warehouseId: g.toWarehouseId, inQty: 0, outQty: 0 };
    e.inQty += Number(g._sum.quantity ?? 0);
    acc.set(key, e);
  }
  for (const g of outs) {
    if (!g.fromWarehouseId) continue;
    const key = `${g.itemId}|${g.fromWarehouseId}`;
    const e = acc.get(key) ?? { itemId: g.itemId, warehouseId: g.fromWarehouseId, inQty: 0, outQty: 0 };
    e.outQty += Number(g._sum.quantity ?? 0);
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
              {t("page.stock.title", L)}
              <span className="ml-3 rounded bg-[color:var(--tts-primary-dim)] px-2 py-0.5 text-[12px] text-[color:var(--tts-primary)]">
                {session.companyCode}
              </span>
            </h1>
          </div>
          <Link href="/inventory/transactions" className="text-[13px] text-[color:var(--tts-primary)] hover:underline">
            {L === "VI" ? "Lịch sử xuất nhập →" : L === "EN" ? "Transaction history →" : "입출고 이력 →"}
          </Link>
        </div>
        <StockClient initialData={stock} />

        <div className="mt-6">
          {await renderInventoryItems(session, L)}
        </div>
      </div>
    </main>
  );
}

async function renderInventoryItems(session: { companyCode: "TV" | "VR" }, lang: import("@/lib/i18n").Lang) {
  const items = await prisma.inventoryItem.findMany({
    where: { companyCode: session.companyCode },
    include: {
      item: { select: { itemCode: true, name: true, itemType: true } },
      warehouse: { select: { code: true, name: true, warehouseType: true } },
      remarks: { orderBy: { date: "desc" }, take: 1 },
    },
    take: 1000,
  });
  const companyName = session.companyCode === "TV" ? "Tellustech Vina" : "Vietrental";
  return (
    <InventoryItemsSection
      lang={lang}
      companyName={companyName}
      initialItems={items.map((it) => ({
        id: it.id,
        itemId: it.itemId,
        itemCode: it.item.itemCode,
        itemName: it.item.name,
        itemType: it.item.itemType,
        serialNumber: it.serialNumber,
        warehouseId: it.warehouseId,
        warehouseCode: it.warehouse.code,
        warehouseName: it.warehouse.name,
        warehouseType: it.warehouse.warehouseType,
        status: it.status,
        acquiredAt: it.acquiredAt ? it.acquiredAt.toISOString() : null,
        lastRemark: it.remarks[0]
          ? { date: it.remarks[0].date.toISOString(), content: it.remarks[0].contentKo ?? it.remarks[0].contentVi ?? it.remarks[0].contentEn ?? "" }
          : null,
      }))}
    />
  );
}
