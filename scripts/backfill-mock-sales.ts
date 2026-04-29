// 과거 월(여러 개) DRAFT 매출 일회성 백필.
// 실행: npx tsx scripts/backfill-mock-sales.ts 2026-01 2026-02 2026-03
//   또는 production: DATABASE_URL=... npx tsx scripts/backfill-mock-sales.ts 2026-01 2026-02
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ensureItDraftSales, ensureTmDraftSales } from "../src/lib/rental-mock-sales";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const months = process.argv.slice(2);
  if (months.length === 0) { console.error("usage: tsx scripts/backfill-mock-sales.ts YYYY-MM [...]"); process.exit(1); }

  for (const ym of months) {
    if (!/^\d{4}-\d{2}$/.test(ym)) { console.warn("skip invalid:", ym); continue; }
    const [y, m] = ym.split("-").map(Number);
    const billingMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    let it = 0, tm = 0, skipped = 0, errors = 0;

    const itContracts = await prisma.itContract.findMany({
      where: { status: "ACTIVE", startDate: { lte: monthEnd }, endDate: { gte: billingMonth }, terminatedAt: null },
      select: { id: true },
    });
    for (const c of itContracts) {
      try {
        const r = await ensureItDraftSales(c.id, billingMonth);
        if (r.created) it++; else skipped++;
      } catch (e) { errors++; console.error("IT", c.id, e); }
    }
    const tms = await prisma.tmRental.findMany({
      where: { startDate: { lte: monthEnd }, endDate: { gte: billingMonth }, terminatedAt: null },
      select: { id: true },
    });
    for (const r of tms) {
      try {
        const x = await ensureTmDraftSales(r.id, billingMonth);
        if (x.created) tm++; else skipped++;
      } catch (e) { errors++; console.error("TM", r.id, e); }
    }
    console.log(`${ym}: IT=${it} TM=${tm} skipped=${skipped} errors=${errors}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
