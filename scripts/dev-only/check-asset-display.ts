import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  // 1) 자사 자산 + 외부 렌탈 중 (currentLocationClientId NOT NULL + ownerType=COMPANY)
  console.log("=== 1) 자사 자산이 외부 렌탈 중 ===");
  const ownAtExt = await prisma.inventoryItem.findMany({
    where: { ownerType: "COMPANY", currentLocationClientId: { not: null }, archivedAt: null },
    select: { serialNumber: true, item: { select: { itemCode: true, name: true } }, warehouse: { select: { code: true, name: true, warehouseType: true } }, currentLocationClientId: true, status: true, ownerType: true },
    take: 5,
  });
  for (const i of ownAtExt) {
    const loc = i.currentLocationClientId ? await prisma.client.findUnique({ where: { id: i.currentLocationClientId }, select: { clientCode: true, companyNameVi: true } }) : null;
    console.log(`  ${i.serialNumber.padEnd(28)} ${i.item.itemCode.padEnd(14)} owner=${i.ownerType.padEnd(15)} warehouse=${i.warehouse.code} (${i.warehouse.warehouseType}) currentAt=${loc?.clientCode}/${loc?.companyNameVi}`);
  }
  if (ownAtExt.length === 0) console.log("  (없음 — currentLocationClientId 셋팅된 자사 자산이 없음)");

  // 2) 외부 자산이 외주 위탁 중 (EXTERNAL_CLIENT + currentLocationClientId NOT NULL)
  console.log("\n=== 2) 외부(거래처) 자산이 외주 수리/교정 중 ===");
  const extAtVendor = await prisma.inventoryItem.findMany({
    where: { ownerType: "EXTERNAL_CLIENT", currentLocationClientId: { not: null }, archivedAt: null },
    select: { serialNumber: true, item: { select: { itemCode: true, name: true } }, warehouse: { select: { code: true, name: true } }, ownerClientId: true, currentLocationClientId: true, inboundReason: true, ownerType: true },
    take: 5,
  });
  for (const i of extAtVendor) {
    const owner = i.ownerClientId ? await prisma.client.findUnique({ where: { id: i.ownerClientId }, select: { clientCode: true, companyNameVi: true } }) : null;
    const loc = i.currentLocationClientId ? await prisma.client.findUnique({ where: { id: i.currentLocationClientId }, select: { clientCode: true, companyNameVi: true } }) : null;
    console.log(`  ${i.serialNumber.padEnd(28)} ${i.item.itemCode.padEnd(14)} owner=${owner?.clientCode}/${owner?.companyNameVi} reason=${i.inboundReason} currentAt=${loc?.clientCode}/${loc?.companyNameVi}`);
  }
  if (extAtVendor.length === 0) console.log("  (없음)");

  // 3) 외부 자산이 자사 보관 중 (EXTERNAL_CLIENT + currentLocationClientId NULL)
  console.log("\n=== 3) 외부(거래처) 자산이 자사 보관 중 (수리 의뢰 받은 상태) ===");
  const extInStock = await prisma.inventoryItem.findMany({
    where: { ownerType: "EXTERNAL_CLIENT", currentLocationClientId: null, archivedAt: null },
    select: { serialNumber: true, item: { select: { itemCode: true } }, warehouse: { select: { code: true, name: true } }, ownerClientId: true, inboundReason: true, ownerType: true },
    take: 3,
  });
  for (const i of extInStock) {
    const owner = i.ownerClientId ? await prisma.client.findUnique({ where: { id: i.ownerClientId }, select: { clientCode: true, companyNameVi: true } }) : null;
    console.log(`  ${i.serialNumber.padEnd(28)} ${i.item.itemCode.padEnd(14)} owner=${owner?.clientCode}/${owner?.companyNameVi} reason=${i.inboundReason} warehouse=${i.warehouse.code}`);
  }
  if (extInStock.length === 0) console.log("  (없음)");

  // 4) 동일 S/N의 모든 트랜잭션 흐름 — 첫번째 자사재고 외부 렌탈 케이스
  if (ownAtExt[0]) {
    const sn = ownAtExt[0].serialNumber;
    console.log(`\n=== ${sn} 의 모든 입출고 트랜잭션 ===`);
    const txns = await prisma.inventoryTransaction.findMany({
      where: { serialNumber: sn },
      orderBy: { performedAt: "asc" },
      select: { performedAt: true, txnType: true, referenceModule: true, subKind: true, fromWarehouse: { select: { code: true } }, toWarehouse: { select: { code: true } }, client: { select: { clientCode: true, companyNameVi: true } }, note: true },
    });
    for (const t of txns) {
      console.log(`  ${t.performedAt.toISOString().slice(0,16)} ${t.txnType.padEnd(9)} ${t.referenceModule}/${t.subKind} from=${t.fromWarehouse?.code ?? "-"} to=${t.toWarehouse?.code ?? "-"} client=${t.client?.clientCode ?? "-"} note="${t.note?.slice(0,30) ?? ""}"`);
    }
  }
  // 5) 외부 자산 케이스도
  if (extAtVendor[0]) {
    const sn = extAtVendor[0].serialNumber;
    console.log(`\n=== ${sn} (외부자산 외주위탁 중) 의 모든 입출고 ===`);
    const txns = await prisma.inventoryTransaction.findMany({
      where: { serialNumber: sn },
      orderBy: { performedAt: "asc" },
      select: { performedAt: true, txnType: true, referenceModule: true, subKind: true, fromWarehouse: { select: { code: true } }, toWarehouse: { select: { code: true } }, client: { select: { clientCode: true } }, note: true },
    });
    for (const t of txns) {
      console.log(`  ${t.performedAt.toISOString().slice(0,16)} ${t.txnType.padEnd(9)} ${t.referenceModule}/${t.subKind} from=${t.fromWarehouse?.code ?? "-"} to=${t.toWarehouse?.code ?? "-"} client=${t.client?.clientCode ?? "-"}`);
    }
  } else if (extInStock[0]) {
    const sn = extInStock[0].serialNumber;
    console.log(`\n=== ${sn} (외부자산 자사보관) 의 모든 입출고 ===`);
    const txns = await prisma.inventoryTransaction.findMany({
      where: { serialNumber: sn },
      orderBy: { performedAt: "asc" },
      select: { performedAt: true, txnType: true, referenceModule: true, subKind: true, fromWarehouse: { select: { code: true } }, toWarehouse: { select: { code: true } }, client: { select: { clientCode: true } }, note: true },
    });
    for (const t of txns) {
      console.log(`  ${t.performedAt.toISOString().slice(0,16)} ${t.txnType.padEnd(9)} ${t.referenceModule}/${t.subKind} from=${t.fromWarehouse?.code ?? "-"} to=${t.toWarehouse?.code ?? "-"} client=${t.client?.clientCode ?? "-"}`);
    }
  }
  await prisma.$disconnect();
})();
