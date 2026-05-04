// orphan S/N 정리 — 마스터(InventoryItem) 없이 다른 모듈에 존재하는 S/N에 대해
// InventoryItem 자동 생성하여 정합성 회복.
// 실행: DATABASE_URL=<prod-url> npx tsx scripts/dev-only/backfill-orphan-sn.ts

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import type { InventoryReason, AssetOwnerType } from "../../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let created = 0, skipped = 0, errors = 0;

async function ensureFallbackWarehouse(): Promise<string> {
  // 시드용 fallback warehouse — 미식별 자산 보관소
  const code = "WH-BACKFILL";
  const ex = await prisma.warehouse.findUnique({ where: { code } });
  if (ex) return ex.id;
  const created = await prisma.warehouse.create({
    data: { code, name: "Backfill Holding (orphan S/N)", warehouseType: "INTERNAL", branchType: "BN", location: "auto-backfill" },
  });
  console.log(`[backfill] WH-BACKFILL 자동 생성: ${created.id}`);
  return created.id;
}

async function ensureFallbackItem(): Promise<string> {
  // 시드용 fallback item — 식별 안되는 옛 S/N 의 placeholder 품목
  const code = "ITM-BACKFILL";
  const ex = await prisma.item.findUnique({ where: { itemCode: code } });
  if (ex) return ex.id;
  const created = await prisma.item.create({
    data: { itemCode: code, itemType: "PRODUCT", name: "Backfill Placeholder", description: "orphan S/N backfill 자동 생성", unit: "EA" },
  });
  console.log(`[backfill] ITM-BACKFILL 자동 생성: ${created.id}`);
  return created.id;
}

async function backfillSn(sn: string, opts: { itemId?: string; warehouseId: string; companyCode: "TV"|"VR"; ownerType?: AssetOwnerType; ownerClientId?: string; inboundReason?: InventoryReason; note: string }) {
  const ex = await prisma.inventoryItem.findUnique({ where: { serialNumber: sn } });
  if (ex) { skipped++; return; }
  try {
    await prisma.inventoryItem.create({
      data: {
        itemId: opts.itemId!,
        serialNumber: sn,
        warehouseId: opts.warehouseId,
        companyCode: opts.companyCode,
        status: "NORMAL",
        ownerType: opts.ownerType ?? "COMPANY",
        ownerClientId: opts.ownerClientId ?? null,
        inboundReason: opts.inboundReason ?? null,
        inboundAt: new Date(),
        acquiredAt: new Date(),
        stateNoteKo: `자동 backfill — ${opts.note}`,
        stateNoteOriginalLang: "KO",
      },
    });
    created++;
  } catch (e: any) {
    console.warn(`[backfill] FAIL ${sn}: ${String(e.message ?? e).slice(0, 100)}`);
    errors++;
  }
}

async function main() {
  console.log("\n━━━━━━ orphan S/N backfill 시작 ━━━━━━\n");
  const whId = await ensureFallbackWarehouse();
  const fallbackItemId = await ensureFallbackItem();

  // 마스터 등록된 S/N 셋
  const masterRows = await prisma.inventoryItem.findMany({ select: { serialNumber: true } });
  const masterSet = new Set(masterRows.map((m) => m.serialNumber));

  // (A) ItContractEquipment.active 의 orphan — IT 계약에 묶여 있으므로 itemId 가져와서 정확히 생성
  console.log("[A] ItContractEquipment(active) orphan");
  const eqs = await prisma.itContractEquipment.findMany({
    where: { removedAt: null },
    select: { serialNumber: true, itemId: true, itContract: { select: { companyCode: true, clientId: true, contractNumber: true } } },
  });
  for (const e of eqs) {
    if (masterSet.has(e.serialNumber)) continue;
    await backfillSn(e.serialNumber, {
      itemId: e.itemId,
      warehouseId: whId,
      companyCode: e.itContract.companyCode,
      ownerType: "COMPANY",
      note: `IT 계약 ${e.itContract.contractNumber} 장비`,
    });
    masterSet.add(e.serialNumber);
  }

  // (B) PurchaseItem 의 orphan — 매입 라인이 있는 것은 매입한 자산 → COMPANY
  console.log("[B] PurchaseItem orphan");
  const purItems = await prisma.purchaseItem.findMany({
    where: { serialNumber: { not: null } },
    select: { serialNumber: true, itemId: true, purchase: { select: { companyCode: true, supplierId: true, purchaseNumber: true, warehouseId: true } } },
  });
  for (const p of purItems) {
    if (!p.serialNumber || masterSet.has(p.serialNumber)) continue;
    await backfillSn(p.serialNumber, {
      itemId: p.itemId,
      warehouseId: p.purchase.warehouseId ?? whId,
      companyCode: p.purchase.companyCode,
      ownerType: "COMPANY",
      inboundReason: "PURCHASE",
      note: `매입 ${p.purchase.purchaseNumber}`,
    });
    masterSet.add(p.serialNumber);
  }

  // (C) SalesItem orphan — 매출된 자산 (TRADE 면 archived COMPANY, 그 외 외부 자산)
  console.log("[C] SalesItem orphan");
  const slsItems = await prisma.salesItem.findMany({
    where: { serialNumber: { not: null } },
    select: { serialNumber: true, itemId: true, sales: { select: { companyCode: true, clientId: true, salesNumber: true, projectId: true } } },
  });
  for (const s of slsItems) {
    if (!s.serialNumber || masterSet.has(s.serialNumber)) continue;
    // 매출 자산은 일단 EXTERNAL_CLIENT (고객 자산)로 추정 — TRADE 케이스는 별도 핸들 (지금은 단순화)
    await backfillSn(s.serialNumber, {
      itemId: s.itemId ?? fallbackItemId,
      warehouseId: whId,
      companyCode: s.sales.companyCode,
      ownerType: "EXTERNAL_CLIENT",
      ownerClientId: s.sales.clientId,
      note: `매출 ${s.sales.salesNumber}`,
    });
    masterSet.add(s.serialNumber);
  }

  // (D) InventoryTransaction orphan — 트랜잭션의 itemId/warehouse 사용
  console.log("[D] InventoryTransaction orphan");
  const txns = await prisma.inventoryTransaction.findMany({
    where: { serialNumber: { not: null } },
    select: { serialNumber: true, itemId: true, companyCode: true, fromWarehouseId: true, toWarehouseId: true, clientId: true, txnType: true },
  });
  for (const t of txns) {
    if (!t.serialNumber || masterSet.has(t.serialNumber)) continue;
    await backfillSn(t.serialNumber, {
      itemId: t.itemId,
      warehouseId: t.toWarehouseId ?? t.fromWarehouseId ?? whId,
      companyCode: t.companyCode,
      ownerType: t.clientId ? "EXTERNAL_CLIENT" : "COMPANY",
      ownerClientId: t.clientId ?? undefined,
      note: `Txn ${t.txnType}`,
    });
    masterSet.add(t.serialNumber);
  }

  // (E) AsTicket orphan (LOOSE 정책상 허용이지만 정합 위해 EXTERNAL_CLIENT 로 등록)
  console.log("[E] AsTicket orphan");
  const tickets = await prisma.asTicket.findMany({
    where: { serialNumber: { not: null } },
    select: { serialNumber: true, itemId: true, clientId: true, companyCode: true, ticketNumber: true },
  });
  for (const t of tickets) {
    if (!t.serialNumber || masterSet.has(t.serialNumber)) continue;
    await backfillSn(t.serialNumber, {
      itemId: t.itemId ?? fallbackItemId,
      warehouseId: whId,
      companyCode: t.companyCode,
      ownerType: "EXTERNAL_CLIENT",
      ownerClientId: t.clientId,
      note: `AS ${t.ticketNumber}`,
    });
    masterSet.add(t.serialNumber);
  }

  // (F) AsDispatch.targetEquipmentSN orphan
  console.log("[F] AsDispatch.targetEquipmentSN orphan");
  const dps = await prisma.asDispatch.findMany({
    where: { targetEquipmentSN: { not: null } },
    select: { targetEquipmentSN: true, asTicket: { select: { clientId: true, companyCode: true, itemId: true, ticketNumber: true } } },
  });
  for (const d of dps) {
    if (!d.targetEquipmentSN || masterSet.has(d.targetEquipmentSN)) continue;
    await backfillSn(d.targetEquipmentSN, {
      itemId: d.asTicket.itemId ?? fallbackItemId,
      warehouseId: whId,
      companyCode: d.asTicket.companyCode,
      ownerType: "EXTERNAL_CLIENT",
      ownerClientId: d.asTicket.clientId,
      note: `Dispatch target ${d.asTicket.ticketNumber}`,
    });
    masterSet.add(d.targetEquipmentSN);
  }

  // (G) AsDispatchPart.targetEquipmentSN orphan
  console.log("[G] AsDispatchPart.targetEquipmentSN orphan");
  const dpps = await prisma.asDispatchPart.findMany({
    where: { targetEquipmentSN: { not: "" } },
    select: { targetEquipmentSN: true, asDispatch: { select: { asTicket: { select: { clientId: true, companyCode: true, ticketNumber: true } } } } },
  });
  for (const dp of dpps) {
    if (!dp.targetEquipmentSN || masterSet.has(dp.targetEquipmentSN)) continue;
    await backfillSn(dp.targetEquipmentSN, {
      itemId: fallbackItemId,
      warehouseId: whId,
      companyCode: dp.asDispatch.asTicket.companyCode,
      ownerType: "EXTERNAL_CLIENT",
      ownerClientId: dp.asDispatch.asTicket.clientId,
      note: `DispatchPart target ${dp.asDispatch.asTicket.ticketNumber}`,
    });
    masterSet.add(dp.targetEquipmentSN);
  }

  // (H) TmRentalItem orphan
  console.log("[H] TmRentalItem orphan");
  const tms = await prisma.tmRentalItem.findMany({
    select: { serialNumber: true, itemId: true, tmRental: { select: { companyCode: true, clientId: true, rentalCode: true } } },
  });
  for (const tm of tms) {
    if (masterSet.has(tm.serialNumber)) continue;
    await backfillSn(tm.serialNumber, {
      itemId: tm.itemId,
      warehouseId: whId,
      companyCode: tm.tmRental.companyCode,
      ownerType: "COMPANY",
      note: `TM 렌탈 ${tm.tmRental.rentalCode}`,
    });
    masterSet.add(tm.serialNumber);
  }

  console.log(`\n━━━━━━ backfill 완료 ━━━━━━ created=${created} skipped=${skipped} errors=${errors}\n`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
