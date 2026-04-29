// E2E 데이터 정합성 검증 — 카운트·합계·교차 검증.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [
    clients, employees, items, warehouses, contracts, equipments, tmRentals, tmItems,
    purchases, sales, prs, paid, partial, asTickets, asParts, expenses, readings,
    yieldRows, fraudRows, compats, bomChildren,
  ] = await Promise.all([
    prisma.client.count({ where: { clientCode: { startsWith: "CL-E2E-" } } }),
    prisma.employee.count({ where: { employeeCode: { startsWith: "EMP-E2E-" } } }),
    prisma.item.count({ where: { itemCode: { startsWith: "ITM-E2E-" } } }),
    prisma.warehouse.count({ where: { code: { startsWith: "WH-" } } }),
    prisma.itContract.count({ where: { contractNumber: { startsWith: "TLS-E2E-" } } }),
    prisma.itContractEquipment.count({ where: { itContract: { contractNumber: { startsWith: "TLS-E2E-" } } } }),
    prisma.tmRental.count({ where: { rentalCode: { startsWith: "TM-E2E-" } } }),
    prisma.tmRentalItem.count({ where: { tmRental: { rentalCode: { startsWith: "TM-E2E-" } } } }),
    prisma.purchase.count({ where: { purchaseNumber: { startsWith: "PUR-E2E-" } } }),
    prisma.sales.count({ where: { salesNumber: { startsWith: "SLS-E2E-" } } }),
    prisma.payableReceivable.count({ where: { OR: [{ sales: { salesNumber: { startsWith: "SLS-E2E-" } } }, { purchase: { purchaseNumber: { startsWith: "PUR-E2E-" } } }] } }),
    prisma.payableReceivable.count({ where: { status: "PAID", sales: { salesNumber: { startsWith: "SLS-E2E-" } } } }),
    prisma.payableReceivable.count({ where: { status: "PARTIAL", sales: { salesNumber: { startsWith: "SLS-E2E-" } } } }),
    prisma.asTicket.count({ where: { ticketNumber: { startsWith: "AS-E2E-" } } }),
    prisma.asDispatchPart.count({ where: { asDispatch: { asTicket: { ticketNumber: { startsWith: "AS-E2E-" } } } } }),
    prisma.expense.count({ where: { expenseCode: { startsWith: "EXP-E2E-" } } }),
    prisma.snmpReading.count({ where: { equipment: { itContract: { contractNumber: { startsWith: "TLS-E2E-" } } } } }),
    prisma.yieldAnalysis.count({}),
    prisma.yieldAnalysis.count({ where: { isFraudSuspect: true } }),
    prisma.itemCompatibility.count({ where: { OR: [{ product: { itemCode: { startsWith: "ITM-E2E-" } } }, { consumable: { itemCode: { startsWith: "ITM-E2E-" } } }] } }),
    prisma.item.count({ where: { itemCode: { startsWith: "ITM-E2E-" }, parentItemId: { not: null } } }),
  ]);

  console.log("\n=== E2E 시드 검증 결과 ===");
  console.log(`거래처:           ${clients} (목표 10)  ${clients === 10 ? "✓" : "✗"}`);
  console.log(`직원:             ${employees} (목표 10)  ${employees === 10 ? "✓" : "✗"}`);
  console.log(`품목:             ${items} (목표 15)  ${items === 15 ? "✓" : "✗"}`);
  console.log(`창고:             ${warehouses} (목표 ≥5) ${warehouses >= 5 ? "✓" : "✗"}`);
  console.log(`IT 계약:          ${contracts} (목표 5)  ${contracts === 5 ? "✓" : "✗"}`);
  console.log(`IT 장비:          ${equipments} (목표 9)  ${equipments === 9 ? "✓" : "✗"}`);
  console.log(`TM 렌탈:          ${tmRentals} (목표 5)  ${tmRentals === 5 ? "✓" : "✗"}`);
  console.log(`TM 라인:          ${tmItems} (목표 7)  ${tmItems === 7 ? "✓" : "✗"}`);
  console.log(`매입:             ${purchases} (목표 10)  ${purchases === 10 ? "✓" : "✗"}`);
  console.log(`매출:             ${sales} (목표 10)  ${sales === 10 ? "✓" : "✗"}`);
  console.log(`미수/지급:        ${prs} (목표 ≥10) ${prs >= 10 ? "✓" : "✗"}  PAID=${paid}/PARTIAL=${partial}`);
  console.log(`AS 티켓:          ${asTickets} (목표 10)  ${asTickets === 10 ? "✓" : "✗"}`);
  console.log(`AS 부품:          ${asParts} (목표 ≥10)`);
  console.log(`비용:             ${expenses} (목표 10)  ${expenses === 10 ? "✓" : "✗"}`);
  console.log(`SNMP readings:    ${readings} (목표 27)  ${readings === 27 ? "✓" : "✗"}`);
  console.log(`적정율 분석:      ${yieldRows}  부정 의심 ${fraudRows}건 (WELSTORY 포함 기대)`);
  console.log(`호환 매핑:        ${compats}  BOM 자식: ${bomChildren} (목표 2)  ${bomChildren === 2 ? "✓" : "✗"}`);

  // 적정율 결과 — 시나리오별
  const yieldByContract = await prisma.yieldAnalysis.findMany({
    where: { contract: { contractNumber: { startsWith: "TLS-E2E-" } } },
    include: { contract: { select: { contractNumber: true, client: { select: { clientCode: true } } } }, equipment: { select: { serialNumber: true } } },
    orderBy: { yieldRateBw: "asc" },
  });
  console.log("\n=== 적정율 분석 결과 ===");
  for (const y of yieldByContract) {
    const tag = y.isFraudSuspect ? "🔴" : y.badgeBw === "BLUE" ? "🔵" : y.badgeBw === "GREEN" ? "🟢" : y.badgeBw === "YELLOW" ? "🟡" : "🟠";
    console.log(`  ${tag} ${y.contract.contractNumber} · ${y.contract.client.clientCode} · ${y.equipment.serialNumber} → BW ${y.yieldRateBw}% [${y.badgeBw}]${y.yieldRateColor !== null ? ` Color ${y.yieldRateColor}% [${y.badgeColor}]` : ""}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
