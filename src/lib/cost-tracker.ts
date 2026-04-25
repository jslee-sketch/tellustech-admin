import "server-only";
import { prisma } from "./prisma";

// 매입원가 추적 헬퍼
//   - getCostBySerial: 동일 S/N의 가장 최근 PURCHASE 단가
//   - getAvgCostByItem: 최근 6개월 PurchaseItem 평균 단가
//   - getEquipmentTotalCost: 장비 S/N별 누적 (매입가 + 부품비 + 출동비)

export async function getCostBySerial(serialNumber: string): Promise<number | null> {
  if (!serialNumber) return null;
  const last = await prisma.purchaseItem.findFirst({
    where: { serialNumber },
    orderBy: { createdAt: "desc" },
    select: { unitPrice: true },
  });
  return last ? Number(last.unitPrice) : null;
}

export async function getAvgCostByItem(itemId: string): Promise<number | null> {
  if (!itemId) return null;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const rows = await prisma.purchaseItem.findMany({
    where: { itemId, createdAt: { gte: sixMonthsAgo } },
    select: { unitPrice: true, quantity: true },
  });
  if (rows.length === 0) return null;
  // 가중 평균 (수량 가중)
  let totalQty = 0, totalAmt = 0;
  for (const r of rows) {
    const q = Number(r.quantity);
    const p = Number(r.unitPrice);
    totalQty += q;
    totalAmt += q * p;
  }
  return totalQty > 0 ? totalAmt / totalQty : null;
}

// S/N 우선, 없으면 평균. 둘 다 실패하면 null.
export async function resolveUnitCost(itemId: string, serialNumber?: string | null): Promise<number | null> {
  if (serialNumber) {
    const c = await getCostBySerial(serialNumber);
    if (c !== null) return c;
  }
  return await getAvgCostByItem(itemId);
}

export type EquipmentCost = {
  serialNumber: string;
  itemName: string;
  itemCode: string;
  purchaseCost: number;
  partsCost: number;
  partsCount: number;
  transportCost: number;
  consumablesCost: number;
  totalCost: number;
  lastServiceDate: Date | null;
};

// 장비 S/N 한 건의 누적 비용
export async function getEquipmentTotalCost(equipmentSN: string): Promise<EquipmentCost | null> {
  if (!equipmentSN) return null;

  // 1) 장비 자체 매입가 — 동일 S/N의 PurchaseItem
  const purchase = await prisma.purchaseItem.findFirst({
    where: { serialNumber: equipmentSN },
    orderBy: { createdAt: "desc" },
    include: { item: { select: { itemCode: true, name: true } } },
  });
  const purchaseCost = purchase ? Number(purchase.unitPrice) * Number(purchase.quantity) : 0;
  const itemName = purchase?.item.name ?? "";
  const itemCode = purchase?.item.itemCode ?? "";

  // 2) 부품비 — AsDispatchPart WHERE targetEquipmentSN
  const parts = await prisma.asDispatchPart.findMany({
    where: { targetEquipmentSN: equipmentSN },
    select: { totalCost: true, createdAt: true },
  });
  const partsCost = parts.reduce((s, p) => s + Number(p.totalCost ?? 0), 0);

  // 3) 출동 교통비 — AS 티켓의 serialNumber와 매칭되는 출동
  const dispatches = await prisma.asDispatch.findMany({
    where: { OR: [{ targetEquipmentSN: equipmentSN }, { asTicket: { serialNumber: equipmentSN } }] },
    select: { transportCost: true, createdAt: true },
  });
  const transportCost = dispatches.reduce((s, d) => s + Number(d.transportCost ?? 0), 0);

  // 4) 소모품비 (CONSUMABLE_OUT, targetEquipmentSN)
  const consumables = await prisma.inventoryTransaction.findMany({
    where: { reason: "CONSUMABLE_OUT", targetEquipmentSN: equipmentSN },
    include: { item: { select: { id: true } } },
  });
  let consumablesCost = 0;
  for (const c of consumables) {
    const cost = await resolveUnitCost(c.itemId, c.serialNumber);
    if (cost !== null) consumablesCost += cost * c.quantity;
  }

  // 마지막 서비스일 — parts/dispatches/consumables 중 가장 최근
  const dates = [
    ...parts.map((p) => p.createdAt),
    ...dispatches.map((d) => d.createdAt),
    ...consumables.map((c) => c.performedAt),
  ];
  const lastServiceDate = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

  return {
    serialNumber: equipmentSN,
    itemName,
    itemCode,
    purchaseCost,
    partsCost,
    partsCount: parts.length,
    transportCost,
    consumablesCost,
    totalCost: purchaseCost + partsCost + transportCost + consumablesCost,
    lastServiceDate,
  };
}
