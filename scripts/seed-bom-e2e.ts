// BOM + 호환 시연용 시드 — Fuser A'ssy 1단 + 하위 부품 2단계.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function ensure(code: string, itemType: "PRODUCT"|"CONSUMABLE"|"PART", name: string, description: string, colorChannel?: "BLACK"|"CYAN"|"MAGENTA"|"YELLOW"|"DRUM"|"FUSER"|"NONE") {
  const ex = await prisma.item.findUnique({ where: { itemCode: code } });
  const data = { itemCode: code, itemType, name, description, unit: "EA", colorChannel: colorChannel ?? null };
  if (ex) return prisma.item.update({ where: { id: ex.id }, data });
  return prisma.item.create({ data });
}

async function main() {
  // Fuser A'ssy
  const fuser = await ensure("ITM-FUSER-D330", "PART", "Fuser Unit D330 (E2E)", "D330 퓨저 어셈블리", "FUSER");
  // 자식 (Level 2)
  const roller = await ensure("ITM-FUSE-ROLL", "PART", "Fuser Roller", "퓨저 가열 롤러", "NONE");
  const pressure = await ensure("ITM-FUSE-PRESS", "PART", "Pressure Roller", "퓨저 압력 롤러", "NONE");
  const thermistor = await ensure("ITM-FUSE-THERM", "PART", "Thermistor", "퓨저 온도 센서", "NONE");
  // 손자 (Level 3)
  const core = await ensure("ITM-FUSE-CORE", "PART", "Roller Core", "롤러 코어 (금속)", "NONE");
  const sleeve = await ensure("ITM-FUSE-SLEEVE", "PART", "Teflon Sleeve", "테플론 코팅 슬리브", "NONE");

  // BOM 연결: Fuser → Roller, Pressure, Thermistor (Level 1 → 2)
  await prisma.item.update({ where: { id: roller.id },     data: { parentItemId: fuser.id, bomLevel: 2, bomQuantity: 1 } });
  await prisma.item.update({ where: { id: pressure.id },   data: { parentItemId: fuser.id, bomLevel: 2, bomQuantity: 1 } });
  await prisma.item.update({ where: { id: thermistor.id }, data: { parentItemId: fuser.id, bomLevel: 2, bomQuantity: 1 } });
  // Roller → Core, Sleeve (Level 2 → 3)
  await prisma.item.update({ where: { id: core.id },   data: { parentItemId: roller.id, bomLevel: 3, bomQuantity: 1 } });
  await prisma.item.update({ where: { id: sleeve.id }, data: { parentItemId: roller.id, bomLevel: 3, bomQuantity: 1 } });

  // Fuser 자체에 bomLevel=1 (A'ssy)
  await prisma.item.update({ where: { id: fuser.id }, data: { bomLevel: 1 } });

  // E2E 의 D330 PRODUCT 와 호환 매핑.
  const d330 = await prisma.item.findUnique({ where: { itemCode: "ITM-Y-D330" } });
  if (d330) {
    for (const part of [fuser, roller, pressure, thermistor]) {
      await prisma.itemCompatibility.upsert({
        where: { productItemId_consumableItemId: { productItemId: d330.id, consumableItemId: part.id } },
        update: {},
        create: { productItemId: d330.id, consumableItemId: part.id },
      });
    }
  }

  console.log("✓ BOM seed done: Fuser A'ssy with 3 sub-parts + 2 grand-children");
}

main().catch(console.error).finally(() => prisma.$disconnect());
