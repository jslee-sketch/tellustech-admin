import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  // 전체 TV JournalEntry status별 카운트
  const all = await prisma.journalEntry.findMany({
    where: { companyCode: "TV" },
    select: { entryNo: true, status: true, source: true, entryDate: true },
  });
  console.log("TV 전체 JE:", all.length);
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  for (const e of all) {
    byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
    bySource[e.source] = (bySource[e.source] ?? 0) + 1;
    const m = e.entryDate.toISOString().slice(0, 7);
    byMonth[m] = (byMonth[m] ?? 0) + 1;
  }
  console.log("status:", byStatus);
  console.log("source:", bySource);
  console.log("month :", byMonth);

  // JE-100-* 외 JE도 확인
  const non100 = all.filter(e => !e.entryNo.startsWith("JE-100-"));
  console.log("\nNon-100 JE 샘플 (10):");
  for (const e of non100.slice(0, 10)) console.log(`  ${e.entryNo.padEnd(28)} ${e.status} ${e.source} ${e.entryDate.toISOString().slice(0, 10)}`);

  // VR도
  const vr = await prisma.journalEntry.count({ where: { companyCode: "VR" } });
  console.log("VR 전체 JE:", vr);

  await prisma.$disconnect();
})();
