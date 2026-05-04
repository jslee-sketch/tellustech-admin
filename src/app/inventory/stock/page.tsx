import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companyScope } from "@/lib/api-utils";
import { t } from "@/lib/i18n";
import { StockClient } from "./stock-client";
import { InventoryItemsSection } from "./inventory-items-section";
import { StockTabs } from "./stock-tabs";

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
  available: number;     // 가용수량 = 자사 + Internal창고 + currentLocationClientId NULL + status NORMAL
  avgUnitPrice: number;  // 평균 매입단가 (가중)
  totalAmount: number;   // 평균단가 × 현재재고
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
  const [items, warehouses, purchasePrices, availableCounts] = await Promise.all([
    prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, itemCode: true, name: true } }),
    prisma.warehouse.findMany({ where: { id: { in: whIds } }, select: { id: true, code: true, name: true } }),
    // 평균 매입단가 계산: PurchaseItem 의 (qty × unitPrice 합) / qty 합 (가중평균)
    prisma.purchaseItem.groupBy({
      by: ["itemId"],
      where: { itemId: { in: itemIds } },
      _sum: { quantity: true, amount: true },
    }),
    // 가용수량 — 창고×품목 단위로 자사재고 + Internal창고 + 외부위탁 안 됨 + 정상상태
    prisma.inventoryItem.groupBy({
      by: ["itemId", "warehouseId"],
      where: {
        itemId: { in: itemIds },
        warehouseId: { in: whIds },
        ownerType: "COMPANY",
        currentLocationClientId: null,
        status: "NORMAL",
        archivedAt: null,
        warehouse: { warehouseType: { in: ["INTERNAL", "CLIENT"] } },
      },
      _count: { _all: true },
    }),
  ]);
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const whMap = new Map(warehouses.map((w) => [w.id, w]));
  const avgPriceMap = new Map(purchasePrices.map((p) => {
    const qty = Number(p._sum.quantity ?? 0);
    const amt = Number(p._sum.amount ?? 0);
    return [p.itemId, qty > 0 ? amt / qty : 0];
  }));
  const availableMap = new Map(availableCounts.map((a) => [`${a.itemId}|${a.warehouseId}`, a._count._all]));
  const stock: StockRow[] = Array.from(acc.values())
    .map((r) => {
      const item = itemMap.get(r.itemId);
      const wh = whMap.get(r.warehouseId);
      if (!item || !wh) return null;
      const onHand = r.inQty - r.outQty;
      const avg = avgPriceMap.get(r.itemId) ?? 0;
      return {
        itemId: r.itemId,
        warehouseId: r.warehouseId,
        itemCode: item.itemCode,
        itemName: item.name,
        warehouseCode: wh.code,
        warehouseName: wh.name,
        inQty: r.inQty,
        outQty: r.outQty,
        onHand,
        available: availableMap.get(`${r.itemId}|${r.warehouseId}`) ?? 0,
        avgUnitPrice: Math.round(avg),
        totalAmount: Math.round(avg * onHand),
      };
    })
    .filter((s): s is StockRow => s !== null)
    .sort((a, b) => `${a.warehouseCode}|${a.itemCode}`.localeCompare(`${b.warehouseCode}|${b.itemCode}`));

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
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
            {t("link.transactionHistory", L)}
          </Link>
        </div>
        <StockTabs
          lang={L}
          realtime={<StockClient lang={L} initialData={stock} />}
          bySerial={await renderInventoryItems(session, L)}
        />
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
      ownerClient: { select: { clientCode: true, companyNameVi: true, companyNameKo: true, companyNameEn: true } },
      remarks: { orderBy: { date: "desc" }, take: 1 },
    },
    take: 1000,
  });
  // currentLocationClient 라벨 lookup
  const locClientIds = Array.from(new Set(items.map((i) => i.currentLocationClientId).filter((x): x is string => !!x)));
  const locClients = locClientIds.length > 0
    ? await prisma.client.findMany({ where: { id: { in: locClientIds } }, select: { id: true, clientCode: true, companyNameVi: true, companyNameKo: true } })
    : [];
  const locMap = new Map(locClients.map((c) => [c.id, c]));
  // 마지막 OUT 트랜잭션의 referenceModule 매핑 — 현황(렌탈/수리/교정/데모)
  const sns = items.map((i) => i.serialNumber);
  const lastOutTxns = sns.length > 0
    ? await prisma.inventoryTransaction.findMany({
        where: { serialNumber: { in: sns }, txnType: "OUT" },
        orderBy: { performedAt: "desc" },
        select: { serialNumber: true, referenceModule: true, performedAt: true },
      })
    : [];
  const lastOutBySn = new Map<string, string | null>();
  for (const t of lastOutTxns) {
    if (!t.serialNumber) continue;
    if (!lastOutBySn.has(t.serialNumber)) lastOutBySn.set(t.serialNumber, t.referenceModule ?? null);
  }
  const refToSituation = (ref: string | null | undefined): "재고" | "렌탈" | "수리" | "교정" | "데모" | null => {
    if (!ref) return null;
    if (ref === "RENTAL") return "렌탈";
    if (ref === "REPAIR") return "수리";
    if (ref === "CALIB") return "교정";
    if (ref === "DEMO") return "데모";
    return null;
  };
  const companyName = session.companyCode === "TV" ? "Tellustech Vina" : "Vietrental";
  return (
    <InventoryItemsSection
      lang={lang}
      companyName={companyName}
      initialItems={items.map((it) => {
        const loc = it.currentLocationClientId ? locMap.get(it.currentLocationClientId) : null;
        // 현황 결정: archived = null. currentLocation 없으면 "재고". 있으면 마지막 OUT 의 refModule 매핑
        const lastOutRef = lastOutBySn.get(it.serialNumber);
        const situation: "재고" | "렌탈" | "수리" | "교정" | "데모" | null = it.archivedAt
          ? null
          : (it.currentLocationClientId ? refToSituation(lastOutRef) : "재고");
        return {
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
          ownerType: it.ownerType,
          ownerClientLabel: it.ownerClient
            ? `${it.ownerClient.clientCode} · ${it.ownerClient.companyNameKo ?? it.ownerClient.companyNameVi}`
            : null,
          inboundReason: it.inboundReason ?? null,
          options: it.options ?? null,
          currentLocationLabel: loc ? `${loc.clientCode} · ${loc.companyNameKo ?? loc.companyNameVi}` : null,
          situation,
        };
      })}
    />
  );
}
