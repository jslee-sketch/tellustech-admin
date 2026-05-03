// 전체 E2E 시드 — Step 1~13 한 번에. 멱등(upsert/예외 무시).
// 실행: npx tsx scripts/seed-e2e-full.ts
//   또는 production: DATABASE_URL=... npx tsx scripts/seed-e2e-full.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const log = (s: string) => console.log(s);

// ────────── Step 0: cleanup E2E 시드 흔적 ──────────
async function cleanupOld() {
  log("Step 0: cleanup");
  // 적정율 분석·헬스 체크는 보존하지 않고 재계산.
  await prisma.yieldAnalysis.deleteMany({}).catch(() => undefined);
  // E2E 시드는 prefix(E2E)로 식별.
  await prisma.snmpReading.deleteMany({ where: { equipment: { itContract: { contractNumber: { startsWith: "TLS-E2E-" } } } } }).catch(() => undefined);
  await prisma.usageConfirmation.deleteMany({ where: { contract: { contractNumber: { startsWith: "TLS-E2E-" } } } }).catch(() => undefined);
  await prisma.asDispatchPart.deleteMany({ where: { asDispatch: { asTicket: { ticketNumber: { startsWith: "AS-E2E-" } } } } }).catch(() => undefined);
  await prisma.asDispatch.deleteMany({ where: { asTicket: { ticketNumber: { startsWith: "AS-E2E-" } } } }).catch(() => undefined);
  await prisma.asTicket.deleteMany({ where: { ticketNumber: { startsWith: "AS-E2E-" } } }).catch(() => undefined);
  await prisma.prPayment.deleteMany({ where: { payableReceivable: { OR: [{ sales: { salesNumber: { startsWith: "SLS-E2E-" } } }, { purchase: { purchaseNumber: { startsWith: "PUR-E2E-" } } }] } } }).catch(() => undefined);
  await prisma.payableReceivable.deleteMany({ where: { OR: [{ sales: { salesNumber: { startsWith: "SLS-E2E-" } } }, { purchase: { purchaseNumber: { startsWith: "PUR-E2E-" } } }] } }).catch(() => undefined);
  await prisma.salesItem.deleteMany({ where: { sales: { salesNumber: { startsWith: "SLS-E2E-" } } } }).catch(() => undefined);
  await prisma.sales.deleteMany({ where: { salesNumber: { startsWith: "SLS-E2E-" } } }).catch(() => undefined);
  await prisma.purchaseItem.deleteMany({ where: { purchase: { purchaseNumber: { startsWith: "PUR-E2E-" } } } }).catch(() => undefined);
  await prisma.purchase.deleteMany({ where: { purchaseNumber: { startsWith: "PUR-E2E-" } } }).catch(() => undefined);
  await prisma.expense.deleteMany({ where: { expenseCode: { startsWith: "EXP-E2E-" } } }).catch(() => undefined);
  await prisma.tmRentalItem.deleteMany({ where: { tmRental: { rentalCode: { startsWith: "TM-E2E-" } } } }).catch(() => undefined);
  await prisma.tmRental.deleteMany({ where: { rentalCode: { startsWith: "TM-E2E-" } } }).catch(() => undefined);
  await prisma.itContractEquipment.deleteMany({ where: { itContract: { contractNumber: { startsWith: "TLS-E2E-" } } } }).catch(() => undefined);
  await prisma.itContract.deleteMany({ where: { contractNumber: { startsWith: "TLS-E2E-" } } }).catch(() => undefined);
  await prisma.inventoryTransaction.deleteMany({ where: { item: { itemCode: { startsWith: "ITM-E2E-" } } } }).catch(() => undefined);
  await prisma.inventoryItem.deleteMany({ where: { item: { itemCode: { startsWith: "ITM-E2E-" } } } }).catch(() => undefined);
}

// ────────── Step 1-3: clients ──────────
const CLIENTS = [
  { code: "CL-E2E-001", ko: "코르텍 비나",       vi: "KORTECH VINA",      en: "KORTECH VINA",      addr: "Bac Ninh, Lot A1 VSIP",   pt: 30 },
  { code: "CL-E2E-002", ko: "HPM 베트남",        vi: "HPM Vietnam",       en: "HPM Vietnam",       addr: "HCM, D7 PMH",             pt: 30 },
  { code: "CL-E2E-003", ko: "웰스토리 비나",     vi: "WELSTORY VINA",     en: "WELSTORY VINA",     addr: "BN, Yen Phong IP",        pt: 45 },
  { code: "CL-E2E-004", ko: "삼성전자 베트남",   vi: "Samsung Vietnam",   en: "Samsung Vietnam",   addr: "BN, SEV Factory",         pt: 30 },
  { code: "CL-E2E-005", ko: "캐논 베트남",       vi: "Canon Vietnam",     en: "Canon Vietnam",     addr: "HN, Thang Long IP",       pt: 60 },
  { code: "CL-E2E-006", ko: "부산철강",          vi: "BUSAN Steel Vina",  en: "BUSAN Steel Vina",  addr: "DN, Hoa Khanh IP",        pt: 30 },
  { code: "CL-E2E-007", ko: "LG전자 하이퐁",     vi: "LG HP",             en: "LG Haiphong",       addr: "HP, DEEP C IP",           pt: 30 },
  { code: "CL-E2E-008", ko: "현대모비스",        vi: "Hyundai Mobis VN",  en: "Hyundai Mobis VN",  addr: "NT, Nhon Trach IP",       pt: 45 },
  { code: "CL-E2E-009", ko: "도요타 비나",       vi: "Toyota Vina",       en: "Toyota Vina",       addr: "HCM, SHTP",               pt: 30 },
  { code: "CL-E2E-010", ko: "포스코 베트남",     vi: "POSCO Vietnam",     en: "POSCO Vietnam",     addr: "BN, Que Vo IP",           pt: 30 },
];

async function seedClients() {
  log("Step 1-1: clients (10)");
  for (let i = 0; i < CLIENTS.length; i++) {
    const c = CLIENTS[i];
    await prisma.client.upsert({
      where: { clientCode: c.code },
      update: { companyNameVi: c.vi, companyNameKo: c.ko, companyNameEn: c.en, address: c.addr, paymentTerms: c.pt, phone: `0901234${String(i + 1).padStart(3, "0")}` },
      create: { clientCode: c.code, companyNameVi: c.vi, companyNameKo: c.ko, companyNameEn: c.en, address: c.addr, paymentTerms: c.pt, phone: `0901234${String(i + 1).padStart(3, "0")}` },
    });
  }
}

// ────────── Step 1-2: departments + employees + users ──────────
async function seedDeptEmployees() {
  log("Step 1-2: departments + employees + users (10)");
  // departments
  const deptDefs = [
    { code: "MGMT", name: "Management", company: "TV" },
    { code: "SALES", name: "Sales", company: "TV" },
    { code: "TECH", name: "Technical", company: "TV" },
    { code: "ACCT", name: "Accounting", company: "TV" },
    { code: "MGMT-VR", name: "Management", company: "VR" },
    { code: "TECH-VR", name: "Technical", company: "VR" },
    { code: "SALES-VR", name: "Sales", company: "VR" },
  ] as const;
  const deptIds: Record<string, string> = {};
  for (const d of deptDefs) {
    const ex = await prisma.department.findFirst({ where: { code: d.code, companyCode: d.company } });
    const row = ex
      ? await prisma.department.update({ where: { id: ex.id }, data: { name: d.name } })
      : await prisma.department.create({ data: { companyCode: d.company, code: d.code, name: d.name, branchType: "BN" } });
    deptIds[`${d.company}-${d.code}`] = row.id;
  }

  const emps = [
    { code: "EMP-E2E-001", name: "Admin Lee", role: "ADMIN" as const, dept: "TV-MGMT", company: "TV" as const },
    { code: "EMP-E2E-002", name: "Ms. Binh", role: "EMPLOYEE" as const, dept: "TV-SALES", company: "TV" as const },
    { code: "EMP-E2E-003", name: "Ms. Duyen", role: "EMPLOYEE" as const, dept: "TV-SALES", company: "TV" as const },
    { code: "EMP-E2E-004", name: "Khang", role: "EMPLOYEE" as const, dept: "TV-TECH", company: "TV" as const },
    { code: "EMP-E2E-005", name: "Thiet", role: "EMPLOYEE" as const, dept: "TV-TECH", company: "TV" as const },
    { code: "EMP-E2E-006", name: "Linh", role: "EMPLOYEE" as const, dept: "TV-TECH", company: "TV" as const },
    { code: "EMP-E2E-007", name: "Loc", role: "EMPLOYEE" as const, dept: "TV-TECH", company: "TV" as const },
    { code: "EMP-E2E-008", name: "Mr. Tuan", role: "MANAGER" as const, dept: "VR-SALES-VR", company: "VR" as const },
    { code: "EMP-E2E-009", name: "Hai", role: "EMPLOYEE" as const, dept: "VR-TECH-VR", company: "VR" as const },
    { code: "EMP-E2E-010", name: "Ms. Hoa", role: "EMPLOYEE" as const, dept: "TV-ACCT", company: "TV" as const },
  ];
  const empMap: Record<string, string> = {}; // employeeCode → id
  for (let i = 0; i < emps.length; i++) {
    const e = emps[i];
    const phone = `0911${String(i + 1).padStart(3, "0")}`;
    const ex = await prisma.employee.findFirst({ where: { employeeCode: e.code } });
    const row = ex
      ? await prisma.employee.update({ where: { id: ex.id }, data: { nameVi: e.name, departmentId: deptIds[e.dept], phone } })
      : await prisma.employee.create({ data: { employeeCode: e.code, companyCode: e.company, nameVi: e.name, departmentId: deptIds[e.dept], phone, hireDate: new Date("2025-01-01") } });
    empMap[e.code] = row.id;
  }
  return { empMap };
}

// ────────── Step 1-3: warehouses ──────────
async function seedWarehouses() {
  log("Step 1-3: warehouses (5)");
  const whs = [
    { code: "WH-ITMAIN", name: "IT Main Stock", type: "INTERNAL" as const },
    { code: "WH-TMAIN", name: "TM Main Stock", type: "INTERNAL" as const },
    { code: "WH-HNIT", name: "HN IT Branch", type: "INTERNAL" as const },
    { code: "WH-EXT-KORTECH", name: "KORTECH External", type: "EXTERNAL" as const },
    { code: "WH-EXT-SAMSUNG", name: "Samsung External", type: "EXTERNAL" as const },
  ];
  const map: Record<string, string> = {};
  for (const w of whs) {
    const r = await prisma.warehouse.upsert({
      where: { code: w.code },
      update: { name: w.name, warehouseType: w.type },
      create: { code: w.code, name: w.name, warehouseType: w.type },
    });
    map[w.code] = r.id;
  }
  return map;
}

// ────────── Step 1-4: items ──────────
const ITEMS = [
  { code: "ITM-E2E-001", type: "PRODUCT" as const, name: "Sindoh D330", desc: "D330 A3 컬러 복합기", unit: "EA" },
  { code: "ITM-E2E-002", type: "PRODUCT" as const, name: "Samsung SL-X7500", desc: "X7500 A3 컬러 복합기", unit: "EA" },
  { code: "ITM-E2E-003", type: "PRODUCT" as const, name: "Sindoh D410", desc: "D410 A3 흑백 복합기", unit: "EA" },
  { code: "ITM-E2E-004", type: "PRODUCT" as const, name: "Keysight E5071C", desc: "네트워크 분석기 ENA", unit: "EA" },
  { code: "ITM-E2E-005", type: "PRODUCT" as const, name: "Keysight N9020B", desc: "신호 분석기 MXA", unit: "EA" },
  { code: "ITM-E2E-006", type: "CONSUMABLE" as const, name: "Black Toner D330", desc: "D330/D320 호환 흑백 토너 25000장", unit: "EA", expectedYield: 25000, colorChannel: "BLACK" as const, compat: ["ITM-E2E-001"] },
  { code: "ITM-E2E-007", type: "CONSUMABLE" as const, name: "Cyan Toner X7500", desc: "X7500 시안 토너 15000장", unit: "EA", expectedYield: 15000, colorChannel: "CYAN" as const, compat: ["ITM-E2E-002"] },
  { code: "ITM-E2E-008", type: "CONSUMABLE" as const, name: "Magenta Toner X7500", desc: "X7500 마젠타 토너 15000장", unit: "EA", expectedYield: 15000, colorChannel: "MAGENTA" as const, compat: ["ITM-E2E-002"] },
  { code: "ITM-E2E-009", type: "CONSUMABLE" as const, name: "Yellow Toner X7500", desc: "X7500 옐로 토너 15000장", unit: "EA", expectedYield: 15000, colorChannel: "YELLOW" as const, compat: ["ITM-E2E-002"] },
  { code: "ITM-E2E-010", type: "CONSUMABLE" as const, name: "Black Toner X7500", desc: "X7500 흑백 토너 30000장", unit: "EA", expectedYield: 30000, colorChannel: "BLACK" as const, compat: ["ITM-E2E-002"] },
  { code: "ITM-E2E-011", type: "PART" as const, name: "Drum Unit D330", desc: "D330 드럼 유닛 80000장", unit: "EA", expectedYield: 80000, colorChannel: "DRUM" as const, compat: ["ITM-E2E-001"] },
  { code: "ITM-E2E-012", type: "PART" as const, name: "Fuser Unit D330", desc: "D330 퓨저 어셈블리", unit: "EA", colorChannel: "FUSER" as const, compat: ["ITM-E2E-001"] },
  { code: "ITM-E2E-013", type: "PART" as const, name: "Fuser Roller", desc: "퓨저 가열 롤러 (D330 BOM)", unit: "EA", colorChannel: "NONE" as const, parent: "ITM-E2E-012" },
  { code: "ITM-E2E-014", type: "PART" as const, name: "Teflon Sleeve", desc: "테플론 코팅 슬리브 (D330 BOM)", unit: "EA", colorChannel: "NONE" as const, parent: "ITM-E2E-012" },
  { code: "ITM-E2E-015", type: "CONSUMABLE" as const, name: "A4 Paper", desc: "A4 복사용지 80g 500매/박스", unit: "BOX", colorChannel: "NONE" as const, compat: ["ITM-E2E-001", "ITM-E2E-002"] },
];

async function seedItems() {
  log("Step 1-4: items (15)");
  const ids: Record<string, string> = {};
  for (const it of ITEMS) {
    const data = {
      itemType: it.type,
      name: it.name,
      description: it.desc,
      unit: it.unit,
      ...(it.type !== "PRODUCT"
        ? { colorChannel: it.colorChannel, expectedYield: (it as any).expectedYield ?? null, yieldCoverageBase: 5 }
        : {}),
    };
    const row = await prisma.item.upsert({
      where: { itemCode: it.code },
      update: data,
      create: { itemCode: it.code, ...data },
    });
    ids[it.code] = row.id;
  }
  // 호환 매핑
  log("Step 1-6: compat mapping");
  for (const it of ITEMS) {
    if (it.type === "PRODUCT") continue;
    for (const productCode of (it as any).compat ?? []) {
      const pid = ids[productCode];
      const cid = ids[it.code];
      if (!pid || !cid) continue;
      await prisma.itemCompatibility.upsert({
        where: { productItemId_consumableItemId: { productItemId: pid, consumableItemId: cid } },
        update: {},
        create: { productItemId: pid, consumableItemId: cid },
      }).catch(() => undefined);
    }
  }
  // BOM 부모 연결 — Fuser Unit (Level 1) → Roller/Sleeve (Level 2)
  log("Step 1-5: BOM (Fuser Unit → 2 children)");
  await prisma.item.update({ where: { id: ids["ITM-E2E-012"] }, data: { bomLevel: 1 } });
  for (const childCode of ["ITM-E2E-013", "ITM-E2E-014"]) {
    await prisma.item.update({
      where: { id: ids[childCode] },
      data: { parentItemId: ids["ITM-E2E-012"], bomLevel: 2, bomQuantity: 1 },
    });
  }
  return ids;
}

// ────────── Step 2: IT 계약 ──────────
type ItContractCfg = { code: string; clientCode: string; salesEmpCode: string; equipments: { sn: string; itemCode: string; ip: string; deviceModel: string }[]; start: string; end: string; coverage: number };

const IT_CONTRACTS: ItContractCfg[] = [
  { code: "TLS-E2E-001", clientCode: "CL-E2E-001", salesEmpCode: "EMP-E2E-002", start: "2026-01-01", end: "2027-12-31", coverage: 5,
    equipments: [
      { sn: "SN-E2E-D330-001", itemCode: "ITM-E2E-001", ip: "192.168.1.10", deviceModel: "SINDOH_D330" },
      { sn: "SN-E2E-D330-002", itemCode: "ITM-E2E-001", ip: "192.168.1.11", deviceModel: "SINDOH_D330" },
      { sn: "SN-E2E-X7500-001", itemCode: "ITM-E2E-002", ip: "192.168.1.12", deviceModel: "SAMSUNG_X7500" },
    ] },
  { code: "TLS-E2E-002", clientCode: "CL-E2E-002", salesEmpCode: "EMP-E2E-002", start: "2026-02-01", end: "2027-01-31", coverage: 5,
    equipments: [
      { sn: "SN-E2E-D330-003", itemCode: "ITM-E2E-001", ip: "192.168.2.10", deviceModel: "SINDOH_D330" },
      { sn: "SN-E2E-D410-001", itemCode: "ITM-E2E-003", ip: "192.168.2.11", deviceModel: "SINDOH_D410" },
    ] },
  { code: "TLS-E2E-003", clientCode: "CL-E2E-003", salesEmpCode: "EMP-E2E-003", start: "2026-01-01", end: "2027-12-31", coverage: 5,
    equipments: [
      { sn: "SN-E2E-X7500-003", itemCode: "ITM-E2E-002", ip: "192.168.3.10", deviceModel: "SAMSUNG_X7500" },
      { sn: "SN-E2E-X7500-004", itemCode: "ITM-E2E-002", ip: "192.168.3.11", deviceModel: "SAMSUNG_X7500" },
    ] },
  { code: "TLS-E2E-004", clientCode: "CL-E2E-004", salesEmpCode: "EMP-E2E-003", start: "2026-03-01", end: "2027-02-28", coverage: 5,
    equipments: [
      { sn: "SN-E2E-D330-006", itemCode: "ITM-E2E-001", ip: "192.168.4.10", deviceModel: "SINDOH_D330" },
    ] },
  { code: "TLS-E2E-005", clientCode: "CL-E2E-005", salesEmpCode: "EMP-E2E-002", start: "2026-01-01", end: "2027-12-31", coverage: 10,
    equipments: [
      { sn: "SN-E2E-X7500-005", itemCode: "ITM-E2E-002", ip: "192.168.5.10", deviceModel: "SAMSUNG_X7500" },
    ] },
];

async function seedItContracts(itemIds: Record<string, string>) {
  log("Step 2: IT contracts (5) + equipment (9)");
  const map: Record<string, { contractId: string; equipments: Record<string, string> }> = {};
  for (const c of IT_CONTRACTS) {
    const client = await prisma.client.findUnique({ where: { clientCode: c.clientCode } });
    if (!client) continue;
    let contract = await prisma.itContract.findFirst({ where: { contractNumber: c.code } });
    if (!contract) {
      contract = await prisma.itContract.create({
        data: {
          contractNumber: c.code,
          clientId: client.id,
          status: "ACTIVE",
          startDate: new Date(c.start),
          endDate: new Date(c.end),
          installationAddress: client.address ?? "",
          snmpCollectDay: 25,
          contractMgrName: "Manager", contractMgrPhone: "0900000000",
        },
      });
    }
    const eqMap: Record<string, string> = {};
    for (const eq of c.equipments) {
      const isX7500 = eq.itemCode === "ITM-E2E-002";
      const isD410 = eq.itemCode === "ITM-E2E-003";
      const ex = await prisma.itContractEquipment.findFirst({ where: { itContractId: contract.id, serialNumber: eq.sn } });
      const data = {
        itemId: itemIds[eq.itemCode],
        deviceIp: eq.ip,
        deviceModel: eq.deviceModel,
        snmpCommunity: "public",
        actualCoverage: c.coverage,
        installCounterBw: 0,
        installCounterColor: 0,
        baseIncludedBw: isD410 ? 2000 : 1000,
        baseIncludedColor: isX7500 ? 200 : 0,
        extraRateBw: isD410 ? 300 : 500,
        extraRateColor: isX7500 ? 2000 : null,
        monthlyBaseFee: 800000,
        installedAt: new Date(c.start),
      };
      const row = ex
        ? await prisma.itContractEquipment.update({ where: { id: ex.id }, data })
        : await prisma.itContractEquipment.create({ data: { ...data, itContractId: contract.id, serialNumber: eq.sn } });
      eqMap[eq.sn] = row.id;
    }
    map[c.code] = { contractId: contract.id, equipments: eqMap };
  }
  return map;
}

// ────────── Step 3: TM rentals ──────────
async function seedTmRentals(itemIds: Record<string, string>) {
  log("Step 3: TM rentals (5)");
  const cfgs = [
    { code: "TM-E2E-001", clientCode: "CL-E2E-007", items: [{ itemCode: "ITM-E2E-004", sn: "TM-SN-E5071C-001", price: 5_000_000 }], start: "2026-01-01", end: "2026-06-30" },
    { code: "TM-E2E-002", clientCode: "CL-E2E-008", items: [{ itemCode: "ITM-E2E-005", sn: "TM-SN-N9020B-001", price: 4_000_000 }], start: "2026-02-01", end: "2026-07-31" },
    { code: "TM-E2E-003", clientCode: "CL-E2E-010", items: [{ itemCode: "ITM-E2E-004", sn: "TM-SN-E5071C-002", price: 5_500_000 }], start: "2026-03-01", end: "2026-08-31" },
    { code: "TM-E2E-004", clientCode: "CL-E2E-006", items: [
      { itemCode: "ITM-E2E-005", sn: "TM-SN-N9020B-002", price: 4_000_000 },
      { itemCode: "ITM-E2E-005", sn: "TM-SN-N9020B-003", price: 4_000_000 },
    ], start: "2026-01-01", end: "2026-12-31" },
    { code: "TM-E2E-005", clientCode: "CL-E2E-009", items: [
      { itemCode: "ITM-E2E-004", sn: "TM-SN-E5071C-003", price: 5_000_000 },
      { itemCode: "ITM-E2E-005", sn: "TM-SN-N9020B-004", price: 4_000_000 },
    ], start: "2026-04-01", end: "2026-09-30" },
  ];
  for (const c of cfgs) {
    const client = await prisma.client.findUnique({ where: { clientCode: c.clientCode } });
    if (!client) continue;
    let rental = await prisma.tmRental.findUnique({ where: { rentalCode: c.code } }).catch(() => null);
    if (!rental) {
      rental = await prisma.tmRental.create({
        data: {
          rentalCode: c.code, clientId: client.id, address: client.address ?? "",
          startDate: new Date(c.start), endDate: new Date(c.end),
          contractMgrName: "Manager", contractMgrPhone: "0900000000",
        },
      });
    }
    for (const it of c.items) {
      const ex = await prisma.tmRentalItem.findFirst({ where: { tmRentalId: rental.id, serialNumber: it.sn } });
      const data = { itemId: itemIds[it.itemCode], salesPrice: it.price, startDate: new Date(c.start), endDate: new Date(c.end) };
      if (!ex) await prisma.tmRentalItem.create({ data: { ...data, tmRentalId: rental.id, serialNumber: it.sn } });
    }
  }
}

// ────────── Step 4: 매입 ──────────
async function seedPurchases(itemIds: Record<string, string>, whIds: Record<string, string>) {
  log("Step 4: purchases (10)");
  const purchases = [
    { code: "PUR-E2E-001", supplier: "CL-E2E-004", lines: [{ item: "ITM-E2E-001", qty: 3, price: 85_000_000, sns: ["SN-PUR-D330-001","SN-PUR-D330-002","SN-PUR-D330-003"] }] },
    { code: "PUR-E2E-002", supplier: "CL-E2E-004", lines: [{ item: "ITM-E2E-002", qty: 3, price: 150_000_000, sns: ["SN-PUR-X7500-001","SN-PUR-X7500-002","SN-PUR-X7500-003"] }] },
    { code: "PUR-E2E-003", supplier: "CL-E2E-004", lines: [{ item: "ITM-E2E-003", qty: 1, price: 65_000_000, sns: ["SN-PUR-D410-001"] }] },
    { code: "PUR-E2E-004", supplier: "CL-E2E-005", lines: [{ item: "ITM-E2E-006", qty: 20, price: 350_000 }] },
    { code: "PUR-E2E-005", supplier: "CL-E2E-005", lines: [
      { item: "ITM-E2E-007", qty: 10, price: 500_000 },
      { item: "ITM-E2E-008", qty: 10, price: 500_000 },
      { item: "ITM-E2E-009", qty: 10, price: 500_000 },
    ] },
    { code: "PUR-E2E-006", supplier: "CL-E2E-005", lines: [{ item: "ITM-E2E-010", qty: 10, price: 500_000 }] },
    { code: "PUR-E2E-007", supplier: "CL-E2E-005", lines: [{ item: "ITM-E2E-011", qty: 5, price: 6_000_000 }] },
    { code: "PUR-E2E-008", supplier: "CL-E2E-006", lines: [
      { item: "ITM-E2E-004", qty: 2, price: 200_000_000, sns: ["SN-PUR-E5071C-001","SN-PUR-E5071C-002"] },
      { item: "ITM-E2E-005", qty: 3, price: 150_000_000, sns: ["SN-PUR-N9020B-001","SN-PUR-N9020B-002","SN-PUR-N9020B-003"] },
    ] },
    { code: "PUR-E2E-009", supplier: "CL-E2E-005", lines: [{ item: "ITM-E2E-012", qty: 3, price: 3_000_000 }] },
    { code: "PUR-E2E-010", supplier: "CL-E2E-002", lines: [{ item: "ITM-E2E-015", qty: 100, price: 100_000 }] },
  ];
  const ids: Record<string, string> = {};
  for (const p of purchases) {
    const supplier = await prisma.client.findUnique({ where: { clientCode: p.supplier } });
    if (!supplier) continue;
    let pur = await prisma.purchase.findUnique({ where: { purchaseNumber: p.code } });
    const total = p.lines.reduce((s, l) => s + l.qty * l.price, 0);
    if (!pur) {
      pur = await prisma.purchase.create({
        data: { purchaseNumber: p.code, supplierId: supplier.id, totalAmount: total, currency: "VND", fxRate: 1, warehouseInboundDone: true },
      });
    }
    ids[p.code] = pur.id;
    for (const ln of p.lines) {
      const itemId = itemIds[ln.item];
      if (!itemId) continue;
      const ex = await prisma.purchaseItem.findFirst({ where: { purchaseId: pur.id, itemId } });
      if (!ex) {
        await prisma.purchaseItem.create({
          data: { purchaseId: pur.id, itemId, quantity: ln.qty, unitPrice: ln.price, amount: ln.qty * ln.price },
        });
      }
      // 재고 IN — S/N 있으면 InventoryItem 생성 + transaction
      const sns = (ln as any).sns as string[] | undefined;
      if (sns) {
        for (const sn of sns) {
          await prisma.inventoryItem.upsert({
            where: { serialNumber: sn },
            update: {},
            create: { itemId, serialNumber: sn, warehouseId: whIds["WH-ITMAIN"], status: "NORMAL", companyCode: "TV" },
          }).catch(() => undefined);
        }
      }
      // InventoryTransaction IN (S/N 별 또는 단순 기록)
      await prisma.inventoryTransaction.create({
        data: {
          companyCode: "TV", itemId, txnType: "IN", reason: "PURCHASE",
          toWarehouseId: whIds["WH-ITMAIN"],
          quantity: ln.qty,
          performedAt: new Date(),
          serialNumber: sns?.[0] ?? null,
        },
      }).catch(() => undefined);
    }
  }
  return ids;
}

// ────────── Step 5: 매출 ──────────
async function seedSales(empMap: Record<string, string>, contractMap: Record<string, { contractId: string; equipments: Record<string, string> }>) {
  log("Step 5: sales (10)");
  const sales = [
    { code: "SLS-E2E-001", client: "CL-E2E-001", emp: "EMP-E2E-002", amount: 3_000_000, contract: "TLS-E2E-001", note: "IT 렌탈 월정액 2026-01" },
    { code: "SLS-E2E-002", client: "CL-E2E-001", emp: "EMP-E2E-002", amount: 3_200_000, contract: "TLS-E2E-001", note: "IT 렌탈 월정액 2026-02" },
    { code: "SLS-E2E-003", client: "CL-E2E-002", emp: "EMP-E2E-002", amount: 1_800_000, contract: "TLS-E2E-002", note: "IT 렌탈 월정액 2026-01" },
    { code: "SLS-E2E-004", client: "CL-E2E-010", emp: "EMP-E2E-003", amount: 120_000_000, contract: null, note: "TRADE — E5071C 매매" },
    { code: "SLS-E2E-005", client: "CL-E2E-006", emp: "EMP-E2E-003", amount: 24_000_000, contract: null, note: "MAINTENANCE — N9020B 유지보수 연간" },
    { code: "SLS-E2E-006", client: "CL-E2E-007", emp: "EMP-E2E-008", amount: 5_000_000, contract: null, note: "TM 렌탈 2026-01" },
    { code: "SLS-E2E-007", client: "CL-E2E-009", emp: "EMP-E2E-008", amount: 8_500_000, contract: null, note: "REPAIR — E5071C 수리" },
    { code: "SLS-E2E-008", client: "CL-E2E-008", emp: "EMP-E2E-008", amount: 3_200_000, contract: null, note: "CALIBRATION — N9020B 교정" },
    { code: "SLS-E2E-009", client: "CL-E2E-003", emp: "EMP-E2E-003", amount: 2_500_000, contract: "TLS-E2E-003", note: "IT 렌탈 월정액 2026-01" },
    { code: "SLS-E2E-010", client: "CL-E2E-005", emp: "EMP-E2E-002", amount: 1_200_000, contract: "TLS-E2E-005", note: "IT 렌탈 월정액 2026-01" },
  ];
  const ids: Record<string, string> = {};
  for (const s of sales) {
    const client = await prisma.client.findUnique({ where: { clientCode: s.client } });
    if (!client) continue;
    const ex = await prisma.sales.findUnique({ where: { salesNumber: s.code } }).catch(() => null);
    if (ex) { ids[s.code] = ex.id; continue; }
    const itContractId = s.contract ? contractMap[s.contract]?.contractId ?? null : null;
    const created = await prisma.sales.create({
      data: {
        salesNumber: s.code, clientId: client.id,
        salesEmployeeId: empMap[s.emp] ?? null,
        itContractId,
        totalAmount: s.amount, currency: "VND", fxRate: 1,
        note: s.note,
      },
    });
    ids[s.code] = created.id;
  }
  return ids;
}

// ────────── Step 6: PR (미수금/미지급금) ──────────
async function seedReceivables(salesIds: Record<string, string>, purchaseIds: Record<string, string>) {
  log("Step 6: PayableReceivable + payments");
  // 매출에 대한 미수금 (RECEIVABLE)
  for (const [code, sid] of Object.entries(salesIds)) {
    const sale = await prisma.sales.findUnique({ where: { id: sid } });
    if (!sale) continue;
    const ex = await prisma.payableReceivable.findFirst({ where: { salesId: sid } });
    if (ex) continue;
    const i = parseInt(code.split("-").pop() ?? "0");
    // 상태 분포: 1-3 OPEN, 4 PAID, 5 PARTIAL, 6 PAID, 7 OPEN, 8 OVERDUE, 9 PARTIAL, 10 PAID
    let status: "OPEN"|"PARTIAL"|"PAID" = "OPEN";
    let paid = 0;
    let due = new Date();
    due.setDate(due.getDate() + 14);
    if (i === 4 || i === 6 || i === 10) { status = "PAID"; paid = Number(sale.totalAmount); }
    else if (i === 5 || i === 9) { status = "PARTIAL"; paid = Number(sale.totalAmount) / 2; }
    else if (i === 8) { due = new Date(); due.setDate(due.getDate() - 10); }
    const pr = await prisma.payableReceivable.create({
      data: {
        kind: "RECEIVABLE", clientId: sale.clientId, salesId: sid,
        amount: sale.totalAmount, paidAmount: paid, status,
        dueDate: due, companyCode: "TV",
      },
    });
    if (status === "PAID" || status === "PARTIAL") {
      await prisma.prPayment.create({
        data: { payableReceivableId: pr.id, paidAt: new Date(), amount: paid, note: status === "PAID" ? "전액 입금" : "부분 입금" },
      });
    }
  }
  // 매입에 대한 미지급금 (PAYABLE)
  for (const [code, pid] of Object.entries(purchaseIds)) {
    const pur = await prisma.purchase.findUnique({ where: { id: pid } });
    if (!pur) continue;
    const ex = await prisma.payableReceivable.findFirst({ where: { purchaseId: pid } });
    if (ex) continue;
    const due = new Date(); due.setDate(due.getDate() + 30);
    await prisma.payableReceivable.create({
      data: { kind: "PAYABLE", clientId: pur.supplierId, purchaseId: pid, amount: pur.totalAmount, status: "OPEN", dueDate: due, companyCode: "TV" },
    });
  }
}

// ────────── Step 7: AS Tickets + Dispatches + Parts ──────────
async function seedAsAndParts(empMap: Record<string, string>, itemIds: Record<string, string>, whIds: Record<string, string>) {
  log("Step 7: AS tickets + dispatches + parts (10)");
  const cases = [
    { ticket: "AS-E2E-001", client: "CL-E2E-001", sn: "SN-E2E-D330-001", emp: "EMP-E2E-004", parts: [{ item: "ITM-E2E-013", qty: 1 }] },
    { ticket: "AS-E2E-002", client: "CL-E2E-001", sn: "SN-E2E-X7500-001", emp: "EMP-E2E-004", parts: [{ item: "ITM-E2E-010", qty: 1 }] },
    { ticket: "AS-E2E-003", client: "CL-E2E-002", sn: "SN-E2E-D330-003", emp: "EMP-E2E-005", parts: [{ item: "ITM-E2E-011", qty: 1 }] },
    { ticket: "AS-E2E-004", client: "CL-E2E-003", sn: "SN-E2E-X7500-003", emp: "EMP-E2E-006", parts: [{ item: "ITM-E2E-007", qty: 1 }, { item: "ITM-E2E-008", qty: 1 }] },
    { ticket: "AS-E2E-005", client: "CL-E2E-004", sn: "SN-E2E-D330-006", emp: "EMP-E2E-007", parts: [{ item: "ITM-E2E-012", qty: 1 }] },
    { ticket: "AS-E2E-006", client: "CL-E2E-005", sn: "SN-E2E-X7500-005", emp: "EMP-E2E-004", parts: [{ item: "ITM-E2E-009", qty: 1 }] },
    { ticket: "AS-E2E-007", client: "CL-E2E-001", sn: "SN-E2E-D330-002", emp: "EMP-E2E-005", parts: [{ item: "ITM-E2E-006", qty: 2 }] },
    { ticket: "AS-E2E-008", client: "CL-E2E-010", sn: null, emp: "EMP-E2E-009", parts: [] },
    { ticket: "AS-E2E-009", client: "CL-E2E-007", sn: null, emp: "EMP-E2E-009", parts: [], status: "IN_PROGRESS" as const },
    { ticket: "AS-E2E-010", client: "CL-E2E-003", sn: "SN-E2E-X7500-004", emp: "EMP-E2E-004", parts: [
      { item: "ITM-E2E-010", qty: 5 },
      { item: "ITM-E2E-007", qty: 3 }, { item: "ITM-E2E-008", qty: 3 }, { item: "ITM-E2E-009", qty: 3 },
    ] },
  ];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const client = await prisma.client.findUnique({ where: { clientCode: c.client } });
    if (!client) continue;
    let ticket = await prisma.asTicket.findUnique({ where: { ticketNumber: c.ticket } }).catch(() => null);
    if (!ticket) {
      ticket = await prisma.asTicket.create({
        data: {
          ticketNumber: c.ticket, clientId: client.id, serialNumber: c.sn ?? null,
          assignedToId: empMap[c.emp],
          status: c.status === "IN_PROGRESS" ? "IN_PROGRESS" : "COMPLETED",
          receivedAt: new Date("2026-03-01"),
          completedAt: c.status === "IN_PROGRESS" ? null : new Date("2026-03-15"),
          symptomKo: "테스트 증상", originalLang: "KO",
        },
      });
    }
    let dispatch = await prisma.asDispatch.findFirst({ where: { asTicketId: ticket.id } });
    if (!dispatch) {
      dispatch = await prisma.asDispatch.create({
        data: {
          asTicketId: ticket.id, dispatchEmployeeId: empMap[c.emp],
          targetEquipmentSN: c.sn,
          completedAt: c.status === "IN_PROGRESS" ? null : new Date("2026-03-15"),
          transportCost: 150_000,
        },
      });
    }
    // 기존 parts 제거 후 재생성 (멱등)
    await prisma.asDispatchPart.deleteMany({ where: { asDispatchId: dispatch.id } });
    for (const p of c.parts) {
      const itemId = itemIds[p.item];
      if (!itemId) continue;
      await prisma.asDispatchPart.create({
        data: {
          asDispatchId: dispatch.id, itemId, quantity: p.qty,
          targetEquipmentSN: c.sn ?? "",
        },
      });
      // 재고 OUT 트랜잭션
      await prisma.inventoryTransaction.create({
        data: {
          companyCode: "TV", itemId, txnType: "OUT", reason: "CONSUMABLE_OUT",
          fromWarehouseId: whIds["WH-ITMAIN"], quantity: p.qty,
          performedAt: new Date("2026-03-15"),
          targetEquipmentSN: c.sn ?? null,
        },
      }).catch(() => undefined);
    }
  }
}

// ────────── Step 8: 비용 ──────────
async function seedExpenses(empMap: Record<string, string>) {
  log("Step 8: expenses (10)");
  const exps = [
    { code: "EXP-E2E-001", type: "TRANSPORT" as const, amount: 185_000, note: "KORTECH 출동 교통비", emp: "EMP-E2E-004" },
    { code: "EXP-E2E-002", type: "TRANSPORT" as const, amount: 250_000, note: "HPM 출동 교통비", emp: "EMP-E2E-005" },
    { code: "EXP-E2E-003", type: "MEAL" as const, amount: 3_500_000, note: "1월 기사 식대", emp: "EMP-E2E-004" },
    { code: "EXP-E2E-004", type: "ENTERTAINMENT" as const, amount: 2_000_000, note: "WELSTORY 접대비", emp: "EMP-E2E-003" },
    { code: "EXP-E2E-005", type: "RENT" as const, amount: 15_000_000, note: "BN 사무실 임대료 1월", emp: null },
    { code: "EXP-E2E-006", type: "UTILITY" as const, amount: 5_200_000, note: "BN 전기요금 1월", emp: null },
    { code: "EXP-E2E-007", type: "TRANSPORT" as const, amount: 120_000, note: "SAMSUNG 출동 교통비", emp: "EMP-E2E-007" },
    { code: "EXP-E2E-008", type: "MEAL" as const, amount: 3_800_000, note: "2월 기사 식대", emp: "EMP-E2E-005" },
    { code: "EXP-E2E-009", type: "GENERAL" as const, amount: 1_500_000, note: "사무용품 구매", emp: "EMP-E2E-010" },
    { code: "EXP-E2E-010", type: "TRANSPORT" as const, amount: 300_000, note: "LG 출동 교통비", emp: "EMP-E2E-009" },
  ];
  for (const e of exps) {
    const ex = await prisma.expense.findUnique({ where: { expenseCode: e.code } }).catch(() => null);
    if (ex) continue;
    await prisma.expense.create({
      data: {
        expenseCode: e.code, expenseType: e.type as any, amount: e.amount,
        note: e.note, incurredAt: new Date("2026-02-15"), currency: "VND", fxRate: 1,
      },
    }).catch((err) => console.warn("expense fail", e.code, String(err).slice(0, 100)));
  }
}

// ────────── Step 9: SNMP readings (3개월 × 9 장비 = 27건) ──────────
async function seedSnmpReadings(contractMap: Record<string, { contractId: string; equipments: Record<string, string> }>) {
  log("Step 9: SNMP readings (27)");
  const data: Record<string, { bw: [number, number, number]; color: [number, number, number] }> = {
    "SN-E2E-D330-001": { bw: [10000, 21200, 32500], color: [0, 0, 0] },
    "SN-E2E-D330-002": { bw: [5000, 10800, 16900], color: [0, 0, 0] },
    "SN-E2E-X7500-001": { bw: [8000, 16500, 25200], color: [2000, 4100, 6300] },
    "SN-E2E-D330-003": { bw: [3000, 6500, 10200], color: [0, 0, 0] },
    "SN-E2E-D410-001": { bw: [15000, 31000, 47500], color: [0, 0, 0] },
    "SN-E2E-X7500-003": { bw: [12000, 24500, 37000], color: [3000, 6200, 9500] },
    "SN-E2E-X7500-004": { bw: [11000, 22500, 34000], color: [2800, 5700, 8600] },
    "SN-E2E-D330-006": { bw: [7000, 14200, 21800], color: [0, 0, 0] },
    "SN-E2E-X7500-005": { bw: [6000, 12500, 19000], color: [1500, 3100, 4800] },
  };
  // 시점: 2026-01-01, 2026-02-01, 2026-03-31 23:00 (월별 cron 3월 lte 매칭)
  const dates = [new Date("2026-01-01"), new Date("2026-02-01"), new Date("2026-03-31T23:00:00.000Z")];
  for (const c of Object.values(contractMap)) {
    for (const [sn, eqId] of Object.entries(c.equipments)) {
      const d = data[sn];
      if (!d) continue;
      for (let i = 0; i < 3; i++) {
        await prisma.snmpReading.upsert({
          where: { equipmentId_collectedAt: { equipmentId: eqId, collectedAt: dates[i] } },
          update: { totalPages: d.bw[i] + d.color[i], bwPages: d.bw[i], colorPages: d.color[i] },
          create: {
            equipmentId: eqId,
            contractId: c.contractId,
            clientId: (await prisma.itContract.findUnique({ where: { id: c.contractId }, select: { clientId: true } }))?.clientId ?? "",
            brand: "Test", itemName: "test", serialNumber: sn,
            totalPages: d.bw[i] + d.color[i], bwPages: d.bw[i], colorPages: d.color[i],
            collectedAt: dates[i], collectedBy: "AGENT", companyCode: "TV",
          },
        }).catch(() => undefined);
      }
    }
  }
}

// ────────── main ──────────
async function main() {
  console.log("🌱 E2E full seed start");
  await cleanupOld();
  await seedClients();
  const { empMap } = await seedDeptEmployees();
  const whIds = await seedWarehouses();
  const itemIds = await seedItems();
  const contractMap = await seedItContracts(itemIds);
  await seedTmRentals(itemIds);
  const purchaseIds = await seedPurchases(itemIds, whIds);
  const salesIds = await seedSales(empMap, contractMap);
  await seedReceivables(salesIds, purchaseIds);
  await seedAsAndParts(empMap, itemIds, whIds);
  await seedExpenses(empMap);
  await seedSnmpReadings(contractMap);
  console.log("✅ E2E full seed complete");
}

main().catch((e) => { console.error("❌", e); process.exit(1); }).finally(() => prisma.$disconnect());
