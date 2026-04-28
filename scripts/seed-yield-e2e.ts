// E2E 시나리오 시드 — 5개 IT계약 + 장비 + AS 출동 + 부품 투입 + SNMP 카운터.
// 실행: npx tsx scripts/seed-yield-e2e.ts
//
// 시나리오:
//   1) KORTECH  · X7500 · 5%  · BW 토너1개 + C/M/Y 각 1개 · SNMP BW 27000 / Color 13500 → 🟢 90%
//   2) HPM      · D330  · 5%  · BW 토너 3개 · SNMP BW 45000 → 🟡 60%
//   3) WELSTORY · X7500 · 5%  · BW 토너 5개 + C/M/Y 각 3개 · SNMP BW 30000 / Color 9000 → 🔴 20% (부정)
//   4) SAMSUNG  · D330  · 5%  · BW 토너 1개 · SNMP BW 32500 → 🔵 130%
//   5) CANON    · X7500 · 10% · BW 토너 2개 · SNMP BW 25500 → 🟢 85% (상밀도 보정)
//
// 기간: 2026-01-01 ~ 2026-04-01 (3개월)

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PERIOD_START = new Date("2026-01-01T00:00:00.000Z");
const PERIOD_END = new Date("2026-03-31T23:00:00.000Z"); // 3월 말 — 월별 cron 의 lte 와 일치하도록

type Scenario = {
  clientCode: string;
  clientName: string;
  contractNum: string;
  productItemCode: string;       // 장비 품목
  serialNumber: string;
  actualCoverage: number;
  bwTonerItemCode: string;
  bwTonerQty: number;
  colorTonerItemCodes?: string[]; // [C, M, Y]
  colorTonerQty?: number;
  snmpBw: number;
  snmpColor: number;
};

const SCENARIOS: Scenario[] = [
  { clientCode: "KORTECH",  clientName: "KORTECH",  contractNum: "TLS-260101-001",
    productItemCode: "ITM-Y-X7500", serialNumber: "SN-X7500-K001", actualCoverage: 5,
    bwTonerItemCode: "ITM-Y-TBLK-X7500", bwTonerQty: 1,
    colorTonerItemCodes: ["ITM-Y-TCYAN-X7500", "ITM-Y-TMAG-X7500", "ITM-Y-TYEL-X7500"], colorTonerQty: 1,
    snmpBw: 27000, snmpColor: 13500 },
  { clientCode: "HPM",      clientName: "HPM",      contractNum: "TLS-260101-002",
    productItemCode: "ITM-Y-D330", serialNumber: "SN-D330-H001", actualCoverage: 5,
    bwTonerItemCode: "ITM-Y-TBLK-D330", bwTonerQty: 3,
    snmpBw: 45000, snmpColor: 0 },
  { clientCode: "WELSTORY", clientName: "WELSTORY", contractNum: "TLS-260101-003",
    productItemCode: "ITM-Y-X7500", serialNumber: "SN-X7500-W001", actualCoverage: 5,
    bwTonerItemCode: "ITM-Y-TBLK-X7500", bwTonerQty: 5,
    colorTonerItemCodes: ["ITM-Y-TCYAN-X7500", "ITM-Y-TMAG-X7500", "ITM-Y-TYEL-X7500"], colorTonerQty: 3,
    snmpBw: 30000, snmpColor: 9000 },
  { clientCode: "SAMSUNG",  clientName: "SAMSUNG",  contractNum: "TLS-260101-004",
    productItemCode: "ITM-Y-D330", serialNumber: "SN-D330-S001", actualCoverage: 5,
    bwTonerItemCode: "ITM-Y-TBLK-D330", bwTonerQty: 1,
    snmpBw: 32500, snmpColor: 0 },
  { clientCode: "CANON",    clientName: "CANON",    contractNum: "TLS-260101-005",
    productItemCode: "ITM-Y-X7500", serialNumber: "SN-X7500-C001", actualCoverage: 10,
    bwTonerItemCode: "ITM-Y-TBLK-X7500", bwTonerQty: 2,
    snmpBw: 25500, snmpColor: 0 },
];

const ITEM_DEFS: { code: string; name: string; itemType: "PRODUCT" | "CONSUMABLE"; expectedYield?: number }[] = [
  { code: "ITM-Y-D330",         name: "Sindoh D330 Copier (E2E)",  itemType: "PRODUCT" },
  { code: "ITM-Y-X7500",        name: "Samsung X7500 Printer (E2E)", itemType: "PRODUCT" },
  { code: "ITM-Y-TBLK-D330",    name: "Black Toner D330 (E2E)",     itemType: "CONSUMABLE", expectedYield: 25000 },
  { code: "ITM-Y-TBLK-X7500",   name: "Black Toner X7500 (E2E)",    itemType: "CONSUMABLE", expectedYield: 30000 },
  { code: "ITM-Y-TCYAN-X7500",  name: "Cyan Toner X7500 (E2E)",     itemType: "CONSUMABLE", expectedYield: 15000 },
  { code: "ITM-Y-TMAG-X7500",   name: "Magenta Toner X7500 (E2E)",  itemType: "CONSUMABLE", expectedYield: 15000 },
  { code: "ITM-Y-TYEL-X7500",   name: "Yellow Toner X7500 (E2E)",   itemType: "CONSUMABLE", expectedYield: 15000 },
  { code: "ITM-Y-DRUM-D330",    name: "Drum Unit D330 (E2E)",       itemType: "CONSUMABLE", expectedYield: 80000 },
  { code: "ITM-Y-DRUM-X7500",   name: "Drum Unit X7500 (E2E)",      itemType: "CONSUMABLE", expectedYield: 100000 },
];

async function ensureItem(code: string, name: string, itemType: "PRODUCT" | "CONSUMABLE", expectedYield?: number) {
  const existing = await prisma.item.findUnique({ where: { itemCode: code } });
  if (existing) {
    if (expectedYield !== undefined) {
      await prisma.item.update({
        where: { id: existing.id },
        data: { expectedYield, yieldCoverageBase: 5, yieldUnit: "pages" },
      });
    }
    return existing;
  }
  return prisma.item.create({
    data: {
      itemCode: code,
      itemType,
      name,
      unit: "ea",
      category: itemType === "PRODUCT" ? "Printer" : "Toner",
      ...(expectedYield !== undefined ? { expectedYield, yieldCoverageBase: 5, yieldUnit: "pages" } : {}),
    },
  });
}

async function ensureClient(code: string, nameVi: string) {
  const existing = await prisma.client.findUnique({ where: { clientCode: code } });
  if (existing) return existing;
  return prisma.client.create({
    data: {
      clientCode: code,
      companyNameVi: nameVi,
      companyNameKo: nameVi,
    },
  });
}

async function ensureSysEmployee() {
  const code = "TNV-001";
  const ex = await prisma.employee.findFirst({ where: { employeeCode: code } });
  if (ex) return ex;
  // 시드는 이미 employee 가 있어야 정상. 비상시 fallback.
  return prisma.employee.create({
    data: { employeeCode: code, companyCode: "TV", nameVi: "System User" },
  });
}

async function main() {
  console.log("🌱 Seeding yield E2E scenarios...");

  // 1) 품목 시드
  for (const d of ITEM_DEFS) {
    await ensureItem(d.code, d.name, d.itemType, d.expectedYield);
  }
  console.log(`  ✓ items: ${ITEM_DEFS.length}`);

  const sys = await ensureSysEmployee();

  for (const sc of SCENARIOS) {
    console.log(`\n--- ${sc.clientCode} (${sc.contractNum}) ---`);
    const client = await ensureClient(sc.clientCode, sc.clientName);

    // 2) IT계약
    let contract = await prisma.itContract.findFirst({ where: { contractNumber: sc.contractNum } });
    if (!contract) {
      contract = await prisma.itContract.create({
        data: {
          contractNumber: sc.contractNum,
          clientId: client.id,
          status: "ACTIVE",
          startDate: new Date("2025-12-01"),
          endDate: new Date("2027-12-01"),
          installationAddress: `${sc.clientName} HQ`,
        },
      });
      console.log(`  ✓ contract created`);
    } else {
      console.log(`  · contract exists`);
    }

    // 3) 장비
    const productItem = await prisma.item.findUnique({ where: { itemCode: sc.productItemCode } });
    if (!productItem) throw new Error("missing product item");
    let eq = await prisma.itContractEquipment.findFirst({
      where: { itContractId: contract.id, serialNumber: sc.serialNumber },
    });
    if (!eq) {
      eq = await prisma.itContractEquipment.create({
        data: {
          itContractId: contract.id,
          itemId: productItem.id,
          serialNumber: sc.serialNumber,
          installedAt: new Date("2025-12-01"),
          actualCoverage: sc.actualCoverage,
        },
      });
      console.log(`  ✓ equipment created (coverage=${sc.actualCoverage}%)`);
    } else {
      await prisma.itContractEquipment.update({
        where: { id: eq.id },
        data: { actualCoverage: sc.actualCoverage },
      });
      console.log(`  · equipment exists`);
    }

    // 4) SNMP 카운터 — 시작/끝 두 건 (delta 가 시나리오 출력량)
    await prisma.snmpReading.upsert({
      where: { equipmentId_collectedAt: { equipmentId: eq.id, collectedAt: PERIOD_START } },
      update: {},
      create: {
        equipmentId: eq.id,
        contractId: contract.id,
        clientId: client.id,
        brand: "Test", itemName: productItem.name, serialNumber: sc.serialNumber,
        totalPages: 0, bwPages: 0, colorPages: 0,
        collectedAt: PERIOD_START, collectedBy: "MANUAL",
        companyCode: "TV",
      },
    });
    await prisma.snmpReading.upsert({
      where: { equipmentId_collectedAt: { equipmentId: eq.id, collectedAt: PERIOD_END } },
      update: {
        totalPages: sc.snmpBw + sc.snmpColor,
        bwPages: sc.snmpBw,
        colorPages: sc.snmpColor,
      },
      create: {
        equipmentId: eq.id,
        contractId: contract.id,
        clientId: client.id,
        brand: "Test", itemName: productItem.name, serialNumber: sc.serialNumber,
        totalPages: sc.snmpBw + sc.snmpColor,
        bwPages: sc.snmpBw,
        colorPages: sc.snmpColor,
        collectedAt: PERIOD_END, collectedBy: "MANUAL",
        companyCode: "TV",
      },
    });
    console.log(`  ✓ SNMP readings (BW ${sc.snmpBw}, Color ${sc.snmpColor})`);

    // 5) AS Ticket + Dispatch + Parts
    const ticketNumber = `26/03/01-${sc.clientCode.slice(0, 2)}`;
    let ticket = await prisma.asTicket.findUnique({ where: { ticketNumber } }).catch(() => null);
    if (!ticket) {
      ticket = await prisma.asTicket.create({
        data: {
          ticketNumber,
          clientId: client.id,
          serialNumber: sc.serialNumber,
          status: "COMPLETED",
          receivedAt: new Date("2026-03-01"),
          completedAt: new Date("2026-03-15"),
        },
      });
    }
    let dispatch = await prisma.asDispatch.findFirst({
      where: { asTicketId: ticket.id, targetEquipmentSN: sc.serialNumber },
    });
    if (!dispatch) {
      dispatch = await prisma.asDispatch.create({
        data: {
          asTicketId: ticket.id,
          dispatchEmployeeId: sys.id,
          targetEquipmentSN: sc.serialNumber,
          completedAt: new Date("2026-03-15"),
        },
      });
    }

    // 기존 parts 제거 후 재생성 (멱등)
    await prisma.asDispatchPart.deleteMany({ where: { asDispatchId: dispatch.id } });

    const bwToner = await prisma.item.findUnique({ where: { itemCode: sc.bwTonerItemCode } });
    if (bwToner) {
      await prisma.asDispatchPart.create({
        data: {
          asDispatchId: dispatch.id,
          itemId: bwToner.id,
          quantity: sc.bwTonerQty,
          targetEquipmentSN: sc.serialNumber,
          targetContractId: contract.id,
        },
      });
    }
    if (sc.colorTonerItemCodes && sc.colorTonerQty) {
      for (const code of sc.colorTonerItemCodes) {
        const ct = await prisma.item.findUnique({ where: { itemCode: code } });
        if (!ct) continue;
        await prisma.asDispatchPart.create({
          data: {
            asDispatchId: dispatch.id,
            itemId: ct.id,
            quantity: sc.colorTonerQty,
            targetEquipmentSN: sc.serialNumber,
            targetContractId: contract.id,
          },
        });
      }
    }
    console.log(`  ✓ AS dispatch parts (BW x${sc.bwTonerQty}${sc.colorTonerQty ? `, Color x${sc.colorTonerQty}*3` : ""})`);
  }

  console.log("\n✅ E2E seed complete");
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
