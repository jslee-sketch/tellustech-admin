// 재고 리팩토링 Phase 2 — E2E 시드 (단독 실행 가능).
// scripts/test-inv-e2e.ts 의 seed() 부분을 분리한 재사용 가능한 스크립트.
//
// 실행: npx tsx scripts/seed-inventory-e2e.ts
// 멱등: prefix 로 한정한 기존 행을 정리 후 재시드.
//
// 시드 대상:
//   - 거래처 6개 (CL-INV-001~006): 자사 렌탈 고객 2 + 외주 수리처 1 + 외주 교정처 1 + 장비공급사 1 + 데모 대여처 1
//   - 창고 2개 (WH-INT-01, WH-INT-02): 본사·지점 내부 창고
//   - 품목 5개 (ITM-INV-001~005): 장비 4 + 소모품 1 (BlackToner)
//   - 사전 자사 자산 마스터 4개 (Round 2 시나리오 prerequisite):
//     · SN-INV-R001 (D330, ALPHA 에 렌탈 중)
//     · SN-INV-RP02 (X7500, 창고 — 수리 의뢰 대기)
//     · SN-INV-CL02 (E5071C, 창고 — 교정 의뢰 대기)
//     · SN-INV-DM02 (N9020B, 창고 — 데모 출고 대기)

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function cleanPriorE2E() {
  const items = await prisma.item.findMany({ where: { itemCode: { startsWith: "ITM-INV-" } }, select: { id: true } });
  const itemIds = items.map((i) => i.id);
  await prisma.payableReceivable.deleteMany({ where: { sourceInventoryTxn: { OR: [{ serialNumber: { startsWith: "SN-INV-" } }, { itemId: { in: itemIds } }] } } });
  await prisma.inventoryTransaction.deleteMany({ where: { OR: [{ serialNumber: { startsWith: "SN-INV-" } }, { itemId: { in: itemIds } }] } });
  await prisma.inventoryItem.deleteMany({ where: { OR: [{ serialNumber: { startsWith: "SN-INV-" } }, { itemId: { in: itemIds } }] } });
  if (itemIds.length > 0) {
    await prisma.inventoryStock.deleteMany({ where: { itemId: { in: itemIds } } });
  }
  await prisma.client.deleteMany({ where: { clientCode: { startsWith: "CL-INV-" } } });
  await prisma.warehouse.deleteMany({ where: { code: { startsWith: "WH-INT-" } } });
  await prisma.item.deleteMany({ where: { itemCode: { startsWith: "ITM-INV-" } } });
}

export async function seedInventoryE2E() {
  await cleanPriorE2E();

  const clients = [
    { clientCode: "CL-INV-001", companyNameVi: "ALPHA Electronics", companyNameKo: "ALPHA전자", companyNameEn: "ALPHA Electronics" },
    { clientCode: "CL-INV-002", companyNameVi: "BETA Trading", companyNameKo: "BETA무역", companyNameEn: "BETA Trading" },
    { clientCode: "CL-INV-003", companyNameVi: "GAMMA Repair", companyNameKo: "외주수리처 GAMMA", companyNameEn: "GAMMA Repair Service" },
    { clientCode: "CL-INV-004", companyNameVi: "DELTA Calibration", companyNameKo: "외주교정처 DELTA", companyNameEn: "DELTA Calibration" },
    { clientCode: "CL-INV-005", companyNameVi: "EPSILON Supply", companyNameKo: "장비공급사 EPSILON", companyNameEn: "EPSILON Supply" },
    { clientCode: "CL-INV-006", companyNameVi: "ZETA Demo Lend", companyNameKo: "데모대여처 ZETA", companyNameEn: "ZETA Demo Lend" },
  ];
  for (const c of clients) await prisma.client.create({ data: { ...c, grade: "B" } });

  await prisma.warehouse.create({ data: { code: "WH-INT-01", name: "BN 본사 창고", warehouseType: "INTERNAL" } });
  await prisma.warehouse.create({ data: { code: "WH-INT-02", name: "HN 지점 창고", warehouseType: "INTERNAL" } });

  const items = [
    { itemCode: "ITM-INV-001", name: "Sindoh D330", itemType: "PRODUCT" as const },
    { itemCode: "ITM-INV-002", name: "Samsung X7500", itemType: "PRODUCT" as const },
    { itemCode: "ITM-INV-003", name: "Keysight E5071C", itemType: "PRODUCT" as const },
    { itemCode: "ITM-INV-004", name: "Keysight N9020B", itemType: "PRODUCT" as const },
    { itemCode: "ITM-INV-005", name: "Black Toner D330", itemType: "CONSUMABLE" as const },
  ];
  for (const it of items) await prisma.item.create({ data: it });

  const wh1 = await prisma.warehouse.findUniqueOrThrow({ where: { code: "WH-INT-01" } });
  const alpha = await prisma.client.findUniqueOrThrow({ where: { clientCode: "CL-INV-001" } });
  const itM = new Map<string, string>();
  for (const it of items) {
    const r = await prisma.item.findUnique({ where: { itemCode: it.itemCode }, select: { id: true } });
    if (r) itM.set(it.itemCode, r.id);
  }

  // 사전 자사 자산 마스터
  await prisma.inventoryItem.create({
    data: { itemId: itM.get("ITM-INV-001")!, serialNumber: "SN-INV-R001", warehouseId: wh1.id, companyCode: "TV", ownerType: "COMPANY", acquiredAt: new Date(), currentLocationClientId: alpha.id, currentLocationSinceAt: new Date() },
  });
  await prisma.inventoryItem.create({
    data: { itemId: itM.get("ITM-INV-002")!, serialNumber: "SN-INV-RP02", warehouseId: wh1.id, companyCode: "TV", ownerType: "COMPANY", acquiredAt: new Date() },
  });
  await prisma.inventoryItem.create({
    data: { itemId: itM.get("ITM-INV-003")!, serialNumber: "SN-INV-CL02", warehouseId: wh1.id, companyCode: "TV", ownerType: "COMPANY", acquiredAt: new Date() },
  });
  await prisma.inventoryItem.create({
    data: { itemId: itM.get("ITM-INV-004")!, serialNumber: "SN-INV-DM02", warehouseId: wh1.id, companyCode: "TV", ownerType: "COMPANY", acquiredAt: new Date() },
  });

  console.log("✓ Inventory E2E seed complete: 6 clients + 2 warehouses + 5 items + 4 pre-existing masters (R001/RP02/CL02/DM02)");
}

if (require.main === module) {
  seedInventoryE2E()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
