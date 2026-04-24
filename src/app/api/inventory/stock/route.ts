import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { companyScope, ok, trimNonEmpty } from "@/lib/api-utils";

// 실시간 재고 집계 (fromWarehouseId / toWarehouseId 이중 구조 기반)
//   창고 X 의 재고
//   = Σ(toWarehouseId = X 인 트랜잭션 수량)   // 들어옴 (IN + TRANSFER 목적지)
//   - Σ(fromWarehouseId = X 인 트랜잭션 수량) // 나감 (OUT + TRANSFER 출발지)
// Prisma groupBy 는 두 필드 병합을 못해서 각각 계산 후 JS 병합.

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const itemId = trimNonEmpty(url.searchParams.get("item"));
    const warehouseId = trimNonEmpty(url.searchParams.get("warehouse"));
    const serialNumber = trimNonEmpty(url.searchParams.get("sn"));

    // 특정 S/N 위치 질의 — 마지막 트랜잭션의 to 창고가 현재 위치
    if (serialNumber) {
      const last = await prisma.inventoryTransaction.findFirst({
        where: { ...companyScope(session), serialNumber },
        orderBy: { performedAt: "desc" },
        include: {
          fromWarehouse: { select: { code: true, name: true } },
          toWarehouse: { select: { code: true, name: true } },
          client: { select: { clientCode: true, companyNameVi: true } },
        },
      });
      // inStock: 마지막 이벤트가 IN 또는 TRANSFER 이고 toWarehouse 가 있으면 재고 있음
      // OUT 이면 이미 나간 상태
      const inStock = !!last && last.txnType !== "OUT" && !!last.toWarehouseId;
      return ok({
        serialNumber,
        inStock,
        location: inStock && last?.toWarehouse
          ? { warehouseCode: last.toWarehouse.code, warehouseName: last.toWarehouse.name }
          : null,
        client: last?.client
          ? { clientCode: last.client.clientCode, companyNameVi: last.client.companyNameVi }
          : null,
        lastTxn: last
          ? { txnType: last.txnType, reason: last.reason, performedAt: last.performedAt }
          : null,
      });
    }

    // item 필터로 전체 집계 (warehouse 필터는 나중에 front 에서 수행)
    const baseWhere = {
      ...companyScope(session),
      ...(itemId ? { itemId } : {}),
    };

    const [ins, outs] = await Promise.all([
      // toWarehouseId 가 있는 건: 해당 창고로 들어오는 것
      prisma.inventoryTransaction.groupBy({
        by: ["itemId", "toWarehouseId"],
        where: { ...baseWhere, toWarehouseId: { not: null } },
        _sum: { quantity: true },
      }),
      // fromWarehouseId 가 있는 건: 해당 창고에서 나가는 것
      prisma.inventoryTransaction.groupBy({
        by: ["itemId", "fromWarehouseId"],
        where: { ...baseWhere, fromWarehouseId: { not: null } },
        _sum: { quantity: true },
      }),
    ]);

    // (item, warehouse) 별로 inQty (들어옴) - outQty (나감)
    const acc = new Map<string, { itemId: string; warehouseId: string; inQty: number; outQty: number }>();
    for (const g of ins) {
      if (!g.toWarehouseId) continue;
      const key = `${g.itemId}|${g.toWarehouseId}`;
      const entry = acc.get(key) ?? { itemId: g.itemId, warehouseId: g.toWarehouseId, inQty: 0, outQty: 0 };
      entry.inQty += Number(g._sum.quantity ?? 0);
      acc.set(key, entry);
    }
    for (const g of outs) {
      if (!g.fromWarehouseId) continue;
      const key = `${g.itemId}|${g.fromWarehouseId}`;
      const entry = acc.get(key) ?? { itemId: g.itemId, warehouseId: g.fromWarehouseId, inQty: 0, outQty: 0 };
      entry.outQty += Number(g._sum.quantity ?? 0);
      acc.set(key, entry);
    }

    let stockItems = Array.from(acc.values()).map((r) => ({
      itemId: r.itemId,
      warehouseId: r.warehouseId,
      inQty: r.inQty,
      outQty: r.outQty,
      onHand: r.inQty - r.outQty,
    }));

    // 특정 창고 필터
    if (warehouseId) stockItems = stockItems.filter((s) => s.warehouseId === warehouseId);

    const itemIds = Array.from(new Set(stockItems.map((s) => s.itemId)));
    const warehouseIds = Array.from(new Set(stockItems.map((s) => s.warehouseId)));
    const [items, warehouses] = await Promise.all([
      prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, itemCode: true, name: true, itemType: true } }),
      prisma.warehouse.findMany({ where: { id: { in: warehouseIds } }, select: { id: true, code: true, name: true, branchType: true, warehouseType: true } }),
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
