import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
(async () => {
  const r = await prisma.yieldAnalysis.deleteMany({});
  console.log("deleted", r.count, "yieldAnalysis rows");
  // 시드의 잘못된 SNMP end-reading (2026-04-01) 도 삭제 → 재시드 시 새 끝값으로 upsert
  const old = await prisma.snmpReading.deleteMany({
    where: { collectedAt: new Date("2026-04-01T00:00:00.000Z") }
  });
  console.log("deleted", old.count, "stale SNMP readings");
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
