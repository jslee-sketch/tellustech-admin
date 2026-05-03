import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  const codes = ["112", "131", "156", "211", "214", "331", "334", "411", "421", "511", "5111", "5113", "5117", "632", "641", "642"];
  const rows = await prisma.chartOfAccount.findMany({
    where: { companyCode: "TV", code: { in: codes } },
    select: { code: true, nameKo: true, type: true, isLeaf: true, isActive: true },
    orderBy: { code: "asc" },
  });
  console.log("ChartOfAccount (TV) — 핵심 코드 isLeaf 확인:");
  for (const r of rows) console.log(`  ${r.code.padEnd(6)} ${r.type.padEnd(10)} isLeaf=${r.isLeaf} isActive=${r.isActive} ${r.nameKo}`);
  // 511 사용 분개 라인 카운트
  const lines = await prisma.journalLine.groupBy({
    by: ["accountCode"], where: { companyCode: "TV", accountCode: { in: codes } },
    _count: { _all: true },
  });
  console.log("\nJournalLine (TV) — 코드별 라인 수:");
  for (const l of lines) console.log(`  ${l.accountCode.padEnd(6)} = ${l._count._all}`);
  await prisma.$disconnect();
})();
