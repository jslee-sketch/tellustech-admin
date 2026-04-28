// WELSTORY 거래처에 RENTAL 매출 1건 시드 → 매출 리스트에 적정율 뱃지 출력 확인
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // RENTAL 프로젝트 (있으면 사용, 없으면 생성)
  let project = await prisma.project.findFirst({
    where: { companyCode: "TV", salesType: "RENTAL" },
  });
  if (!project) {
    project = await prisma.project.create({
      data: { companyCode: "TV", projectCode: "PRJ-RENTAL-001", name: "Rental Default", salesType: "RENTAL" },
    });
  }

  for (const code of ["WELSTORY", "KORTECH", "HPM", "SAMSUNG", "CANON"]) {
    const client = await prisma.client.findUnique({ where: { clientCode: code } });
    if (!client) continue;
    const num = `SLS-Y-${code.slice(0, 4)}`;
    const ex = await prisma.sales.findUnique({ where: { salesNumber: num } }).catch(() => null);
    if (ex) { console.log(`· exists ${num}`); continue; }
    await prisma.sales.create({
      data: {
        salesNumber: num,
        clientId: client.id,
        projectId: project.id,
        totalAmount: 1000000,
        currency: "VND",
        fxRate: 1,
      },
    });
    console.log(`✓ ${num} → ${code}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
