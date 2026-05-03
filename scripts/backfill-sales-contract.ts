// 매출 → IT계약/TM렌탈 FK 백필.
// itContractId/tmRentalId 가 NULL 인 RENTAL 유형 매출(Project.salesType=RENTAL_OA / RENTAL_TM)
// 을 거래처+기간 기반으로 자동 매칭.
//
// 매칭 규칙:
//   - 매출의 clientId 와 일치하는 활성 계약 (ItContract.clientId / TmRental.clientId)
//   - 매출의 billingMonth 또는 usagePeriodStart 가 계약 기간 (startDate ≤ X ≤ endDate, endDate=null 면 무한) 안에 있어야 함
//   - 다중 매칭 시 가장 최근 startDate 우선
//   - OA(IT) vs TM: project.salesType 으로 구분
//
// 매칭 불가는 목록으로 출력 (수동 매칭 필요).
//
// 실행: npx tsx scripts/backfill-sales-contract.ts [--dry-run]

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const DRY = process.argv.includes("--dry-run");

async function main() {
  console.log(`[backfill-sales-contract] ${DRY ? "DRY-RUN" : "LIVE"} start`);

  // 대상: itContractId NULL + tmRentalId NULL + project.salesType IN (RENTAL_OA, RENTAL_TM)
  const candidates = await prisma.sales.findMany({
    where: {
      deletedAt: null,
      itContractId: null,
      tmRentalId: null,
      project: { salesType: "RENTAL" },
    },
    select: {
      id: true, salesNumber: true, clientId: true, billingMonth: true, usagePeriodStart: true,
      project: { select: { salesType: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`  대상 매출: ${candidates.length}건`);
  if (candidates.length === 0) { await prisma.$disconnect(); return; }

  let oaMatched = 0, tmMatched = 0;
  const unmatched: typeof candidates = [];

  for (const sale of candidates) {
    const periodDate = sale.billingMonth ?? sale.usagePeriodStart;
    if (!periodDate) { unmatched.push(sale); continue; }

    // ItContract 우선 매칭 — 더 일반적인 OA(IT) 렌탈
    const contracts = await prisma.itContract.findMany({
      where: {
        clientId: sale.clientId,
        deletedAt: null,
        startDate: { lte: periodDate },
        OR: [{ endDate: null }, { endDate: { gte: periodDate } }],
      },
      orderBy: { startDate: "desc" },
      take: 1,
      select: { id: true, contractNumber: true },
    });
    if (contracts.length > 0) {
      if (!DRY) await prisma.sales.update({ where: { id: sale.id }, data: { itContractId: contracts[0].id } });
      console.log(`  ✓ ${sale.salesNumber} → IT ${contracts[0].contractNumber}`);
      oaMatched++;
      continue;
    }

    // 없으면 TmRental fallback
    const rentals = await prisma.tmRental.findMany({
      where: {
        clientId: sale.clientId,
        deletedAt: null,
        startDate: { lte: periodDate },
        OR: [{ endDate: null }, { endDate: { gte: periodDate } }],
      },
      orderBy: { startDate: "desc" },
      take: 1,
      select: { id: true, rentalCode: true },
    });
    if (rentals.length > 0) {
      if (!DRY) await prisma.sales.update({ where: { id: sale.id }, data: { tmRentalId: rentals[0].id } });
      console.log(`  ✓ ${sale.salesNumber} → TM ${rentals[0].rentalCode}`);
      tmMatched++;
    } else {
      unmatched.push(sale);
    }
  }

  console.log(`\n[backfill-sales-contract] 완료${DRY ? " (dry-run, no writes)" : ""}`);
  console.log(`  OA 매칭: ${oaMatched}`);
  console.log(`  TM 매칭: ${tmMatched}`);
  console.log(`  매칭 불가: ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log(`\n  ── 매칭 불가 목록 (수동 매칭 필요) ──`);
    for (const u of unmatched) {
      console.log(`  ✗ ${u.salesNumber} (clientId=${u.clientId}, period=${(u.billingMonth ?? u.usagePeriodStart)?.toISOString().slice(0, 10) ?? "—"}, type=${u.project?.salesType})`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
