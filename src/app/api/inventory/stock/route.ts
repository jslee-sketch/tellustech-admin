import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { companyScope, ok, trimNonEmpty } from "@/lib/api-utils";

// 실시간 재고 집계
// = sum(IN.quantity) - sum(OUT.quantity) per (itemId, warehouseId)
// Prisma groupBy 는 signed sum 을 직접 지원 못함 → 두 번 groupBy 후 JS 에서 병합.
// S/N 단위 "현재 어디 있나" 는 별도: 해당 S/N 의 최신 거래로 추정 (아래 serial 쿼리).

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const itemId = trimNonEmpty(url.searchParams.get("item"));
    const warehouseId = trimNonEmpty(url.searchParams.get("warehouse"));
    const serialNumber = trimNonEmpty(url.searchParams.get("sn"));

    // 특정 S/N 위치 질의
    if (serialNumber) {
      const last = await prisma.inventoryTransaction.findFirst({
        where: { ...companyScope(session), serialNumber },
        orderBy: { performedAt: "desc" },
        include: { warehouse: { select: { code: true, name: true } } },
      });
      const inStock = !!last && last.txnType === "IN";
      return ok({
        serialNumber,
        inStock,
        location: inStock && last ? { warehouseCode: last.warehouse.code, warehouseName: last.warehouse.name } : null,
        lastTxn: last
          ? { txnType: last.txnType, reason: last.reason, performedAt: last.performedAt }
          : null,
      });
    }

    // item/warehouse 필터로 집계
    const where = {
      ...companyScope(session),
      ...(itemId ? { itemId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
    };
    const groups = await prisma.inventoryTransaction.groupBy({
      by: ["itemId", "warehouseId", "txnType"],
      where,
      _sum: { quantity: true },
    });
    // (item, warehouse) 별로 IN - OUT
    const acc = new Map<string, { itemId: string; warehouseId: string; inQty: number; outQty: number }>();
    for (const g of groups) {
      const key = `${g.itemId}|${g.warehouseId}`;
      const entry = acc.get(key) ?? { itemId: g.itemId, warehouseId: g.warehouseId, inQty: 0, outQty: 0 };
      if (g.txnType === "IN") entry.inQty += Number(g._sum.quantity ?? 0);
      else entry.outQty += Number(g._sum.quantity ?? 0);
      acc.set(key, entry);
    }
    const stockItems = Array.from(acc.values()).map((r) => ({
      itemId: r.itemId,
      warehouseId: r.warehouseId,
      inQty: r.inQty,
      outQty: r.outQty,
      onHand: r.inQty - r.outQty,
    }));

    // 아이템 / 창고 메타 덧붙이기
    const itemIds = Array.from(new Set(stockItems.map((s) => s.itemId)));
    const warehouseIds = Array.from(new Set(stockItems.map((s) => s.warehouseId)));
    const [items, warehouses] = await Promise.all([
      prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, itemCode: true, name: true, itemType: true } }),
      prisma.warehouse.findMany({ where: { id: { in: warehouseIds } }, select: { id: true, code: true, name: true, branchType: true } }),
    ]);
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const whMap = new Map(warehouses.map((w) => [w.id, w]));

    const stock = stockItems
      .map((s) => ({
        ...s,
        item: itemMap.get(s.itemId) ?? null,
        warehouse: whMap.get(s.warehouseId) ?? null,
      }))
      .filter((s) => s.item && s.warehouse)
      .sort((a, b) => {
        const aKey = `${a.warehouse?.code}|${a.item?.itemCode}`;
        const bKey = `${b.warehouse?.code}|${b.item?.itemCode}`;
        return aKey.localeCompare(bKey);
      });

    return ok({ stock });
  });
}
