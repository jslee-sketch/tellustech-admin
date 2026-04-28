// Tellustech ERP — 시드 데이터 (Phase 1-2)
//
// 실행: `npx prisma db seed` (package.json의 prisma.seed 스크립트 참조)
// 멱등 설계: 모든 레코드는 upsert. 반복 실행해도 안전.

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  CompanyCode,
  BranchType,
  UserRole,
  Language,
  EmployeeStatus,
  SalesType,
  ReceivableStatus,
  WarehouseType,
  Industry,
} from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const hash = (pw: string) => bcrypt.hashSync(pw, 10);

type DeptSeed = {
  companyCode: CompanyCode;
  code: string;
  name: string;
  branchType: BranchType;
};

const DEPARTMENTS: DeptSeed[] = [
  { companyCode: "TV", code: "TVBN", name: "TV 박닌 본사", branchType: "BN" },
  { companyCode: "TV", code: "TVHN", name: "TV 하노이 지사", branchType: "HN" },
  { companyCode: "TV", code: "TVHCM", name: "TV 호치민 지사", branchType: "HCM" },
  { companyCode: "TV", code: "TVNT", name: "TV 나짱 지사", branchType: "NT" },
  { companyCode: "TV", code: "TVDN", name: "TV 다낭 지사", branchType: "DN" },
  { companyCode: "VR", code: "VRBN", name: "VR 박닌", branchType: "BN" },
  { companyCode: "VR", code: "VRHN", name: "VR 하노이", branchType: "HN" },
  { companyCode: "VR", code: "VRHCM", name: "VR 호치민", branchType: "HCM" },
  { companyCode: "VR", code: "VRNT", name: "VR 나짱", branchType: "NT" },
  { companyCode: "VR", code: "VRDN", name: "VR 다낭", branchType: "DN" },
];

// 창고 7개 — 프로토타입 module1-master-data.jsx 의 실제 운영 창고 코드.
// 공유 마스터(company_code 없음). Phase 2 재고관리 진입 시 바로 쓸 수 있도록 미리 시드.
const WAREHOUSES: {
  code: string;
  name: string;
  warehouseType: WarehouseType;
  branchType: BranchType | null;
  location: string | null;
}[] = [
  { code: "ITMAIN", name: "IT MAIN STOCK",                    warehouseType: "INTERNAL", branchType: "BN",  location: null },
  { code: "BNIT",   name: "Tellustech Vina BN IT (Mua-Bán)",  warehouseType: "INTERNAL", branchType: "BN",  location: "Bắc Ninh" },
  { code: "HNIT",   name: "Tellustech Vina HN IT (Mua-Bán)",  warehouseType: "INTERNAL", branchType: "HN",  location: "Hà Nội" },
  { code: "HCMIT",  name: "Tellustech Vina HCM IT",           warehouseType: "INTERNAL", branchType: "HCM", location: "Hồ Chí Minh" },
  { code: "NTRIT",  name: "Tellustech Vina NTR IT (Mua-Bán)", warehouseType: "INTERNAL", branchType: "NT",  location: "Nha Trang" },
  { code: "TMBN",   name: "Tellustech Vina TM_service",       warehouseType: "INTERNAL", branchType: "BN",  location: "Bắc Ninh" },
  { code: "VRTM",   name: "Vietrental TM_Service",            warehouseType: "INTERNAL", branchType: "BN",  location: "Bắc Ninh" },
];

// 거래처 샘플 5개 — 업종/결제조건 등 Phase 2 매출/매입에서 바로 쓰일 값 포함.
// paymentTerms 는 가이드 기본값 30일. 필요 시 거래처별로 UI 에서 조정.
const CLIENTS: {
  clientCode: string;
  companyNameVi: string;
  companyNameEn: string;
  industry: Industry;
  paymentTerms: number;
  representative?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankHolder?: string;
}[] = [
  { clientCode: "CL-000001", companyNameVi: "WELSTORY",     companyNameEn: "WELSTORY",     industry: "OTHER",         paymentTerms: 30 },
  { clientCode: "CL-000002", companyNameVi: "IMJ VINA",     companyNameEn: "IMJ VINA",     industry: "MANUFACTURING", paymentTerms: 30 },
  { clientCode: "CL-000003", companyNameVi: "VSD CHEMICAL", companyNameEn: "VSD CHEMICAL", industry: "MANUFACTURING", paymentTerms: 30 },
  { clientCode: "CL-000004", companyNameVi: "HPM",          companyNameEn: "HPM",          industry: "MANUFACTURING", paymentTerms: 30 },
  { clientCode: "CL-000005", companyNameVi: "FUSHAN",       companyNameEn: "FUSHAN",       industry: "MANUFACTURING", paymentTerms: 30 },
];

// 프로젝트코드 7개. 가이드의 "매출유형 분류"에 맞춰 SalesType 매핑.
// (companyCode, projectCode) 유니크이므로 TV/VR 두 회사에 동일 코드 복제 생성.
const PROJECTS: { projectCode: string; name: string; salesType: SalesType }[] = [
  { projectCode: "IT0001", name: "IT Buy & Sell",  salesType: "TRADE" },
  { projectCode: "IT0003", name: "IT Rental",      salesType: "RENTAL" },
  { projectCode: "IT0005", name: "IT Repair",      salesType: "REPAIR" },
  { projectCode: "IT0007", name: "IT Maintenance", salesType: "MAINTENANCE" },
  { projectCode: "TM_R",   name: "TM Rental",      salesType: "RENTAL" },
  { projectCode: "TM_C",   name: "TM Calibration", salesType: "CALIBRATION" },
  { projectCode: "TM_F",   name: "TM Maintenance", salesType: "MAINTENANCE" },
];

async function seedDepartments() {
  for (const d of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { companyCode_code: { companyCode: d.companyCode, code: d.code } },
      update: { name: d.name, branchType: d.branchType },
      create: d,
    });
  }
  console.log(`  ✓ departments: ${DEPARTMENTS.length}`);
}

async function seedEmployeesAndUsers() {
  // 테스트 직원 2명
  const tvbn = await prisma.department.findUniqueOrThrow({
    where: { companyCode_code: { companyCode: "TV", code: "TVBN" } },
  });
  const vrhn = await prisma.department.findUniqueOrThrow({
    where: { companyCode_code: { companyCode: "VR", code: "VRHN" } },
  });

  const tech1Employee = await prisma.employee.upsert({
    where: { companyCode_employeeCode: { companyCode: "TV", employeeCode: "TNV-001" } },
    update: {},
    create: {
      companyCode: "TV",
      employeeCode: "TNV-001",
      departmentId: tvbn.id,
      nameVi: "Nguyen Tech One",
      nameEn: "Tech One",
      nameKo: "테크1",
      position: "Technician",
      email: "tech1@tellustech.co.kr",
      status: "ACTIVE" as EmployeeStatus,
    },
  });

  const sales1Employee = await prisma.employee.upsert({
    where: { companyCode_employeeCode: { companyCode: "VR", employeeCode: "VNV-001" } },
    update: {},
    create: {
      companyCode: "VR",
      employeeCode: "VNV-001",
      departmentId: vrhn.id,
      nameVi: "Tran Sales One",
      nameEn: "Sales One",
      nameKo: "세일즈1",
      position: "Sales Representative",
      email: "sales1@tellustech.co.kr",
      status: "ACTIVE" as EmployeeStatus,
    },
  });

  // 관리자 사용자 (Employee 연결 없음)
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: hash("admin123"),
      email: "admin@tellustech.co.kr",
      allowedCompanies: ["TV", "VR"] as CompanyCode[],
      role: "ADMIN" as UserRole,
      preferredLang: "KO" as Language,
    },
  });

  await prisma.user.upsert({
    where: { username: "vr_admin" },
    update: {},
    create: {
      username: "vr_admin",
      passwordHash: hash("admin123"),
      email: "vr_admin@tellustech.co.kr",
      allowedCompanies: ["VR"] as CompanyCode[],
      role: "ADMIN" as UserRole,
      preferredLang: "VI" as Language,
    },
  });

  // 테스트 직원 사용자
  await prisma.user.upsert({
    where: { username: "tech1" },
    update: { employeeId: tech1Employee.id },
    create: {
      username: "tech1",
      passwordHash: hash("test123"),
      email: "tech1@tellustech.co.kr",
      allowedCompanies: ["TV"] as CompanyCode[],
      role: "TECH" as UserRole,
      preferredLang: "VI" as Language,
      employeeId: tech1Employee.id,
    },
  });

  await prisma.user.upsert({
    where: { username: "sales1" },
    update: { employeeId: sales1Employee.id },
    create: {
      username: "sales1",
      passwordHash: hash("test123"),
      email: "sales1@tellustech.co.kr",
      allowedCompanies: ["VR"] as CompanyCode[],
      role: "SALES" as UserRole,
      preferredLang: "VI" as Language,
      employeeId: sales1Employee.id,
    },
  });

  // CLIENT 포탈 계정 — username = clientCode 정책으로 통합.
  // 기존 CLIENT 사용자 (예: welstory_portal) 의 username 을 clientCode 로 rename.
  const existingClientUsers = await prisma.user.findMany({ where: { role: "CLIENT" as UserRole, clientId: { not: null } }, select: { id: true, username: true, clientId: true } });
  for (const u of existingClientUsers) {
    const c = await prisma.client.findUnique({ where: { id: u.clientId! }, select: { clientCode: true } });
    if (c && u.username !== c.clientCode) {
      try {
        await prisma.user.update({ where: { id: u.id }, data: { username: c.clientCode } });
      } catch (e) {
        // username 충돌 (이미 다른 user 가 그 clientCode 로 있음) — 구계정 삭제 후 재시도
        await prisma.user.delete({ where: { id: u.id } }).catch(() => undefined);
      }
    }
  }
  // 미발급 거래처에 새 계정 생성
  const allClients = await prisma.client.findMany({ where: { deletedAt: null, portalUser: null }, select: { id: true, clientCode: true } });
  let portalCount = 0;
  for (const c of allClients) {
    try {
      await prisma.user.create({
        data: {
          username: c.clientCode,
          passwordHash: hash("1234"),
          allowedCompanies: [] as CompanyCode[],
          role: "CLIENT" as UserRole,
          preferredLang: "KO" as Language,
          clientId: c.id,
          mustChangePassword: true,
        },
      });
      portalCount++;
    } catch { /* skip duplicates */ }
  }

  console.log(`  ✓ employees: 2 (TNV-001, VNV-001)`);
  console.log(`  ✓ users: 4 admin/staff + ${portalCount} portal accounts (clientCode_portal 형식 폐지 — 이제 username = clientCode)`);
}

async function seedWarehouses() {
  for (const w of WAREHOUSES) {
    await prisma.warehouse.upsert({
      where: { code: w.code },
      update: { name: w.name, warehouseType: w.warehouseType, branchType: w.branchType, location: w.location },
      create: w,
    });
  }
  console.log(`  ✓ warehouses: ${WAREHOUSES.length}`);
}

async function seedClients() {
  for (const c of CLIENTS) {
    // 기존 시드 거래처도 신규 상업 필드(paymentTerms/industry)를 채우도록 update 동기화
    const commercialFields = {
      industry: c.industry,
      paymentTerms: c.paymentTerms,
      representative: c.representative ?? null,
      bankName: c.bankName ?? null,
      bankAccountNumber: c.bankAccountNumber ?? null,
      bankHolder: c.bankHolder ?? null,
    };
    await prisma.client.upsert({
      where: { clientCode: c.clientCode },
      update: commercialFields,
      create: {
        clientCode: c.clientCode,
        companyNameVi: c.companyNameVi,
        companyNameEn: c.companyNameEn,
        receivableStatus: "NORMAL" as ReceivableStatus,
        ...commercialFields,
      },
    });
  }
  console.log(`  ✓ clients: ${CLIENTS.length}`);
}

async function seedProjects() {
  const companies: CompanyCode[] = ["TV", "VR"];
  for (const company of companies) {
    for (const p of PROJECTS) {
      await prisma.project.upsert({
        where: {
          companyCode_projectCode: { companyCode: company, projectCode: p.projectCode },
        },
        update: { name: p.name, salesType: p.salesType },
        create: { companyCode: company, ...p },
      });
    }
  }
  console.log(`  ✓ projects: ${PROJECTS.length * companies.length} (${PROJECTS.length} × 2 companies)`);
}

const SAMPLE_ITEMS: { itemCode: string; name: string; itemType: "PRODUCT" | "CONSUMABLE" | "PART"; unit?: string; category?: string }[] = [
  { itemCode: "ITM-001", name: "Sindoh D330 Copier", itemType: "PRODUCT", unit: "ea", category: "Copier" },
  { itemCode: "ITM-002", name: "Samsung X7500 Laser Printer", itemType: "PRODUCT", unit: "ea", category: "Printer" },
  { itemCode: "ITM-003", name: "HP LaserJet Pro M404dn", itemType: "PRODUCT", unit: "ea", category: "Printer" },
  { itemCode: "ITM-004", name: "Toner Black D330", itemType: "CONSUMABLE", unit: "ea", category: "Toner" },
  { itemCode: "ITM-005", name: "Toner Cyan X7500", itemType: "CONSUMABLE", unit: "ea", category: "Toner" },
  { itemCode: "ITM-006", name: "Toner Magenta X7500", itemType: "CONSUMABLE", unit: "ea", category: "Toner" },
  { itemCode: "ITM-007", name: "Toner Yellow X7500", itemType: "CONSUMABLE", unit: "ea", category: "Toner" },
  { itemCode: "ITM-008", name: "A4 Paper 80gsm 500 sheets", itemType: "CONSUMABLE", unit: "ream", category: "Paper" },
  { itemCode: "ITM-009", name: "Drum Unit D330", itemType: "PART", unit: "ea", category: "Drum" },
  { itemCode: "ITM-010", name: "Digital Multimeter Fluke 87V", itemType: "PRODUCT", unit: "ea", category: "Test & Measurement" },
  { itemCode: "ITM-011", name: "Oscilloscope Rigol DS1054Z", itemType: "PRODUCT", unit: "ea", category: "Test & Measurement" },
  { itemCode: "ITM-012", name: "Power Supply Rigol DP832", itemType: "PRODUCT", unit: "ea", category: "Test & Measurement" },
  { itemCode: "ITM-013", name: "USB Cable Type-C 2m", itemType: "PART", unit: "ea", category: "Cable" },
  { itemCode: "ITM-014", name: "Ethernet Patch Cable Cat6 3m", itemType: "PART", unit: "ea", category: "Cable" },
  { itemCode: "ITM-015", name: "Fuser Unit D330", itemType: "PART", unit: "ea", category: "Fuser" },
];

async function seedItems() {
  for (const it of SAMPLE_ITEMS) {
    await prisma.item.upsert({
      where: { itemCode: it.itemCode },
      update: { name: it.name, itemType: it.itemType, unit: it.unit ?? null, category: it.category ?? null },
      create: { itemCode: it.itemCode, name: it.name, itemType: it.itemType, unit: it.unit ?? null, category: it.category ?? null },
    });
  }
  console.log(`  ✓ items: ${SAMPLE_ITEMS.length}`);

  // 소모품 적정율 기준값 — 제조사 공표 기준 (5% 상밀도). 카테고리·이름 패턴 매칭.
  const YIELD_DEFAULTS: { match: (name: string, category: string | null) => boolean; expectedYield: number }[] = [
    { match: (n) => /Drum.*D330|D330.*Drum/i.test(n), expectedYield: 80000 },
    { match: (n) => /Toner Black.*D330|Black.*D330.*Toner/i.test(n), expectedYield: 25000 },
    { match: (n) => /Toner.*(Cyan|Magenta|Yellow).*X7500/i.test(n), expectedYield: 15000 },
    { match: (n) => /Fuser/i.test(n), expectedYield: 100000 },
  ];
  let updated = 0;
  const consumables = await prisma.item.findMany({
    where: { itemType: { in: ["CONSUMABLE", "PART"] }, expectedYield: null },
    select: { id: true, name: true, category: true },
  });
  for (const c of consumables) {
    const match = YIELD_DEFAULTS.find((d) => d.match(c.name, c.category));
    if (match) {
      await prisma.item.update({
        where: { id: c.id },
        data: { expectedYield: match.expectedYield, yieldCoverageBase: 5, yieldUnit: "pages" },
      });
      updated++;
    }
  }
  console.log(`  ✓ items expectedYield seeded: ${updated}`);
}

async function seedYieldConfig() {
  await prisma.yieldConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      thresholdBlue: 120,
      thresholdGreen: 80,
      thresholdYellow: 50,
      thresholdOrange: 30,
      fraudAlertThreshold: 30,
    },
  });
  console.log(`  ✓ yieldConfig: default`);
}

// Phase A — 포탈 포인트 시스템 기본 단가 + 사이드바 배너
const POINT_DEFAULTS = [
  { reason: "AS_REQUEST", amount: 1000 },
  { reason: "SUPPLIES_REQUEST", amount: 1000 },
  { reason: "SERVICE_CONFIRM", amount: 1000 },
  { reason: "USAGE_CONFIRM", amount: 1000 },
  { reason: "QUOTE_REQUEST", amount: 1000 },
  { reason: "FEEDBACK_PRAISE", amount: 1000 },
  { reason: "FEEDBACK_IMPROVE", amount: 1000 },
  { reason: "FEEDBACK_SUGGEST", amount: 1000 },
  { reason: "SURVEY_COMPLETE", amount: 10000 },
  { reason: "POST_WRITE", amount: 1000 },
  { reason: "POST_READ_BONUS", amount: 0 },
  { reason: "REFERRAL_CONTRACT", amount: 100000 },
  { reason: "ADMIN_GRANT", amount: 0 },
  { reason: "ADMIN_DEDUCT", amount: 0 },
] as const;

async function seedPointConfigs() {
  for (const cfg of POINT_DEFAULTS) {
    await (prisma as any).pointConfig.upsert({
      where: { reason: cfg.reason },
      update: {}, // 기존 단가 보존 (관리자가 변경했을 수 있음)
      create: { reason: cfg.reason as any, amount: cfg.amount, isActive: true },
    });
  }
  console.log(`  ✓ point configs: ${POINT_DEFAULTS.length}`);
}

const BANNER_DEFAULTS = [
  { slot: "OA", textKo: "프린터 걱정 없는 올인원 렌탈", textVi: "Cho thuê máy in trọn gói", textEn: "All-in-one printer rental", linkUrl: "https://tellustech.co.kr/oa" },
  { slot: "TM", textKo: "교정·수리·렌탈 한번에", textVi: "Hiệu chuẩn · Sửa chữa · Cho thuê", textEn: "Calibration · Repair · Rental", linkUrl: "https://tellustech.co.kr/tm" },
];

async function seedPortalBanners() {
  for (const b of BANNER_DEFAULTS) {
    await (prisma as any).portalBanner.upsert({
      where: { slot: b.slot },
      update: {},
      create: { ...b, isActive: true },
    });
  }
  console.log(`  ✓ portal banners: ${BANNER_DEFAULTS.length}`);
}

const SNMP_MODELS = [
  { deviceModel: "SAMSUNG_SCX8123", brand: "Samsung", modelName: "SCX-8123",
    oidTotal: "1.3.6.1.2.1.43.10.2.1.4.1.1", oidBw: null, oidColor: null,
    oidSerial: "1.3.6.1.2.1.43.5.1.1.17.1", isMonoOnly: true },
  { deviceModel: "SAMSUNG_X7500", brand: "Samsung", modelName: "SL-X7500",
    oidTotal: "1.3.6.1.2.1.43.10.2.1.4.1.1",
    oidBw: "1.3.6.1.4.1.236.11.5.11.81.11.4.1.1.1",
    oidColor: "1.3.6.1.4.1.236.11.5.11.81.11.4.1.1.2",
    oidSerial: "1.3.6.1.2.1.43.5.1.1.17.1", isMonoOnly: false },
  { deviceModel: "SINDOH_D330", brand: "Sindoh", modelName: "D330",
    oidTotal: "1.3.6.1.2.1.43.10.2.1.4.1.1",
    oidBw: "1.3.6.1.4.1.18334.1.1.1.5.7.2.2.1.5.1.1",
    oidColor: "1.3.6.1.4.1.18334.1.1.1.5.7.2.2.1.5.1.2",
    oidSerial: "1.3.6.1.2.1.43.5.1.1.17.1", isMonoOnly: false },
  { deviceModel: "SINDOH_D410", brand: "Sindoh", modelName: "D410",
    oidTotal: "1.3.6.1.2.1.43.10.2.1.4.1.1",
    oidBw: "1.3.6.1.4.1.18334.1.1.1.5.7.2.2.1.5.1.1",
    oidColor: "1.3.6.1.4.1.18334.1.1.1.5.7.2.2.1.5.1.2",
    oidSerial: "1.3.6.1.2.1.43.5.1.1.17.1", isMonoOnly: false },
  { deviceModel: "SINDOH_D320", brand: "Sindoh", modelName: "D320",
    oidTotal: "1.3.6.1.2.1.43.10.2.1.4.1.1",
    oidBw: "1.3.6.1.4.1.18334.1.1.1.5.7.2.2.1.5.1.1",
    oidColor: "1.3.6.1.4.1.18334.1.1.1.5.7.2.2.1.5.1.2",
    oidSerial: "1.3.6.1.2.1.43.5.1.1.17.1", isMonoOnly: false },
  { deviceModel: "GENERIC_PRINTER", brand: "Generic", modelName: "Standard MIB",
    oidTotal: "1.3.6.1.2.1.43.10.2.1.4.1.1", oidBw: null, oidColor: null,
    oidSerial: "1.3.6.1.2.1.43.5.1.1.17.1", isMonoOnly: true },
];

async function seedSnmpModels() {
  for (const m of SNMP_MODELS) {
    await (prisma as any).snmpModelOid.upsert({
      where: { deviceModel: m.deviceModel },
      update: {}, // 기존 매핑 보존
      create: m,
    });
  }
  console.log(`  ✓ snmp model OIDs: ${SNMP_MODELS.length}`);
}

async function main() {
  console.log("🌱 Seeding Tellustech ERP database...");
  await seedDepartments();
  await seedEmployeesAndUsers();
  await seedWarehouses();
  await seedClients();
  await seedProjects();
  await seedItems();
  await seedPointConfigs();
  await seedPortalBanners();
  await seedSnmpModels();
  await seedYieldConfig();
  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
