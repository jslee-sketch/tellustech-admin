import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  const all = await prisma.inventoryItem.findMany({ where: { serialNumber: { startsWith: "SN100-" } }, select: { serialNumber: true, archivedAt: true, ownerType: true, status: true } });
  console.log("총 S/N (-100-) =", all.length);
  for (const i of all) console.log(`  ${i.serialNumber.padEnd(28)} owner=${i.ownerType.padEnd(15)} archived=${i.archivedAt ? "Y" : "N"} status=${i.status}`);
  await prisma.$disconnect();
})();
