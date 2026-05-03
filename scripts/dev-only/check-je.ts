import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  const all = await prisma.journalEntry.findMany({
    where: { entryNo: { startsWith: "JE-100-" } },
    select: { entryNo: true, entryDate: true, status: true, source: true, companyCode: true },
    orderBy: { entryNo: "asc" },
  });
  for (const j of all) console.log(`  ${j.entryNo.padEnd(28)} ${j.companyCode} ${j.status.padEnd(10)} ${j.source.padEnd(10)} ${j.entryDate.toISOString().slice(0,10)}`);
  console.log(`\nTotal=${all.length}`);
  await prisma.$disconnect();
})();
