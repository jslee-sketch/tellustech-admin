import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  const tables = ["notificationRule","pointConfig","accountingConfig","portalBanner","quoteRequest","portalFeedback","yieldAnalysis","usageConfirmation","snmpReading"];
  for (const t of tables) {
    try { console.log(t.padEnd(22), "=", await (prisma as any)[t].count()); }
    catch (e: any) { console.log(t.padEnd(22), "= ERR", String(e.message ?? e).slice(0, 80)); }
  }
  // sample existing chartOfAccount codes
  const codes = await prisma.chartOfAccount.findMany({ where: { companyCode: "TV" }, select: { code: true, nameKo: true }, orderBy: { code: "asc" }, take: 30 });
  console.log("ChartOfAccount TV (30):", codes.map(c => `${c.code}=${c.nameKo}`).join(", "));
  await prisma.$disconnect();
})();
