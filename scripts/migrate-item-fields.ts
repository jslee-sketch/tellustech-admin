// category → description 백필 + 토너/드럼 colorChannel 매핑.
// schema push 직전에 실행 (category 가 아직 살아있어야 함).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1) description 컬럼이 아직 없을 수 있음 → 우선 raw SQL 로 추가 (멱등).
  await prisma.$executeRawUnsafe(
    `ALTER TABLE items ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`,
  );
  // 2) category 컬럼이 살아있다면 거기서 복사 (한 번만).
  await prisma.$executeRawUnsafe(
    `UPDATE items SET description = COALESCE(category, '') WHERE description = '' AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='category')`,
  ).catch(() => undefined);
  // 3) colorChannel enum 컬럼이 없으면 추가 (멱등). 이후 prisma db push 가 enum 타입 보장.
  await prisma.$executeRawUnsafe(
    `DO $$ BEGIN
       CREATE TYPE "ColorChannel" AS ENUM ('BLACK','CYAN','MAGENTA','YELLOW','DRUM','FUSER','NONE');
     EXCEPTION WHEN duplicate_object THEN null;
     END $$;`,
  ).catch(() => undefined);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE items ADD COLUMN IF NOT EXISTS "colorChannel" "ColorChannel"`,
  );
  // 4) BOM 컬럼들 (멱등).
  await prisma.$executeRawUnsafe(`ALTER TABLE items ADD COLUMN IF NOT EXISTS "parentItemId" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE items ADD COLUMN IF NOT EXISTS "bomQuantity" NUMERIC(10,2) DEFAULT 1`);
  await prisma.$executeRawUnsafe(`ALTER TABLE items ADD COLUMN IF NOT EXISTS "bomLevel" INTEGER DEFAULT 0`);
  await prisma.$executeRawUnsafe(`ALTER TABLE items ADD COLUMN IF NOT EXISTS "bomNote" TEXT`);

  // 5) 토너/드럼 colorChannel 매핑 (이름 패턴).
  const items = await prisma.item.findMany({ select: { id: true, name: true, colorChannel: true } });
  let updated = 0;
  for (const it of items) {
    if (it.colorChannel) continue;
    const n = it.name.toLowerCase();
    let ch: "BLACK" | "CYAN" | "MAGENTA" | "YELLOW" | "DRUM" | "FUSER" | "NONE" | null = null;
    if (/cyan/i.test(n)) ch = "CYAN";
    else if (/magenta/i.test(n)) ch = "MAGENTA";
    else if (/yellow/i.test(n)) ch = "YELLOW";
    else if (/(drum)/i.test(n)) ch = "DRUM";
    else if (/(fuser)/i.test(n)) ch = "FUSER";
    else if (/(black|toner.*black|흑백)/i.test(n)) ch = "BLACK";
    if (ch) {
      await prisma.item.update({ where: { id: it.id }, data: { colorChannel: ch } });
      updated++;
    }
  }
  console.log(`✓ description backfilled, ${updated} items mapped to colorChannel`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
