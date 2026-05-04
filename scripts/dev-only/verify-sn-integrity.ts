// S/N 정합성 전수 검증 — 모든 모듈에서 동일 S/N이 일관되게 추적되는지 확인
// 실행: DATABASE_URL=<prod-url> npx tsx scripts/dev-only/verify-sn-integrity.ts

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let pass = 0, fail = 0, warn = 0;
function check(name: string, ok: boolean, detail?: string) {
  const tag = ok ? "✅ PASS" : "❌ FAIL";
  console.log(`${tag} | ${name}${detail ? " — " + detail : ""}`);
  if (ok) pass++; else fail++;
}
function warning(name: string, detail: string) {
  console.log(`⚠️  WARN | ${name} — ${detail}`);
  warn++;
}

async function main() {
  console.log("\n━━━━━━ S/N 정합성 검증 — Production ━━━━━━\n");

  // 1. InventoryItem 마스터 — S/N 유일성
  const allItems = await prisma.inventoryItem.findMany({ select: { serialNumber: true, ownerType: true, archivedAt: true } });
  const dupSn = new Map<string, number>();
  for (const i of allItems) dupSn.set(i.serialNumber, (dupSn.get(i.serialNumber) ?? 0) + 1);
  const dupes = [...dupSn.entries()].filter(([, n]) => n > 1);
  check(`1. InventoryItem.serialNumber 유일성 (총 ${allItems.length})`, dupes.length === 0,
    dupes.length ? `중복 ${dupes.length}건: ${dupes.slice(0, 3).map(([sn, n]) => `${sn}×${n}`).join(", ")}` : "중복 0");

  // 2. InventoryTransaction.serialNumber → InventoryItem 존재 (txn 의 S/N이 마스터에 있어야)
  const txns = await prisma.inventoryTransaction.findMany({
    where: { serialNumber: { not: null } },
    select: { id: true, serialNumber: true, txnType: true, referenceModule: true, subKind: true, performedAt: true },
    orderBy: { performedAt: "asc" },
  });
  const masterSnSet = new Set(allItems.map((i) => i.serialNumber));
  const orphanTxns = txns.filter((t) => !masterSnSet.has(t.serialNumber!));
  check(`2. InventoryTransaction.serialNumber → InventoryItem 존재 (총 ${txns.length})`, orphanTxns.length === 0,
    orphanTxns.length ? `orphan ${orphanTxns.length}건` : "orphan 0");

  // 3. ItContractEquipment.serialNumber 가 활성 자산에 있어야 (또는 archived 됐어도 마스터에 존재)
  const itEqs = await prisma.itContractEquipment.findMany({ select: { serialNumber: true, removedAt: true } });
  const itEqSns = new Set(itEqs.map((e) => e.serialNumber));
  const activeEqs = itEqs.filter((e) => !e.removedAt);
  const eqOrphans = activeEqs.filter((e) => !masterSnSet.has(e.serialNumber));
  check(`3. ItContractEquipment(active).serialNumber → InventoryItem (총 ${activeEqs.length})`, eqOrphans.length === 0,
    eqOrphans.length ? `orphan ${eqOrphans.slice(0, 3).map((e) => e.serialNumber).join(", ")}` : "orphan 0");

  // 4. TmRentalItem.serialNumber → InventoryItem 또는 외부 자산 (느슨함 — TM은 LOOSE check)
  const tmItems = await prisma.tmRentalItem.findMany({ select: { serialNumber: true } });
  const tmOrphans = tmItems.filter((t) => !masterSnSet.has(t.serialNumber));
  if (tmOrphans.length > 0) warning(`4. TmRentalItem.serialNumber 마스터 미존재 (LOOSE 정책)`, `${tmOrphans.length}/${tmItems.length} 외부 자산 가능성`);
  else check(`4. TmRentalItem.serialNumber → InventoryItem (총 ${tmItems.length})`, true, "전부 마스터 등록");

  // 5. PurchaseItem.serialNumber → InventoryItem (매입한 S/N은 마스터에 있어야)
  const purItems = await prisma.purchaseItem.findMany({ where: { serialNumber: { not: null } }, select: { serialNumber: true, purchase: { select: { purchaseNumber: true } } } });
  const purOrphans = purItems.filter((p) => !masterSnSet.has(p.serialNumber!));
  check(`5. PurchaseItem.serialNumber → InventoryItem (총 ${purItems.length} — S/N 있는 라인만)`, purOrphans.length === 0,
    purOrphans.length ? `orphan ${purOrphans.length}건 (예: ${purOrphans[0].purchase.purchaseNumber}/${purOrphans[0].serialNumber})` : "orphan 0");

  // 6. SalesItem.serialNumber → InventoryItem (판매한 S/N도 마스터에 있어야 — TRADE는 archive 됐을 수 있음)
  const slsItems = await prisma.salesItem.findMany({ where: { serialNumber: { not: null } }, select: { serialNumber: true, sales: { select: { salesNumber: true } } } });
  const slsOrphans = slsItems.filter((s) => !masterSnSet.has(s.serialNumber!));
  check(`6. SalesItem.serialNumber → InventoryItem (총 ${slsItems.length} — S/N 있는 라인만)`, slsOrphans.length === 0,
    slsOrphans.length ? `orphan ${slsOrphans.slice(0, 3).map((s) => `${s.sales.salesNumber}/${s.serialNumber}`).join(", ")}` : "orphan 0");

  // 7. AsTicket.serialNumber → InventoryItem (외부 고객 자산 가능 → LOOSE)
  const asTickets = await prisma.asTicket.findMany({ where: { serialNumber: { not: null } }, select: { serialNumber: true, ticketNumber: true } });
  const asOrphans = asTickets.filter((a) => !masterSnSet.has(a.serialNumber!));
  if (asOrphans.length > 0) warning(`7. AsTicket.serialNumber 마스터 미존재 (LOOSE)`, `${asOrphans.length}/${asTickets.length} 고객 자산 가능성 (예: ${asOrphans.slice(0, 2).map((a) => `${a.ticketNumber}/${a.serialNumber}`).join(", ")})`);
  else check(`7. AsTicket.serialNumber → InventoryItem (총 ${asTickets.length})`, true, "전부 마스터");

  // 8. AsDispatch.targetEquipmentSN → InventoryItem (LOOSE)
  const dispatches = await prisma.asDispatch.findMany({ where: { targetEquipmentSN: { not: null } }, select: { targetEquipmentSN: true } });
  const dpOrphans = dispatches.filter((d) => !masterSnSet.has(d.targetEquipmentSN!));
  if (dpOrphans.length > 0) warning(`8. AsDispatch.targetEquipmentSN 마스터 미존재`, `${dpOrphans.length}/${dispatches.length}`);
  else check(`8. AsDispatch.targetEquipmentSN → InventoryItem (총 ${dispatches.length})`, true, "전부 마스터");

  // 9. AsDispatchPart.targetEquipmentSN → InventoryItem (LOOSE)
  const dpParts = await prisma.asDispatchPart.findMany({ where: { targetEquipmentSN: { not: "" } }, select: { targetEquipmentSN: true } });
  const dppOrphans = dpParts.filter((d) => d.targetEquipmentSN && !masterSnSet.has(d.targetEquipmentSN));
  if (dppOrphans.length > 0) warning(`9. AsDispatchPart.targetEquipmentSN 마스터 미존재`, `${dppOrphans.length}/${dpParts.length}`);
  else check(`9. AsDispatchPart.targetEquipmentSN → InventoryItem (총 ${dpParts.length})`, true, "전부 마스터");

  // 10. SnmpReading.serialNumber → ItContractEquipment.serialNumber 일치 확인 (장비별 카운터)
  const snmpRows = await prisma.snmpReading.findMany({ select: { serialNumber: true, equipment: { select: { serialNumber: true } } } });
  const snmpMis = snmpRows.filter((r) => r.serialNumber && r.equipment.serialNumber && r.serialNumber !== r.equipment.serialNumber);
  check(`10. SnmpReading.serialNumber = ItContractEquipment.serialNumber (총 ${snmpRows.length})`, snmpMis.length === 0,
    snmpMis.length ? `mismatch ${snmpMis.length}건` : "100% 일치");

  // 11. UsageConfirmation.equipmentUsage[].sn → ItContractEquipment.serialNumber (해당 contract 안에서)
  const ucs = await prisma.usageConfirmation.findMany({ select: { confirmCode: true, contractId: true, equipmentUsage: true } });
  let ucMis = 0;
  for (const uc of ucs) {
    const usage = uc.equipmentUsage as any[];
    if (!Array.isArray(usage)) continue;
    const contractEqs = await prisma.itContractEquipment.findMany({ where: { itContractId: uc.contractId }, select: { serialNumber: true } });
    const eqSet = new Set(contractEqs.map((e) => e.serialNumber));
    for (const u of usage) {
      if (u.sn && !eqSet.has(u.sn)) ucMis++;
    }
  }
  check(`11. UsageConfirmation.equipmentUsage S/N → 계약 장비 일치 (UC ${ucs.length}건)`, ucMis === 0,
    ucMis ? `mismatch ${ucMis}건` : "100% 일치");

  // 12. YieldAnalysis → ItContractEquipment 존재 + 그 장비 S/N이 마스터에 추적 가능
  const yields = await prisma.yieldAnalysis.findMany({ select: { equipment: { select: { serialNumber: true } } } });
  const yOrphans = yields.filter((y) => !y.equipment.serialNumber || (!masterSnSet.has(y.equipment.serialNumber) && !itEqSns.has(y.equipment.serialNumber)));
  check(`12. YieldAnalysis.equipment.serialNumber 추적 가능 (총 ${yields.length})`, yOrphans.length === 0,
    yOrphans.length ? `orphan ${yOrphans.length}건` : "전부 추적");

  // 13. AssetDepreciation.serialNumber → InventoryItem 또는 ItContractEquipment
  const deps = await prisma.assetDepreciation.findMany({ select: { serialNumber: true } });
  const depOrphans = deps.filter((d) => !masterSnSet.has(d.serialNumber) && !itEqSns.has(d.serialNumber));
  check(`13. AssetDepreciation.serialNumber 추적 가능 (총 ${deps.length})`, depOrphans.length === 0,
    depOrphans.length ? `orphan ${depOrphans.length}건` : "orphan 0");

  // 14. InventoryTransaction.txnType vs InventoryItem.archivedAt 일관성
  // OUT/SALE/ARCHIVE 트랜잭션이 있는 S/N의 InventoryItem 은 archived 되어야 함 (정상 흐름)
  const archivedItems = allItems.filter((i) => i.archivedAt);
  const archivedSns = new Set(archivedItems.map((i) => i.serialNumber));
  // archived 된 S/N의 마지막 트랜잭션이 OUT/RETURN/SALE/LOSS/SPLIT 인지
  const lastTxnBySn = new Map<string, typeof txns[number]>();
  for (const t of txns) {
    if (!t.serialNumber) continue;
    const cur = lastTxnBySn.get(t.serialNumber);
    if (!cur || cur.performedAt < t.performedAt) lastTxnBySn.set(t.serialNumber, t);
  }
  let archiveMis = 0;
  for (const sn of archivedSns) {
    const last = lastTxnBySn.get(sn);
    if (!last) continue; // 시드 자산은 트랜잭션 없을 수 있음
    if (last.txnType !== "OUT") archiveMis++;
  }
  check(`14. archived S/N 의 마지막 트랜잭션이 OUT 형 (총 archived ${archivedSns.size})`, archiveMis === 0,
    archiveMis ? `위반 ${archiveMis}건` : "정합");

  // 15. 외부 자산(EXTERNAL_CLIENT)은 ownerClientId 필수
  const extItems = allItems.filter((i) => i.ownerType === "EXTERNAL_CLIENT");
  const fullExt = await prisma.inventoryItem.findMany({ where: { ownerType: "EXTERNAL_CLIENT" }, select: { serialNumber: true, ownerClientId: true } });
  const noOwner = fullExt.filter((i) => !i.ownerClientId);
  check(`15. EXTERNAL_CLIENT 자산은 ownerClientId 필수 (총 ${extItems.length})`, noOwner.length === 0,
    noOwner.length ? `미설정 ${noOwner.length}건` : "전부 설정");

  // 16. 매입 → 마스터 NEW 흐름 — TRADE/PURCHASE 트랜잭션이 있는 S/N은 마스터 존재 + ownerType=COMPANY
  const purchaseTxns = txns.filter((t) => t.referenceModule === "TRADE" && t.subKind === "PURCHASE" && t.txnType === "IN");
  const purSnsTV = purchaseTxns.map((t) => t.serialNumber!).filter(Boolean);
  const purSnSet = new Set(purSnsTV);
  const purItemRows = await prisma.inventoryItem.findMany({ where: { serialNumber: { in: [...purSnSet] } }, select: { serialNumber: true, ownerType: true } });
  const wrongOwner = purItemRows.filter((i) => i.ownerType !== "COMPANY");
  check(`16. PURCHASE 트랜잭션의 S/N 은 ownerType=COMPANY (총 ${purSnSet.size})`, wrongOwner.length === 0,
    wrongOwner.length ? `위반 ${wrongOwner.length}건` : "전부 COMPANY");

  // 17. 외부 자산 입고 (REPAIR_REQUEST / DEMO_BORROW 등)는 ownerType=EXTERNAL_CLIENT
  const externalInTxns = txns.filter((t) => t.txnType === "IN" && (
    (t.referenceModule === "REPAIR" && t.subKind === "REQUEST") ||
    (t.referenceModule === "CALIB" && t.subKind === "REQUEST") ||
    (t.referenceModule === "DEMO" && t.subKind === "BORROW") ||
    (t.referenceModule === "RENTAL" && t.subKind === "BORROW")
  ));
  const externalSns = [...new Set(externalInTxns.map((t) => t.serialNumber!).filter(Boolean))];
  if (externalSns.length > 0) {
    const extRows = await prisma.inventoryItem.findMany({ where: { serialNumber: { in: externalSns } }, select: { serialNumber: true, ownerType: true } });
    const wrongExtOwner = extRows.filter((i) => i.ownerType !== "EXTERNAL_CLIENT");
    check(`17. 외부 자산 입고 S/N 은 ownerType=EXTERNAL_CLIENT (총 ${externalSns.length})`, wrongExtOwner.length === 0,
      wrongExtOwner.length ? `위반 ${wrongExtOwner.length}건` : "전부 EXTERNAL_CLIENT");
  } else {
    check(`17. 외부 자산 입고 S/N 정합성`, true, "외부 자산 트랜잭션 없음 (스킵)");
  }

  // 18. AsDispatchPart.inventoryTxnId → 실제 InventoryTransaction 존재
  const dpWithTxn = await prisma.asDispatchPart.findMany({ where: { inventoryTxnId: { not: null } }, select: { inventoryTxnId: true } });
  const dpTxnIds = dpWithTxn.map((d) => d.inventoryTxnId!);
  const existingTxns = await prisma.inventoryTransaction.count({ where: { id: { in: dpTxnIds } } });
  check(`18. AsDispatchPart.inventoryTxnId → InventoryTransaction (총 ${dpWithTxn.length})`, existingTxns === dpWithTxn.length,
    `매칭 ${existingTxns}/${dpWithTxn.length}`);

  // 19. AsDispatchPart 의 부품 S/N 은 마스터에 있을 수도 없을 수도 (소모품 출고는 S/N 없음)
  const dpAll = await prisma.asDispatchPart.findMany({ select: { id: true, serialNumber: true, quantity: true } });
  const partsWithSn = dpAll.filter((d) => d.serialNumber);
  const partSnOrphans = partsWithSn.filter((d) => !masterSnSet.has(d.serialNumber!));
  if (partSnOrphans.length > 0) warning(`19. AsDispatchPart.serialNumber (부품 자체 S/N) 마스터 미존재`, `${partSnOrphans.length}/${partsWithSn.length} (소모품은 S/N 추적 안 할 수 있음)`);
  else check(`19. AsDispatchPart.serialNumber → InventoryItem (S/N 있는 ${partsWithSn.length}건)`, true, "정합");

  // 20. 동일 S/N 의 트랜잭션 시간 순서 합리성 검증 (간단)
  // 매입(IN) 후 매출/반환(OUT) 이어야 — 첫 트랜잭션이 OUT 이면 의심
  const snTxnSeqs = new Map<string, typeof txns[number][]>();
  for (const t of txns) {
    if (!t.serialNumber) continue;
    if (!snTxnSeqs.has(t.serialNumber)) snTxnSeqs.set(t.serialNumber, []);
    snTxnSeqs.get(t.serialNumber)!.push(t);
  }
  let outFirstCount = 0;
  for (const [sn, ts] of snTxnSeqs) {
    if (ts[0].txnType === "OUT") outFirstCount++;
  }
  if (outFirstCount > 0) warning(`20. S/N 트랜잭션 첫 행이 OUT 인 경우 (정상은 IN 시작)`, `${outFirstCount}/${snTxnSeqs.size} (외부 자산 출고 또는 사후 시드 가능)`);
  else check(`20. S/N 트랜잭션 시간 순서 (IN 부터 시작)`, true, "정합");

  console.log(`\n━━━━━━ 결과 ━━━━━━ pass=${pass} fail=${fail} warn=${warn}\n`);
  await prisma.$disconnect();
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error("❌", e); process.exit(2); });
