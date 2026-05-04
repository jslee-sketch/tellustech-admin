import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  const total = await prisma.inventoryTransaction.count();
  const outNoTo = await prisma.inventoryTransaction.count({ where: { txnType: "OUT", toWarehouseId: null } });
  const outWithTo = await prisma.inventoryTransaction.count({ where: { txnType: "OUT", toWarehouseId: { not: null } } });
  const inNoTo = await prisma.inventoryTransaction.count({ where: { txnType: "IN", toWarehouseId: null } });
  const inWithTo = await prisma.inventoryTransaction.count({ where: { txnType: "IN", toWarehouseId: { not: null } } });
  const transferNoTo = await prisma.inventoryTransaction.count({ where: { txnType: "TRANSFER", toWarehouseId: null } });
  console.log("총 트랜잭션:", total);
  console.log("OUT toWarehouse NULL :", outNoTo, "/ 비NULL:", outWithTo);
  console.log("IN  toWarehouse NULL :", inNoTo, "/ 비NULL:", inWithTo);
  console.log("TRANSFER toWh NULL   :", transferNoTo);
  // 샘플
  const samples = await prisma.inventoryTransaction.findMany({
    where: { OR: [{ txnType: "IN", toWarehouseId: null }, { txnType: "TRANSFER", toWarehouseId: null }] },
    take: 5, select: { id: true, txnType: true, referenceModule: true, subKind: true, serialNumber: true, createdAt: true },
  });
  console.log("샘플 (toWh NULL 인 IN/TRANSFER):");
  for (const s of samples) console.log(`  ${s.createdAt.toISOString().slice(0,10)} ${s.txnType} ${s.referenceModule}/${s.subKind} ${s.serialNumber}`);
  await prisma.$disconnect();
})();
