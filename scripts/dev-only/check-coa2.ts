import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  const all = await prisma.chartOfAccount.findMany({
    where: { companyCode: "TV" },
    select: { code: true, nameKo: true, type: true, isLeaf: true },
    orderBy: { code: "asc" },
  });
  console.log(`COA TV total=${all.length}, leaf=${all.filter(a => a.isLeaf).length}`);
  for (const a of all) console.log(`  ${a.code.padEnd(8)} ${a.type.padEnd(10)} leaf=${a.isLeaf} ${a.nameKo}`);
  await prisma.$disconnect();
})();
