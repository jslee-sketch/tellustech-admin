// scripts/dev-only/seed-full-100.ts
// 전체 ERP 100 시나리오 검증용 시드. 기존 데이터 보존 + 신규 데이터 추가만.
// prefix: -100- (CL-100-, ITM-100-, EMP-100-, etc.)
// 실행: npx tsx scripts/dev-only/seed-full-100.ts
//
// 멱등성 — 모두 upsert/findFirst-then-create 방식. 두 번 실행해도 안전.
//
// Phase 매핑:
//   1. 마스터 (S-001~S-015): clients/depts/employees/warehouses/items/BOM/compat/projects/licenses/schedules/cost-centers/bank-accounts
//   2. 매입+재고 (S-016~S-025): purchases + inventoryItems + transactions + payables + journal-entries + transfer/consumable/repair scenarios
//   3. IT/TM 렌탈 (S-026~S-040): contracts + amendments + tm-rentals + snmp + usage-confirmations + sales workflow + yield
//   4. AS (S-041~S-055): tickets + dispatches + parts + BOM + compat
//   5. 매출 (S-056~S-065): sales + adjustments + receivables + payments + transfer + cash-dashboard
//   6. 비용 (S-066~S-075): expenses + reimburse + cost-allocations + payrolls + depreciation
//   7. 회계 (S-076~S-090): journal-entries + manual + reverse + trial-balance + period-close
//   8. 포탈 (S-091~S-100): client portal user + quotes + feedback + points + audit + i18n

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const log = (s: string) => console.log(`[seed-100] ${s}`);

const counts = { created: 0, updated: 0, skipped: 0, errors: 0 };
function inc(k: keyof typeof counts) { counts[k]++; }

// ──────────────────────────────────────────────────────────────────
// PHASE 1 — 마스터 (S-001 ~ S-015)
// ──────────────────────────────────────────────────────────────────

// S-001: 거래처 10
const CLIENTS_100 = [
  { code: "CL-100-001", ko: "삼성전자 베트남",      vi: "Samsung Electronics Vietnam", en: "Samsung Electronics Vietnam", addr: "Bac Ninh, SEV Yen Phong",   pt: 30, kind: "C" },
  { code: "CL-100-002", ko: "LG디스플레이",          vi: "LG Display Vietnam",         en: "LG Display Vietnam",          addr: "Hai Phong, DEEP C IP",       pt: 30, kind: "C" },
  { code: "CL-100-003", ko: "캐논 베트남",           vi: "Canon Vietnam",              en: "Canon Vietnam",               addr: "Hanoi, Thang Long IP",       pt: 45, kind: "C" },
  { code: "CL-100-004", ko: "도요타 비나",           vi: "Toyota Motor Vietnam",       en: "Toyota Motor Vietnam",        addr: "Vinh Phuc, Phuc Yen",        pt: 30, kind: "C" },
  { code: "CL-100-005", ko: "현대모비스 베트남",     vi: "Hyundai Mobis Vietnam",      en: "Hyundai Mobis Vietnam",       addr: "Ninh Binh, Gian Khau IP",    pt: 30, kind: "C" },
  { code: "CL-100-006", ko: "포스코 베트남",          vi: "POSCO Vietnam",              en: "POSCO Vietnam",               addr: "Ba Ria-Vung Tau, Phu My",    pt: 60, kind: "C" },
  { code: "CL-100-007", ko: "부산철강 베트남",        vi: "Busan Steel Vina",           en: "Busan Steel Vina",            addr: "Da Nang, Hoa Khanh IP",      pt: 30, kind: "C" },
  { code: "CL-100-008", ko: "신도리코 (공급)",        vi: "Sindoh Distribution VN",     en: "Sindoh Distribution VN",      addr: "Hanoi, Cau Giay",            pt: 30, kind: "S" },
  { code: "CL-100-009", ko: "삼성프린팅 (공급)",      vi: "Samsung Printing VN",        en: "Samsung Printing VN",         addr: "HCM, District 7",            pt: 30, kind: "S" },
  { code: "CL-100-010", ko: "Keysight Korea (공급)",  vi: "Keysight Korea",             en: "Keysight Korea",              addr: "Seoul, Gangnam",             pt: 45, kind: "S" },
];

async function s001Clients() {
  log("S-001: 거래처 10");
  for (let i = 0; i < CLIENTS_100.length; i++) {
    const c = CLIENTS_100[i];
    const phone = `0901-100-${String(i + 1).padStart(3, "0")}`;
    const email = `${c.code.toLowerCase()}@test.vn`;
    const data = {
      companyNameVi: c.vi, companyNameEn: c.en, companyNameKo: c.ko,
      address: c.addr, paymentTerms: c.pt, phone, email,
      industry: i < 7 ? ("MANUFACTURING" as const) : ("IT" as const),
      grade: ("A" as const),
      taxCode: `01000${1000 + i}`,
      representative: `Mr. Test ${i + 1}`,
      receivableStatus: "NORMAL" as const,
    };
    const ex = await prisma.client.findUnique({ where: { clientCode: c.code } });
    if (ex) { await prisma.client.update({ where: { id: ex.id }, data }); inc("updated"); }
    else    { await prisma.client.create({ data: { clientCode: c.code, ...data } }); inc("created"); }
  }
}

// S-002: 부서 5
const DEPTS_100 = [
  { code: "DEPT-100-MGMT",     name: "경영관리",  branch: "BN" as const, company: "TV" as const },
  { code: "DEPT-100-SALES",    name: "영업",      branch: "BN" as const, company: "TV" as const },
  { code: "DEPT-100-TECH",     name: "기술",      branch: "BN" as const, company: "TV" as const },
  { code: "DEPT-100-ACCT",     name: "회계",      branch: "BN" as const, company: "TV" as const },
  { code: "DEPT-100-VR-SALES", name: "VR 영업",   branch: "BN" as const, company: "VR" as const },
];

const deptIdMap: Record<string, string> = {};
async function s002Departments() {
  log("S-002: 부서 5");
  for (const d of DEPTS_100) {
    const ex = await prisma.department.findFirst({ where: { code: d.code, companyCode: d.company } });
    const row = ex
      ? await prisma.department.update({ where: { id: ex.id }, data: { name: d.name, branchType: d.branch } })
      : await prisma.department.create({ data: { code: d.code, name: d.name, branchType: d.branch, companyCode: d.company } });
    deptIdMap[d.code] = row.id;
    inc(ex ? "updated" : "created");
  }
}

// S-003: 직원 10
type EmpDef = { code: string; name: string; nameKo?: string; role: "ADMIN" | "MANAGER" | "EMPLOYEE"; dept: string; branch: "BN"|"HN"|"HCM"|"DN"|"NT"; email: string; zalo: string; company: "TV"|"VR"; userRole: "ADMIN"|"MANAGER"|"SALES"|"TECH"|"ACCOUNTING"; };
const EMPS_100: EmpDef[] = [
  { code: "EMP-100-001", name: "Lee Daepyo",    nameKo: "이대표",   role: "ADMIN",    dept: "DEPT-100-MGMT",     branch: "BN", email: "admin100@tt.vn",  zalo: "0901100001", company: "TV", userRole: "ADMIN" },
  { code: "EMP-100-002", name: "Kim Sales",     nameKo: "김영업",   role: "EMPLOYEE", dept: "DEPT-100-SALES",    branch: "HN", email: "sales1-100@tt.vn", zalo: "0901100002", company: "TV", userRole: "SALES" },
  { code: "EMP-100-003", name: "Park Sales",    nameKo: "박영업",   role: "EMPLOYEE", dept: "DEPT-100-SALES",    branch: "HCM",email: "sales2-100@tt.vn", zalo: "0901100003", company: "TV", userRole: "SALES" },
  { code: "EMP-100-004", name: "Khang Tech",    role: "EMPLOYEE", dept: "DEPT-100-TECH",     branch: "BN", email: "khang100@tt.vn",  zalo: "0901100004", company: "TV", userRole: "TECH" },
  { code: "EMP-100-005", name: "Thiet Tech",    role: "EMPLOYEE", dept: "DEPT-100-TECH",     branch: "HN", email: "thiet100@tt.vn",  zalo: "0901100005", company: "TV", userRole: "TECH" },
  { code: "EMP-100-006", name: "Linh Tech",     role: "EMPLOYEE", dept: "DEPT-100-TECH",     branch: "HCM",email: "linh100@tt.vn",   zalo: "0901100006", company: "TV", userRole: "TECH" },
  { code: "EMP-100-007", name: "Choi Acct",     nameKo: "최회계",   role: "EMPLOYEE", dept: "DEPT-100-ACCT",     branch: "BN", email: "acct100@tt.vn",   zalo: "0901100007", company: "TV", userRole: "ACCOUNTING" },
  { code: "EMP-100-008", name: "Mr. Tuan",      role: "MANAGER",  dept: "DEPT-100-VR-SALES", branch: "BN", email: "tuan100@vr.vn",   zalo: "0901100008", company: "VR", userRole: "MANAGER" },
  { code: "EMP-100-009", name: "Hai Tech",      role: "EMPLOYEE", dept: "DEPT-100-VR-SALES", branch: "BN", email: "hai100@vr.vn",    zalo: "0901100009", company: "VR", userRole: "TECH" },
  { code: "EMP-100-010", name: "Park Manager",  nameKo: "박매니저", role: "MANAGER",  dept: "DEPT-100-SALES",    branch: "BN", email: "mgr100@tt.vn",    zalo: "0901100010", company: "TV", userRole: "MANAGER" },
];
const empIdMap: Record<string, string> = {};

async function s003Employees() {
  log("S-003: 직원 10 (+사용자)");
  const passwordHash = await bcrypt.hash("admin123", 10);
  for (const e of EMPS_100) {
    const data = {
      companyCode: e.company,
      nameVi: e.name, nameKo: e.nameKo ?? null, nameEn: e.name,
      position: e.role === "ADMIN" ? "대표" : e.role === "MANAGER" ? "팀장" : "사원",
      email: e.email, personalEmail: e.email, zaloId: e.zalo,
      phone: e.zalo, hireDate: new Date("2025-06-01"),
      birthDate: new Date("1990-01-01"),
      departmentId: deptIdMap[e.dept] ?? null,
      salary: e.role === "ADMIN" ? 50_000_000 : e.role === "MANAGER" ? 30_000_000 : 18_000_000,
      contractType: "정규직",
      contractStart: new Date("2025-06-01"),
      idCardNumber: `12345${e.code.slice(-3)}`,
    };
    const ex = await prisma.employee.findFirst({ where: { employeeCode: e.code } });
    const row = ex
      ? await prisma.employee.update({ where: { id: ex.id }, data })
      : await prisma.employee.create({ data: { employeeCode: e.code, ...data } });
    empIdMap[e.code] = row.id;
    inc(ex ? "updated" : "created");

    // user — admin/admin123 fixed for first one
    const username = e.code.toLowerCase().replace(/-/g, "");
    const userEx = await prisma.user.findFirst({ where: { OR: [{ employeeId: row.id }, { username }] } });
    if (!userEx) {
      await prisma.user.create({
        data: {
          username, passwordHash, email: e.email,
          employeeId: row.id, role: e.userRole,
          allowedCompanies: e.userRole === "ADMIN" ? ["TV", "VR"] : [e.company],
          preferredLang: "KO", isActive: true,
        },
      });
      inc("created");
    }
  }
}

// S-004: 창고 5
const WAREHOUSES_100 = [
  { code: "WH-100-IT-BN",       name: "IT 본사 창고",       type: "INTERNAL" as const, branch: "BN" as const,  loc: "Bac Ninh HQ" },
  { code: "WH-100-IT-HN",       name: "IT 하노이 창고",     type: "INTERNAL" as const, branch: "HN" as const,  loc: "Hanoi Branch" },
  { code: "WH-100-TM-BN",       name: "TM 본사 창고 (VR)",  type: "INTERNAL" as const, branch: "BN" as const,  loc: "Bac Ninh HQ" },
  { code: "WH-100-EXT-SAMSUNG", name: "삼성 외부 창고",     type: "EXTERNAL" as const, branch: "BN" as const,  loc: "SEV onsite" },
  { code: "WH-100-EXT-CANON",   name: "캐논 외부 창고",     type: "EXTERNAL" as const, branch: "HCM" as const, loc: "Canon onsite" },
];
const whIdMap: Record<string, string> = {};

async function s004Warehouses() {
  log("S-004: 창고 5");
  for (const w of WAREHOUSES_100) {
    const data = { name: w.name, warehouseType: w.type, branchType: w.branch, location: w.loc };
    const row = await prisma.warehouse.upsert({
      where: { code: w.code },
      update: data,
      create: { code: w.code, ...data },
    });
    whIdMap[w.code] = row.id;
    inc("created");
  }
}

// S-005: 품목 15
type ItemDef = {
  code: string; type: "PRODUCT" | "CONSUMABLE" | "PART" | "SUPPLIES";
  name: string; desc: string;
  colorChannel?: "BLACK"|"CYAN"|"MAGENTA"|"YELLOW"|"DRUM"|"FUSER"|"NONE";
  expectedYield?: number;
  compat?: string[];
  parent?: string;
};
const ITEMS_100: ItemDef[] = [
  { code: "ITM-100-001", type: "PRODUCT",    name: "Sindoh D330",          desc: "Sindoh D330 A4 흑백 복합기 35ppm" },
  { code: "ITM-100-002", type: "PRODUCT",    name: "Samsung X7500",        desc: "Samsung SL-X7500 A3 컬러 복합기 50ppm" },
  { code: "ITM-100-003", type: "PRODUCT",    name: "Sindoh D410",          desc: "Sindoh D410 A4 흑백 복합기 45ppm" },
  { code: "ITM-100-004", type: "PRODUCT",    name: "Keysight E5071C",      desc: "Keysight E5071C ENA 네트워크 분석기 9kHz~8.5GHz" },
  { code: "ITM-100-005", type: "PRODUCT",    name: "Keysight N9020B",      desc: "Keysight N9020B MXA 신호 분석기 26.5GHz" },
  { code: "ITM-100-006", type: "CONSUMABLE", name: "Black Toner D330",     desc: "D330 호환 흑백 토너 카트리지 25,000매",     colorChannel: "BLACK",   expectedYield: 25000, compat: ["ITM-100-001"] },
  { code: "ITM-100-007", type: "CONSUMABLE", name: "Cyan Toner X7500",     desc: "X7500 시안 토너 카트리지 15,000매",         colorChannel: "CYAN",    expectedYield: 15000, compat: ["ITM-100-002"] },
  { code: "ITM-100-008", type: "CONSUMABLE", name: "Magenta Toner X7500",  desc: "X7500 마젠타 토너 카트리지 15,000매",        colorChannel: "MAGENTA", expectedYield: 15000, compat: ["ITM-100-002"] },
  { code: "ITM-100-009", type: "CONSUMABLE", name: "Yellow Toner X7500",   desc: "X7500 옐로 토너 카트리지 15,000매",          colorChannel: "YELLOW",  expectedYield: 15000, compat: ["ITM-100-002"] },
  { code: "ITM-100-010", type: "CONSUMABLE", name: "Black Toner X7500",    desc: "X7500 흑백 토너 카트리지 30,000매",          colorChannel: "BLACK",   expectedYield: 30000, compat: ["ITM-100-002"] },
  { code: "ITM-100-011", type: "PART",       name: "Drum Unit D330",       desc: "D330 드럼 유닛 80,000매",                 colorChannel: "DRUM",    expectedYield: 80000, compat: ["ITM-100-001"] },
  { code: "ITM-100-012", type: "PART",       name: "Fuser Unit D330",      desc: "D330 퓨저 어셈블리 (Roller+Sleeve BOM)",   colorChannel: "FUSER",                          compat: ["ITM-100-001"] },
  { code: "ITM-100-013", type: "PART",       name: "Fuser Roller",         desc: "퓨저 가열 롤러 (Fuser Unit BOM 부품)",       colorChannel: "NONE",                           parent: "ITM-100-012" },
  { code: "ITM-100-014", type: "PART",       name: "Teflon Sleeve",        desc: "테플론 코팅 슬리브 (Fuser Unit BOM 부품)",     colorChannel: "NONE",                           parent: "ITM-100-012" },
  { code: "ITM-100-015", type: "SUPPLIES",   name: "A4 용지 80g",          desc: "A4 복사용지 80gsm 500매/박스",                colorChannel: "NONE" },
];
const itemIdMap: Record<string, string> = {};

async function s005Items() {
  log("S-005: 품목 15");
  for (const it of ITEMS_100) {
    const data: any = {
      itemType: it.type, name: it.name, description: it.desc,
      unit: it.type === "SUPPLIES" ? "BOX" : "EA",
      reorderPoint: it.type === "CONSUMABLE" || it.type === "SUPPLIES" ? 10 : null,
      colorChannel: it.colorChannel ?? null,
      expectedYield: it.expectedYield ?? null,
      yieldCoverageBase: it.expectedYield ? 5 : null,
      yieldUnit: it.expectedYield ? "pages" : null,
    };
    const row = await prisma.item.upsert({
      where: { itemCode: it.code },
      update: data,
      create: { itemCode: it.code, ...data },
    });
    itemIdMap[it.code] = row.id;
    inc("created");
  }
}

// S-006: BOM (Fuser Unit → Roller + Sleeve)
async function s006BOM() {
  log("S-006: BOM 트리 (Fuser Unit → 2 children)");
  await prisma.item.update({ where: { id: itemIdMap["ITM-100-012"] }, data: { bomLevel: 1, bomNote: "Fuser Unit 어셈블리" } });
  for (const childCode of ["ITM-100-013", "ITM-100-014"]) {
    await prisma.item.update({
      where: { id: itemIdMap[childCode] },
      data: { parentItemId: itemIdMap["ITM-100-012"], bomLevel: 2, bomQuantity: 1 },
    });
    inc("updated");
  }
}

// S-007: 호환 매핑
async function s007Compat() {
  log("S-007: 호환 매핑");
  for (const it of ITEMS_100) {
    if (!it.compat) continue;
    for (const productCode of it.compat) {
      const pid = itemIdMap[productCode];
      const cid = itemIdMap[it.code];
      if (!pid || !cid) continue;
      await prisma.itemCompatibility.upsert({
        where: { productItemId_consumableItemId: { productItemId: pid, consumableItemId: cid } },
        update: {},
        create: { productItemId: pid, consumableItemId: cid, note: `${it.name} ↔ ${productCode}` },
      });
      inc("created");
    }
  }
}

// S-008: 프로젝트 4
const PROJECTS_100 = [
  { code: "PRJ-100-IT-RENT", name: "IT 렌탈 사업",    type: "RENTAL" as const,      company: "TV" as const },
  { code: "PRJ-100-TM-RENT", name: "TM 렌탈 사업",    type: "RENTAL" as const,      company: "VR" as const },
  { code: "PRJ-100-REPAIR",  name: "수리 서비스",      type: "REPAIR" as const,      company: "TV" as const },
  { code: "PRJ-100-CALIB",   name: "교정 서비스",      type: "CALIBRATION" as const, company: "VR" as const },
];
const projectIdMap: Record<string, string> = {};

async function s008Projects() {
  log("S-008: 프로젝트 4");
  for (const p of PROJECTS_100) {
    const ex = await prisma.project.findFirst({ where: { projectCode: p.code, companyCode: p.company } });
    const row = ex
      ? await prisma.project.update({ where: { id: ex.id }, data: { name: p.name, salesType: p.type } })
      : await prisma.project.create({ data: { projectCode: p.code, name: p.name, salesType: p.type, companyCode: p.company } });
    projectIdMap[p.code] = row.id;
    inc(ex ? "updated" : "created");
  }
}

// S-009: 라이선스 2
async function s009Licenses() {
  log("S-009: 라이선스 2");
  const lics = [
    { code: "LIC-100-001", name: "Microsoft 365 Business",   acquired: "2025-04-01", expires: "2027-03-31", cost: 12_000_000, owner: "EMP-100-001" },
    { code: "LIC-100-002", name: "Antivirus Enterprise",     acquired: "2026-01-01", expires: "2026-12-31", cost: 5_000_000,  owner: "EMP-100-001" },
  ];
  for (const l of lics) {
    const data = {
      name: l.name,
      acquiredAt: new Date(l.acquired), expiresAt: new Date(l.expires),
      renewalCost: l.cost, alertBeforeDays: 30,
      ownerEmployeeId: empIdMap[l.owner] ?? null,
      companyCode: "TV" as const,
    };
    await prisma.license.upsert({
      where: { licenseCode: l.code },
      update: data,
      create: { licenseCode: l.code, ...data },
    });
    inc("created");
  }
}

// S-010: 일정 3
async function s010Schedules() {
  log("S-010: 일정 3");
  const schedules = [
    { code: "SCH-100-001", title: "삼성 정기점검",   due: "2026-05-05T09:00:00Z", relMod: "AS",       targets: ["EMP-100-004"], company: "TV" as const },
    { code: "SCH-100-002", title: "주간 회의",       due: "2026-05-05T14:00:00Z", relMod: "MEETING",  targets: ["EMP-100-001","EMP-100-002","EMP-100-007"], company: "TV" as const },
    { code: "SCH-100-003", title: "도요타 교정",     due: "2026-05-06T10:00:00Z", relMod: "CALIB",    targets: ["EMP-100-009"], company: "VR" as const },
  ];
  for (const s of schedules) {
    const ex = await prisma.schedule.findUnique({ where: { scheduleCode: s.code } }).catch(() => null);
    if (ex) { inc("skipped"); continue; }
    await prisma.schedule.create({
      data: {
        scheduleCode: s.code, title: s.title, dueAt: new Date(s.due),
        relatedModule: s.relMod, alertBeforeHours: 4, companyCode: s.company,
        targets: { connect: s.targets.map((c) => ({ id: empIdMap[c] })).filter((x) => x.id) },
      },
    });
    inc("created");
  }
}

// S-011: 비용 센터 5
const COST_CENTERS_100 = [
  { code: "CC-100-MGMT-BN",  name: "경영-BN",      type: "DEPARTMENT" as const, dept: "DEPT-100-MGMT",     budget: 25_000_000 },
  { code: "CC-100-SALES-HN", name: "영업-HN",      type: "BRANCH" as const,     dept: "DEPT-100-SALES",    budget: 15_000_000 },
  { code: "CC-100-SALES-HCM",name: "영업-HCM",     type: "BRANCH" as const,     dept: "DEPT-100-SALES",    budget: 20_000_000 },
  { code: "CC-100-TECH",     name: "기술팀",        type: "DEPARTMENT" as const, dept: "DEPT-100-TECH",     budget: 30_000_000 },
  { code: "CC-100-IT-RENT",  name: "IT 렌탈사업",   type: "PROJECT" as const,    dept: null, budget: 50_000_000, projectType: "RENTAL_IT" },
];
const costCenterIdMap: Record<string, string> = {};

async function s011CostCenters() {
  log("S-011: 비용 센터 5");
  for (const cc of COST_CENTERS_100) {
    const data = {
      name: cc.name, centerType: cc.type,
      departmentId: cc.dept ? deptIdMap[cc.dept] ?? null : null,
      branchCode: (cc.type === "BRANCH" ? (cc.code.endsWith("HN") ? "HN" : "HCM") : null) as any,
      projectType: (cc as any).projectType ?? null,
      isActive: true, companyCode: "TV" as const,
    };
    const ex = await prisma.costCenter.findUnique({ where: { companyCode_code: { companyCode: "TV", code: cc.code } } }).catch(() => null);
    const row = ex
      ? await prisma.costCenter.update({ where: { id: ex.id }, data })
      : await prisma.costCenter.create({ data: { code: cc.code, ...data } });
    costCenterIdMap[cc.code] = row.id;
    inc(ex ? "updated" : "created");

    // budget 2026-05
    await prisma.budget.upsert({
      where: { costCenterId_yearMonth: { costCenterId: row.id, yearMonth: "2026-05" } },
      update: { budgetAmount: cc.budget },
      create: { costCenterId: row.id, yearMonth: "2026-05", budgetAmount: cc.budget, companyCode: "TV" },
    });
  }
}

// S-012: 은행 계좌 4
const BANK_ACCOUNTS_100 = [
  { code: "ACC-100-001", name: "VCB BN Main",    bank: "Vietcombank",  num: "0011-100001-001", type: "CHECKING" as const, opening: 500_000_000, branch: "BN" as const, company: "TV" as const, threshold: 50_000_000 },
  { code: "ACC-100-002", name: "VCB HN Sales",   bank: "Vietcombank",  num: "0011-100002-002", type: "CHECKING" as const, opening: 200_000_000, branch: "HN" as const, company: "TV" as const, threshold: 30_000_000 },
  { code: "ACC-100-003", name: "현금 시재",       bank: "(현금)",        num: "CASH-100-003",     type: "CASH" as const,     opening: 10_000_000,  branch: "BN" as const, company: "TV" as const, threshold: 15_000_000 },
  { code: "ACC-100-004", name: "MB Bank VR",     bank: "MB Bank",       num: "0011-100004-004", type: "CHECKING" as const, opening: 300_000_000, branch: "BN" as const, company: "VR" as const, threshold: 30_000_000 },
];
const bankIdMap: Record<string, string> = {};

async function s012BankAccounts() {
  log("S-012: 은행 계좌 4");
  for (const a of BANK_ACCOUNTS_100) {
    const data = {
      accountName: a.name, bankName: a.bank, accountNumber: a.num,
      currency: "VND" as const, accountType: a.type,
      openingBalance: a.opening, openingDate: new Date("2025-12-31"),
      currentBalance: a.opening,
      isActive: true, branchCode: a.branch, companyCode: a.company,
      lowBalanceThreshold: a.threshold,
    };
    const row = await prisma.bankAccount.upsert({
      where: { accountCode: a.code },
      update: data,
      create: { accountCode: a.code, ...data },
    });
    bankIdMap[a.code] = row.id;
    inc("created");
  }
}

// S-013/S-014/S-015 — 회계 설정·계정과목·알림규칙은 기존 시드 그대로 사용 (PASS 확인용 카운트만)
async function s013_015Verify() {
  const cfg = await prisma.accountingConfig.count();
  const coa = await prisma.chartOfAccount.count();
  const rules = await prisma.notificationRule.count();
  log(`S-013/14/15: AccountingConfig=${cfg} / ChartOfAccount=${coa} / NotificationRule=${rules}`);
  // VR AccountingConfig 보장
  const vrCfg = await prisma.accountingConfig.findFirst({ where: { companyCode: "VR" } });
  if (!vrCfg) {
    await prisma.accountingConfig.create({
      data: { companyCode: "VR", standard: "VAS", fiscalYearStart: "JAN", reportingCurrency: "VND", defaultVatRate: 0.10 },
    });
    inc("created");
  }
}

// ──────────────────────────────────────────────────────────────────
// PHASE 2 — 매입 + 재고 (S-016 ~ S-025)
// ──────────────────────────────────────────────────────────────────

type PurLine = { item: string; qty: number; price: number; sns?: string[] };
type PurDef = { code: string; supplier: string; lines: PurLine[]; company: "TV"|"VR"; toWh: string };
const PURCHASES_100: PurDef[] = [
  { code: "PUR-100-001", supplier: "CL-100-008", company: "TV", toWh: "WH-100-IT-BN", lines: [{ item: "ITM-100-001", qty: 3, price: 85_000_000, sns: ["SN100-D330-001","SN100-D330-002","SN100-D330-003"] }] },
  { code: "PUR-100-002", supplier: "CL-100-009", company: "TV", toWh: "WH-100-IT-BN", lines: [{ item: "ITM-100-002", qty: 3, price: 150_000_000, sns: ["SN100-X7500-001","SN100-X7500-002","SN100-X7500-003"] }] },
  { code: "PUR-100-003", supplier: "CL-100-008", company: "TV", toWh: "WH-100-IT-BN", lines: [{ item: "ITM-100-003", qty: 1, price: 65_000_000, sns: ["SN100-D410-001"] }] },
  { code: "PUR-100-004", supplier: "CL-100-008", company: "TV", toWh: "WH-100-IT-BN", lines: [{ item: "ITM-100-006", qty: 20, price: 350_000 }] },
  { code: "PUR-100-005", supplier: "CL-100-009", company: "TV", toWh: "WH-100-IT-BN", lines: [
    { item: "ITM-100-007", qty: 10, price: 700_000 },
    { item: "ITM-100-008", qty: 10, price: 700_000 },
    { item: "ITM-100-009", qty: 10, price: 700_000 },
  ] },
  { code: "PUR-100-006", supplier: "CL-100-008", company: "TV", toWh: "WH-100-IT-BN", lines: [{ item: "ITM-100-011", qty: 5, price: 6_000_000 }] },
  { code: "PUR-100-007", supplier: "CL-100-008", company: "TV", toWh: "WH-100-IT-BN", lines: [{ item: "ITM-100-012", qty: 3, price: 3_000_000 }] },
  { code: "PUR-100-008", supplier: "CL-100-010", company: "VR", toWh: "WH-100-TM-BN", lines: [
    { item: "ITM-100-004", qty: 2, price: 200_000_000, sns: ["SN100-E5071C-001","SN100-E5071C-002"] },
    { item: "ITM-100-005", qty: 3, price: 150_000_000, sns: ["SN100-N9020B-001","SN100-N9020B-002","SN100-N9020B-003"] },
  ] },
  { code: "PUR-100-009", supplier: "CL-100-008", company: "TV", toWh: "WH-100-IT-BN", lines: [{ item: "ITM-100-015", qty: 100, price: 100_000 }] },
  { code: "PUR-100-010", supplier: "CL-100-009", company: "TV", toWh: "WH-100-IT-BN", lines: [{ item: "ITM-100-010", qty: 10, price: 500_000 }] },
];
const purchaseIdMap: Record<string, string> = {};

async function s016Purchases() {
  log("S-016: 매입 10건 (재고 입고 + S/N + 미지급금 + 분개)");
  for (const p of PURCHASES_100) {
    const supplier = await prisma.client.findUnique({ where: { clientCode: p.supplier } });
    if (!supplier) { inc("errors"); continue; }
    const total = p.lines.reduce((s, l) => s + l.qty * l.price, 0);
    let pur = await prisma.purchase.findUnique({ where: { purchaseNumber: p.code } });
    if (!pur) {
      pur = await prisma.purchase.create({
        data: {
          purchaseNumber: p.code, supplierId: supplier.id, totalAmount: total,
          currency: "VND", fxRate: 1, warehouseInboundDone: true,
          companyCode: p.company, warehouseId: whIdMap[p.toWh],
          projectId: projectIdMap[p.company === "VR" ? "PRJ-100-TM-RENT" : "PRJ-100-IT-RENT"] ?? null,
          note: `S-016 자동 시드`,
        },
      });
      inc("created");
    }
    purchaseIdMap[p.code] = pur.id;

    for (const ln of p.lines) {
      const itemId = itemIdMap[ln.item];
      const ex = await prisma.purchaseItem.findFirst({ where: { purchaseId: pur.id, itemId } });
      if (!ex) {
        await prisma.purchaseItem.create({
          data: { purchaseId: pur.id, itemId, quantity: ln.qty, unitPrice: ln.price, amount: ln.qty * ln.price, companyCode: p.company },
        });
      }
      // S/N
      if (ln.sns) {
        for (const sn of ln.sns) {
          const exItem = await prisma.inventoryItem.findUnique({ where: { serialNumber: sn } });
          if (!exItem) {
            await prisma.inventoryItem.create({
              data: {
                itemId, serialNumber: sn, warehouseId: whIdMap[p.toWh],
                companyCode: p.company, status: "NORMAL", ownerType: "COMPANY",
                acquiredAt: new Date(),
                qrData: JSON.stringify({ sn, itemCode: ln.item, purchaseId: pur.id }),
              },
            });
          }
        }
      }
      // InventoryTransaction (S/N 별 또는 단순 IN)
      const txnSns = ln.sns ?? [null];
      for (const sn of txnSns) {
        const exTxn = await prisma.inventoryTransaction.findFirst({ where: {
          itemId, txnType: "IN", serialNumber: sn ?? undefined,
          toWarehouseId: whIdMap[p.toWh], companyCode: p.company,
          referenceModule: "TRADE", subKind: "PURCHASE",
        } });
        if (!exTxn) {
          await prisma.inventoryTransaction.create({
            data: {
              companyCode: p.company, itemId, txnType: "IN", reason: "PURCHASE",
              referenceModule: "TRADE", subKind: "PURCHASE",
              toWarehouseId: whIdMap[p.toWh], quantity: sn ? 1 : ln.qty,
              serialNumber: sn ?? undefined,
              clientId: supplier.id,
              note: `${p.code} 자동 입고`,
            },
          });
        }
      }
    }

    // S-018: 미지급금 (PAYABLE)
    const exPR = await prisma.payableReceivable.findFirst({ where: { purchaseId: pur.id } });
    if (!exPR) {
      const due = new Date(); due.setDate(due.getDate() + (supplier.paymentTerms ?? 30));
      await prisma.payableReceivable.create({
        data: {
          companyCode: p.company, kind: "PAYABLE", clientId: supplier.id,
          purchaseId: pur.id, amount: total, status: "OPEN", dueDate: due,
        },
      });
      inc("created");
    }

    // S-019: 자동 분개 (JE) — 차) 156 상품 / 대) 331 외상매입금
    const exJE = await prisma.journalEntry.findFirst({ where: { source: "PURCHASE", sourceModuleId: pur.id } });
    if (exJE) {
      await prisma.journalEntry.update({ where: { id: exJE.id }, data: { entryDate: new Date("2026-04-15") } });
    }
    if (!exJE) {
      const entryNo = `JE-100-PUR-${p.code.slice(-3)}`;
      await prisma.journalEntry.create({
        data: {
          entryNo, entryDate: new Date("2026-04-15"), description: `${p.code} 매입 자동분개 (시드)`,
          status: "POSTED", source: "PURCHASE", sourceModuleId: pur.id,
          postedAt: new Date(), companyCode: p.company,
          lines: { create: [
            { lineNo: 1, accountCode: "156", debitAmount: total,  creditAmount: 0,    description: "상품 매입", companyCode: p.company },
            { lineNo: 2, accountCode: "331", debitAmount: 0,      creditAmount: total, description: "외상매입금 발생", companyCode: p.company, clientId: supplier.id },
          ] },
        },
      });
      inc("created");
    }
  }
}

// S-021~S-025: 진리표 시나리오 5개
async function s021_025InventoryScenarios() {
  log("S-021~025: 진리표 시나리오 (RENTAL_RETURN, REPAIR_REQUEST, REPAIR_RETURN, TRANSFER, CONSUMABLE)");

  const samsung = await prisma.client.findUnique({ where: { clientCode: "CL-100-001" } });
  const canon = await prisma.client.findUnique({ where: { clientCode: "CL-100-003" } });
  if (!samsung || !canon) { inc("errors"); return; }

  // S-021: IN/RENTAL/RETURN/COMPANY — D330-003 회수
  const sn021 = "SN100-D330-003";
  const item021 = await prisma.inventoryItem.findUnique({ where: { serialNumber: sn021 } });
  if (item021) {
    await prisma.inventoryItem.update({ where: { id: item021.id }, data: { warehouseId: whIdMap["WH-100-IT-BN"], currentLocationClientId: null, currentLocationSinceAt: null } });
    const exTxn = await prisma.inventoryTransaction.findFirst({ where: { serialNumber: sn021, referenceModule: "RENTAL", subKind: "RETURN" } });
    if (!exTxn) {
      await prisma.inventoryTransaction.create({
        data: {
          companyCode: "TV", itemId: item021.itemId, txnType: "IN", reason: "RENTAL_IN",
          referenceModule: "RENTAL", subKind: "RETURN",
          toWarehouseId: whIdMap["WH-100-IT-BN"], quantity: 1,
          serialNumber: sn021, clientId: samsung.id,
          note: "S-021 RENTAL/RETURN",
        },
      });
      inc("created");
    }
  }

  // S-022: IN/REPAIR/REQUEST/EXTERNAL — 캐논 자산 수리 의뢰 입고 (외부 자산)
  const repairSN = "SN100-CANON-REP-001";
  const exRepair = await prisma.inventoryItem.findUnique({ where: { serialNumber: repairSN } });
  if (!exRepair) {
    const created = await prisma.inventoryItem.create({
      data: {
        itemId: itemIdMap["ITM-100-002"], serialNumber: repairSN,
        warehouseId: whIdMap["WH-100-IT-BN"], companyCode: "TV",
        status: "NEEDS_REPAIR", ownerType: "EXTERNAL_CLIENT",
        ownerClientId: canon.id, inboundReason: "REPAIR_IN", inboundAt: new Date(),
        acquiredAt: new Date(),
      },
    });
    await prisma.inventoryTransaction.create({
      data: {
        companyCode: "TV", itemId: itemIdMap["ITM-100-002"], txnType: "IN", reason: "REPAIR_IN",
        referenceModule: "REPAIR", subKind: "REQUEST",
        toWarehouseId: whIdMap["WH-100-IT-BN"], quantity: 1,
        serialNumber: repairSN, clientId: canon.id,
        note: "S-022 REPAIR/REQUEST EXTERNAL",
      },
    });
    inc("created");
  }

  // S-023: OUT/REPAIR/RETURN/EXTERNAL — 수리 완료 반환 (archive)
  const item023 = await prisma.inventoryItem.findUnique({ where: { serialNumber: repairSN } });
  if (item023 && !item023.archivedAt) {
    await prisma.inventoryItem.update({ where: { id: item023.id }, data: { archivedAt: new Date(), status: "NORMAL" } });
    const txn = await prisma.inventoryTransaction.create({
      data: {
        companyCode: "TV", itemId: itemIdMap["ITM-100-002"], txnType: "OUT", reason: "REPAIR_OUT",
        referenceModule: "REPAIR", subKind: "RETURN",
        fromWarehouseId: whIdMap["WH-100-IT-BN"], quantity: 1,
        serialNumber: repairSN, clientId: canon.id,
        note: "S-023 REPAIR/RETURN EXTERNAL — 수리비 청구",
      },
    });
    // 매출후보 DRAFT
    await prisma.payableReceivable.create({
      data: {
        companyCode: "TV", kind: "RECEIVABLE", clientId: canon.id, amount: 0,
        status: "DRAFT", sourceInventoryTxnId: txn.id,
      },
    });
    inc("created");
  }

  // S-024: TRANSFER/TRADE/OTHER/COMPANY — WH-IT-BN → WH-IT-HN (D330 1대 이동)
  const sn024 = "SN100-D330-002";
  const item024 = await prisma.inventoryItem.findUnique({ where: { serialNumber: sn024 } });
  if (item024) {
    await prisma.inventoryItem.update({ where: { id: item024.id }, data: { warehouseId: whIdMap["WH-100-IT-HN"] } });
    const exTrans = await prisma.inventoryTransaction.findFirst({ where: { serialNumber: sn024, txnType: "TRANSFER" } });
    if (!exTrans) {
      await prisma.inventoryTransaction.create({
        data: {
          companyCode: "TV", itemId: item024.itemId, txnType: "TRANSFER", reason: "OTHER_IN",
          referenceModule: "TRADE", subKind: "OTHER",
          fromWarehouseId: whIdMap["WH-100-IT-BN"], toWarehouseId: whIdMap["WH-100-IT-HN"],
          quantity: 1, serialNumber: sn024,
          note: "S-024 내부재고이동 BN→HN",
        },
      });
      inc("created");
    }
  }

  // S-025: OUT/CONSUMABLE/CONSUMABLE/COMPANY — Black Toner D330 × 2 (AS 부품 사용 시뮬)
  const exCons = await prisma.inventoryTransaction.findFirst({ where: {
    itemId: itemIdMap["ITM-100-006"], referenceModule: "CONSUMABLE", subKind: "CONSUMABLE",
    note: { contains: "S-025" },
  } });
  if (!exCons) {
    await prisma.inventoryTransaction.create({
      data: {
        companyCode: "TV", itemId: itemIdMap["ITM-100-006"], txnType: "OUT", reason: "CONSUMABLE_OUT",
        referenceModule: "CONSUMABLE", subKind: "CONSUMABLE",
        fromWarehouseId: whIdMap["WH-100-IT-BN"], quantity: 2,
        targetEquipmentSN: "SN100-D330-001",
        note: "S-025 소모품출고 (AS 부품 사용)",
      },
    });
    inc("created");
  }
}

// ──────────────────────────────────────────────────────────────────
// PHASE 3 — IT/TM 렌탈 (S-026 ~ S-040)
// ──────────────────────────────────────────────────────────────────

type ItContractDef = {
  code: string; client: string; salesEmp: string; start: string; end: string; coverage: number;
  equipments: { sn: string; itemCode: string; ip: string; deviceModel: string; baseBw?: number; baseColor?: number; rateBw?: number; rateColor?: number; monthlyBase?: number; }[];
};
const IT_CONTRACTS_100: ItContractDef[] = [
  { code: "TLS-100-001", client: "CL-100-001", salesEmp: "EMP-100-002", start: "2026-01-01", end: "2027-12-31", coverage: 5,
    equipments: [
      { sn: "SN100-D330-001", itemCode: "ITM-100-001", ip: "10.10.1.10", deviceModel: "SINDOH_D330", baseBw: 1000, baseColor: 0,   rateBw: 500, rateColor: 0,    monthlyBase: 800_000 },
      { sn: "SN100-D330-002", itemCode: "ITM-100-001", ip: "10.10.1.11", deviceModel: "SINDOH_D330", baseBw: 1000, baseColor: 0,   rateBw: 500, rateColor: 0,    monthlyBase: 800_000 },
      { sn: "SN100-X7500-001",itemCode: "ITM-100-002", ip: "10.10.1.12", deviceModel: "SAMSUNG_X7500",baseBw: 1500, baseColor: 300, rateBw: 400, rateColor: 1500, monthlyBase: 1_400_000 },
    ] },
  { code: "TLS-100-002", client: "CL-100-002", salesEmp: "EMP-100-002", start: "2026-02-01", end: "2027-01-31", coverage: 5,
    equipments: [
      { sn: "SN100-D330-003", itemCode: "ITM-100-001", ip: "10.10.2.10", deviceModel: "SINDOH_D330", baseBw: 1000, rateBw: 500, monthlyBase: 800_000 },
      { sn: "SN100-D410-001", itemCode: "ITM-100-003", ip: "10.10.2.11", deviceModel: "SINDOH_D410", baseBw: 2000, rateBw: 300, monthlyBase: 1_000_000 },
    ] },
  { code: "TLS-100-003", client: "CL-100-003", salesEmp: "EMP-100-003", start: "2026-01-01", end: "2027-12-31", coverage: 5,
    equipments: [
      { sn: "SN100-X7500-002", itemCode: "ITM-100-002", ip: "10.10.3.10", deviceModel: "SAMSUNG_X7500", baseBw: 1500, baseColor: 300, rateBw: 400, rateColor: 1500, monthlyBase: 1_250_000 },
      { sn: "SN100-X7500-003", itemCode: "ITM-100-002", ip: "10.10.3.11", deviceModel: "SAMSUNG_X7500", baseBw: 1500, baseColor: 300, rateBw: 400, rateColor: 1500, monthlyBase: 1_250_000 },
    ] },
  { code: "TLS-100-004", client: "CL-100-006", salesEmp: "EMP-100-003", start: "2026-03-01", end: "2027-02-28", coverage: 5,
    equipments: [{ sn: "SN100-POSCO-D330-001", itemCode: "ITM-100-001", ip: "10.10.4.10", deviceModel: "SINDOH_D330", baseBw: 1000, rateBw: 500, monthlyBase: 800_000 }] },
  { code: "TLS-100-005", client: "CL-100-007", salesEmp: "EMP-100-002", start: "2026-01-01", end: "2027-12-31", coverage: 10,
    equipments: [{ sn: "SN100-BUSAN-X7500-001", itemCode: "ITM-100-002", ip: "10.10.5.10", deviceModel: "SAMSUNG_X7500", baseBw: 1500, baseColor: 300, rateBw: 400, rateColor: 1500, monthlyBase: 1_200_000 }] },
];
const itContractIdMap: Record<string, { contractId: string; equipments: Record<string, string> }> = {};

async function s026ItContracts() {
  log("S-026: IT 계약 5건 + 장비 9대");
  for (const c of IT_CONTRACTS_100) {
    const client = await prisma.client.findUnique({ where: { clientCode: c.client } });
    if (!client) { inc("errors"); continue; }
    let contract = await prisma.itContract.findFirst({ where: { contractNumber: c.code } });
    if (!contract) {
      contract = await prisma.itContract.create({
        data: {
          contractNumber: c.code, clientId: client.id, status: "ACTIVE",
          startDate: new Date(c.start), endDate: new Date(c.end),
          installationAddress: client.address ?? "",
          snmpCollectDay: 25,
          contractMgrName: "이대표", contractMgrPhone: "0901100001", contractMgrEmail: "admin100@tt.vn",
          technicalMgrName: "Khang Tech", technicalMgrPhone: "0901100004", technicalMgrEmail: "khang100@tt.vn",
          financeMgrName: "최회계", financeMgrPhone: "0901100007", financeMgrEmail: "acct100@tt.vn",
          companyCode: "TV",
        },
      });
      inc("created");
    }
    const eqMap: Record<string, string> = {};
    for (const eq of c.equipments) {
      const itemId = itemIdMap[eq.itemCode];
      const ex = await prisma.itContractEquipment.findFirst({ where: { itContractId: contract.id, serialNumber: eq.sn } });
      const data = {
        itemId, deviceIp: eq.ip, deviceModel: eq.deviceModel, snmpCommunity: "public",
        actualCoverage: c.coverage, installCounterBw: 0, installCounterColor: 0,
        baseIncludedBw: eq.baseBw ?? 0, baseIncludedColor: eq.baseColor ?? 0,
        extraRateBw: eq.rateBw ?? 0, extraRateColor: eq.rateColor ?? 0,
        bwIncludedPages: eq.baseBw ?? 0, bwOverageRate: eq.rateBw ?? 0,
        colorIncludedPages: eq.baseColor ?? 0, colorOverageRate: eq.rateColor ?? 0,
        monthlyBaseFee: eq.monthlyBase ?? 0,
        installedAt: new Date(c.start),
      };
      const row = ex
        ? await prisma.itContractEquipment.update({ where: { id: ex.id }, data })
        : await prisma.itContractEquipment.create({ data: { ...data, itContractId: contract.id, serialNumber: eq.sn } });
      eqMap[eq.sn] = row.id;
    }
    itContractIdMap[c.code] = { contractId: contract.id, equipments: eqMap };
  }
}

// S-027~S-029: Amendment 데이터 (직접 ItContractAmendment 생성)
async function s027_029Amendments() {
  log("S-027~029: Amendment ADD/REPLACE/REMOVE");
  const t1 = itContractIdMap["TLS-100-001"];
  const t2 = itContractIdMap["TLS-100-002"];
  const t4 = itContractIdMap["TLS-100-004"];
  const performer = empIdMap["EMP-100-001"] ?? "";
  if (!t1 || !t2 || !t4) return;
  // ADD on TLS-001
  const exAdd = await prisma.itContractAmendment.findUnique({ where: { amendmentCode: "AMD-IT-100-001" } }).catch(() => null);
  if (!exAdd) {
    await prisma.itContractAmendment.create({
      data: {
        amendmentCode: "AMD-IT-100-001", contractId: t1.contractId, type: "ADD_EQUIPMENT",
        effectiveDate: new Date("2026-04-01"), performedById: performer,
        reasonKo: "S-027 장비 1대 추가 (시드)", companyCode: "TV",
        items: { create: [{ action: "ADD", itemId: itemIdMap["ITM-100-001"], serialNumber: "SN100-D330-ADD1", monthlyBaseFee: 800_000, companyCode: "TV" }] },
      },
    }).catch((e) => console.warn("AMD ADD fail:", String(e).slice(0, 120)));
    inc("created");
  }
  // REPLACE on TLS-002
  const exRep = await prisma.itContractAmendment.findUnique({ where: { amendmentCode: "AMD-IT-100-002" } }).catch(() => null);
  if (!exRep) {
    await prisma.itContractAmendment.create({
      data: {
        amendmentCode: "AMD-IT-100-002", contractId: t2.contractId, type: "REPLACE_EQUIPMENT",
        effectiveDate: new Date("2026-04-15"), performedById: performer,
        reasonKo: "S-028 D330-003 → D330-NEW1 교체", companyCode: "TV",
        items: { create: [
          { action: "REPLACE_OUT", itemId: itemIdMap["ITM-100-001"], serialNumber: "SN100-D330-003", companyCode: "TV" },
          { action: "REPLACE_IN",  itemId: itemIdMap["ITM-100-001"], serialNumber: "SN100-D330-NEW1", monthlyBaseFee: 800_000, companyCode: "TV" },
        ] },
      },
    }).catch((e) => console.warn("AMD REPLACE fail:", String(e).slice(0, 120)));
    inc("created");
  }
  // REMOVE on TLS-004
  const exRem = await prisma.itContractAmendment.findUnique({ where: { amendmentCode: "AMD-IT-100-003" } }).catch(() => null);
  if (!exRem) {
    await prisma.itContractAmendment.create({
      data: {
        amendmentCode: "AMD-IT-100-003", contractId: t4.contractId, type: "REMOVE_EQUIPMENT",
        effectiveDate: new Date("2026-04-20"), performedById: performer,
        reasonKo: "S-029 POSCO-D330 회수 → 재고 복귀", companyCode: "TV",
        items: { create: [{ action: "REMOVE", itemId: itemIdMap["ITM-100-001"], serialNumber: "SN100-POSCO-D330-001", companyCode: "TV" }] },
      },
    }).catch((e) => console.warn("AMD REMOVE fail:", String(e).slice(0, 120)));
    inc("created");
  }
}

// S-030: 조기 종료 — TLS-004
async function s030EarlyTerminate() {
  log("S-030: TLS-100-004 조기 종료");
  const t = itContractIdMap["TLS-100-004"];
  if (!t) return;
  const c = await prisma.itContract.findUnique({ where: { id: t.contractId } });
  if (c && !c.terminatedAt) {
    await prisma.itContract.update({
      where: { id: t.contractId },
      data: { terminatedAt: new Date("2026-04-25"), terminationReason: "POSCO 사업장 정리 (S-030)", status: "CANCELED" },
    });
    inc("updated");
  }
}

// S-031: TM 렌탈 3
type TmDef = { code: string; client: string; items: { itemCode: string; sn: string; price: number }[]; start: string; end: string; company: "TV"|"VR" };
const TM_RENTALS_100: TmDef[] = [
  { code: "TM-100-001", client: "CL-100-004", items: [{ itemCode: "ITM-100-004", sn: "SN100-TM-E5071C-001", price: 5_000_000 }], start: "2026-01-01", end: "2026-06-30", company: "VR" },
  { code: "TM-100-002", client: "CL-100-005", items: [{ itemCode: "ITM-100-005", sn: "SN100-TM-N9020B-001", price: 4_000_000 }], start: "2026-02-01", end: "2026-07-31", company: "VR" },
  { code: "TM-100-003", client: "CL-100-006", items: [{ itemCode: "ITM-100-004", sn: "SN100-TM-E5071C-002", price: 5_500_000 }], start: "2026-03-01", end: "2026-08-31", company: "TV" },
];
const tmRentalIdMap: Record<string, string> = {};

async function s031TmRentals() {
  log("S-031: TM 렌탈 3건");
  for (const t of TM_RENTALS_100) {
    const client = await prisma.client.findUnique({ where: { clientCode: t.client } });
    if (!client) { inc("errors"); continue; }
    let r = await prisma.tmRental.findUnique({ where: { rentalCode: t.code } }).catch(() => null);
    if (!r) {
      r = await prisma.tmRental.create({
        data: {
          rentalCode: t.code, clientId: client.id, address: client.address ?? "",
          startDate: new Date(t.start), endDate: new Date(t.end),
          contractMgrName: "Mr. Tuan", contractMgrPhone: "0901100008", contractMgrEmail: "tuan100@vr.vn",
          companyCode: t.company,
        },
      });
      inc("created");
    }
    tmRentalIdMap[t.code] = r.id;
    for (const it of t.items) {
      const exIt = await prisma.tmRentalItem.findFirst({ where: { tmRentalId: r.id, serialNumber: it.sn } });
      if (!exIt) {
        await prisma.tmRentalItem.create({
          data: {
            tmRentalId: r.id, itemId: itemIdMap[it.itemCode],
            serialNumber: it.sn, salesPrice: it.price,
            startDate: new Date(t.start), endDate: new Date(t.end),
            supplierName: "Keysight Korea", purchasePrice: it.price * 0.7,
            companyCode: t.company,
          },
        });
      }
    }
  }
}

// S-032: TM 조기 종료
async function s032TmTerminate() {
  log("S-032: TM-100-001 조기 종료");
  const id = tmRentalIdMap["TM-100-001"];
  if (!id) return;
  const r = await prisma.tmRental.findUnique({ where: { id } });
  if (r && !r.terminatedAt) {
    await prisma.tmRental.update({
      where: { id }, data: { terminatedAt: new Date("2026-04-30"), terminationReason: "도요타 프로젝트 종료 (S-032)", status: "CANCELED" },
    });
    inc("updated");
  }
}

// S-033: SNMP 카운터 — 9대 × 3개월
async function s033SnmpReadings() {
  log("S-033: SNMP 카운터 시드 (3개월 × 9 장비 = 27건)");
  // 카운터 데이터 시뮬: 월간 약 1500~2500매 BW + 컬러는 X7500만
  const monthlyDelta: Record<string, { bw: number[]; color: number[] }> = {
    "SN100-D330-001":      { bw: [1200, 1280, 1340], color: [0, 0, 0] },
    "SN100-D330-002":      { bw: [1100, 1150, 1200], color: [0, 0, 0] },
    "SN100-X7500-001":     { bw: [1800, 1850, 1920], color: [320, 350, 380] },
    "SN100-D330-003":      { bw: [1300, 1380, 1410], color: [0, 0, 0] },
    "SN100-D410-001":      { bw: [2200, 2300, 2400], color: [0, 0, 0] },
    "SN100-X7500-002":     { bw: [1600, 1680, 1750], color: [310, 340, 360] },
    "SN100-X7500-003":     { bw: [1700, 1780, 1850], color: [320, 350, 380] },
    "SN100-POSCO-D330-001":{ bw: [1100, 1160, 1210], color: [0, 0, 0] },
    "SN100-BUSAN-X7500-001":{bw: [1500, 1580, 1650], color: [310, 340, 370] },
  };
  const dates = [new Date("2026-01-31T23:00:00.000Z"), new Date("2026-02-28T23:00:00.000Z"), new Date("2026-03-31T23:00:00.000Z")];

  for (const c of Object.values(itContractIdMap)) {
    const contract = await prisma.itContract.findUnique({ where: { id: c.contractId }, select: { clientId: true } });
    if (!contract) continue;
    for (const [sn, eqId] of Object.entries(c.equipments)) {
      const d = monthlyDelta[sn];
      if (!d) continue;
      let bwAcc = 0, colorAcc = 0;
      for (let i = 0; i < 3; i++) {
        bwAcc += d.bw[i];
        colorAcc += d.color[i];
        await prisma.snmpReading.upsert({
          where: { equipmentId_collectedAt: { equipmentId: eqId, collectedAt: dates[i] } },
          update: { totalPages: bwAcc + colorAcc, bwPages: bwAcc, colorPages: colorAcc },
          create: {
            equipmentId: eqId, contractId: c.contractId, clientId: contract.clientId,
            brand: "TestBrand", itemName: "ITM-100", serialNumber: sn,
            totalPages: bwAcc + colorAcc, bwPages: bwAcc, colorPages: colorAcc,
            collectedAt: dates[i], collectedBy: "AGENT", companyCode: "TV",
          },
        });
        inc("created");
      }
    }
  }
}

// S-034: 사용량 확인서 — 5계약 × 3개월 = 15. 상태 다양화
async function s034UsageConfirmations() {
  log("S-034: 사용량 확인서 15건 (상태 다양화)");
  const months = [
    { ym: "2026-01", start: "2026-01-01", end: "2026-01-31" },
    { ym: "2026-02", start: "2026-02-01", end: "2026-02-28" },
    { ym: "2026-03", start: "2026-03-01", end: "2026-03-31" },
  ];
  const statusByIdx = ["COLLECTED","CUSTOMER_CONFIRMED","ADMIN_CONFIRMED","PDF_GENERATED","BILLED"] as const;
  let idx = 0;
  for (const code of ["TLS-100-001","TLS-100-002","TLS-100-003","TLS-100-004","TLS-100-005"]) {
    const c = itContractIdMap[code];
    if (!c) continue;
    const contract = await prisma.itContract.findUnique({ where: { id: c.contractId } });
    if (!contract) continue;
    for (const m of months) {
      const confirmCode = `UC-100-${code.slice(-3)}-${m.ym.replace("-","")}`;
      const ex = await prisma.usageConfirmation.findUnique({ where: { confirmCode } }).catch(() => null);
      const status = statusByIdx[idx % statusByIdx.length] as any;
      idx++;
      const data: any = {
        contractId: c.contractId, clientId: contract.clientId,
        billingMonth: m.ym, periodStart: new Date(m.start), periodEnd: new Date(m.end),
        equipmentUsage: Object.entries(c.equipments).map(([sn, eqId]) => ({ sn, equipmentId: eqId, bwPages: 1500, colorPages: 200, amount: 1_000_000 })),
        totalAmount: 3_000_000, currency: "VND",
        status, companyCode: "TV",
        customerConfirmedAt: ["CUSTOMER_CONFIRMED","ADMIN_CONFIRMED","PDF_GENERATED","BILLED"].includes(status) ? new Date(`${m.ym}-15`) : null,
        adminConfirmedAt: ["ADMIN_CONFIRMED","PDF_GENERATED","BILLED"].includes(status) ? new Date(`${m.ym}-20`) : null,
      };
      if (ex) await prisma.usageConfirmation.update({ where: { id: ex.id }, data });
      else await prisma.usageConfirmation.create({ data: { confirmCode, ...data } });
      inc("created");
    }
  }
}

// S-040: YieldAnalysis 시드 (TLS-100-001 × 3개월)
async function s040YieldAnalysis() {
  log("S-040: 적정율 분석 시드 (TLS-001 × 3개월)");
  const contractInfo = itContractIdMap["TLS-100-001"];
  if (!contractInfo) return;
  const contract = await prisma.itContract.findUnique({ where: { id: contractInfo.contractId } });
  if (!contract) return;
  const months = [
    { ps: new Date("2026-01-01"), pe: new Date("2026-01-31") },
    { ps: new Date("2026-02-01"), pe: new Date("2026-02-28") },
    { ps: new Date("2026-03-01"), pe: new Date("2026-03-31") },
  ];
  for (const m of months) {
    for (const [sn, eqId] of Object.entries(contractInfo.equipments)) {
      const ex = await prisma.yieldAnalysis.findFirst({ where: { equipmentId: eqId, periodStart: m.ps, periodEnd: m.pe } }).catch(() => null);
      if (ex) continue;
      const isColor = sn.includes("X7500");
      await prisma.yieldAnalysis.create({
        data: {
          equipmentId: eqId, contractId: contractInfo.contractId, clientId: contract.clientId,
          periodStart: m.ps, periodEnd: m.pe,
          actualPagesBw: 1500, actualPagesColor: isColor ? 320 : 0,
          consumablesUsed: [{ itemCode: "ITM-100-006", quantity: 1, expectedYield: 25000 }],
          actualCoverage: 5,
          expectedPagesBw: 1600, expectedPagesColor: isColor ? 350 : 0,
          yieldRateBw: 93.7, yieldRateColor: isColor ? 91.4 : null,
          badgeBw: "GREEN", badgeColor: isColor ? "GREEN" : null,
          isFraudSuspect: false, companyCode: "TV",
        },
      }).catch((e) => console.warn("yield fail:", String(e).slice(0, 100)));
      inc("created");
    }
  }
}

// ──────────────────────────────────────────────────────────────────
// PHASE 4 — AS (S-041 ~ S-055)
// ──────────────────────────────────────────────────────────────────

async function s041_046AsTickets() {
  log("S-041~046: AS 티켓 10 + 출동 + 부품 투입 (부정의심 1건 포함)");
  const cases = [
    { code: "AS-100-001", client: "CL-100-001", sn: "SN100-D330-001",   emp: "EMP-100-004", symptom: "급지 안됨",     parts: [{ item: "ITM-100-013", qty: 1 }], status: "COMPLETED" as const, company: "TV" as const },
    { code: "AS-100-002", client: "CL-100-001", sn: "SN100-X7500-001",  emp: "EMP-100-004", symptom: "토너 교체",     parts: [{ item: "ITM-100-010", qty: 1 }], status: "COMPLETED" as const, company: "TV" as const },
    { code: "AS-100-003", client: "CL-100-002", sn: "SN100-D330-003",   emp: "EMP-100-005", symptom: "드럼 수명 임박", parts: [{ item: "ITM-100-011", qty: 1 }], status: "COMPLETED" as const, company: "TV" as const },
    { code: "AS-100-004", client: "CL-100-003", sn: "SN100-X7500-002",  emp: "EMP-100-006", symptom: "컬러 줄무늬",   parts: [{ item: "ITM-100-007", qty: 1 }, { item: "ITM-100-008", qty: 1 }], status: "COMPLETED" as const, company: "TV" as const },
    { code: "AS-100-005", client: "CL-100-006", sn: "SN100-POSCO-D330-001", emp: "EMP-100-004", symptom: "용지걸림",       parts: [{ item: "ITM-100-012", qty: 1 }], status: "COMPLETED" as const, company: "TV" as const },
    { code: "AS-100-006", client: "CL-100-007", sn: "SN100-BUSAN-X7500-001", emp: "EMP-100-004", symptom: "정기점검",       parts: [{ item: "ITM-100-009", qty: 1 }], status: "COMPLETED" as const, company: "TV" as const },
    { code: "AS-100-007", client: "CL-100-001", sn: "SN100-D330-001",   emp: "EMP-100-005", symptom: "토너 교체 2회차", parts: [{ item: "ITM-100-006", qty: 2 }], status: "COMPLETED" as const, company: "TV" as const },
    { code: "AS-100-008", client: "CL-100-004", sn: "SN100-TM-E5071C-001", emp: "EMP-100-009", symptom: "교정 전 점검",   parts: [], status: "COMPLETED" as const, company: "VR" as const },
    { code: "AS-100-009", client: "CL-100-005", sn: "SN100-TM-N9020B-001", emp: "EMP-100-009", symptom: "정기 PM",       parts: [], status: "IN_PROGRESS" as const, company: "VR" as const },
    // S-046 부정의심 — 토너 5+3+3+3 = 적정율 낮게
    { code: "AS-100-010", client: "CL-100-003", sn: "SN100-X7500-003",  emp: "EMP-100-004", symptom: "토너 과다 사용",
      parts: [
        { item: "ITM-100-010", qty: 5 }, // K
        { item: "ITM-100-007", qty: 3 }, // C
        { item: "ITM-100-008", qty: 3 }, // M
        { item: "ITM-100-009", qty: 3 }, // Y
      ], status: "COMPLETED" as const, company: "TV" as const },
  ];
  for (const c of cases) {
    const client = await prisma.client.findUnique({ where: { clientCode: c.client } });
    if (!client) { inc("errors"); continue; }
    let ticket = await prisma.asTicket.findUnique({ where: { ticketNumber: c.code } }).catch(() => null);
    const ticketData = {
      clientId: client.id, serialNumber: c.sn,
      assignedToId: empIdMap[c.emp], status: c.status,
      receivedAt: new Date("2026-04-01"),
      completedAt: c.status === "COMPLETED" ? new Date("2026-04-10") : null,
      symptomKo: c.symptom, originalLang: "KO" as const,
      kind: "AS_REQUEST" as const, companyCode: c.company,
    };
    ticket = ticket
      ? await prisma.asTicket.update({ where: { id: ticket.id }, data: ticketData })
      : await prisma.asTicket.create({ data: { ticketNumber: c.code, ...ticketData } });
    inc("created");

    // dispatch
    let dispatch = await prisma.asDispatch.findFirst({ where: { asTicketId: ticket.id } });
    if (!dispatch) {
      dispatch = await prisma.asDispatch.create({
        data: {
          asTicketId: ticket.id, dispatchEmployeeId: empIdMap[c.emp],
          targetEquipmentSN: c.sn, transportCost: 200_000,
          completedAt: c.status === "COMPLETED" ? new Date("2026-04-10") : null,
          companyCode: c.company,
        },
      });
      inc("created");
    }

    // parts — 기존 삭제 후 재생성 (멱등)
    await prisma.asDispatchPart.deleteMany({ where: { asDispatchId: dispatch.id } });
    for (const p of c.parts) {
      const itemId = itemIdMap[p.item];
      if (!itemId) continue;
      const part = await prisma.asDispatchPart.create({
        data: {
          asDispatchId: dispatch.id, itemId, quantity: p.qty,
          targetEquipmentSN: c.sn ?? "", companyCode: c.company,
          unitCost: 350_000, totalCost: 350_000 * p.qty,
        },
      });
      // OUT 트랜잭션
      const txn = await prisma.inventoryTransaction.create({
        data: {
          companyCode: c.company, itemId, txnType: "OUT", reason: "CONSUMABLE_OUT",
          referenceModule: "CONSUMABLE", subKind: "CONSUMABLE",
          fromWarehouseId: whIdMap["WH-100-IT-BN"], quantity: p.qty,
          targetEquipmentSN: c.sn ?? null,
          note: `${c.code} 부품 투입`,
        },
      });
      await prisma.asDispatchPart.update({ where: { id: part.id }, data: { inventoryTxnId: txn.id } });
    }
  }
}

// S-054~S-055: 포탈 AS/소모품 요청 시드
async function s054_055PortalRequests() {
  log("S-054~055: 포탈 AS·소모품 요청 (각 1건)");
  const samsung = await prisma.client.findUnique({ where: { clientCode: "CL-100-001" } });
  if (!samsung) return;
  // PortalAsRequest
  const exA = await prisma.asTicket.findFirst({ where: { ticketNumber: "AS-100-PORTAL-001" } });
  if (!exA) {
    await prisma.asTicket.create({
      data: {
        ticketNumber: "AS-100-PORTAL-001", clientId: samsung.id,
        kind: "AS_REQUEST", status: "RECEIVED",
        symptomKo: "포탈에서 등록 — 인쇄 품질 불량", originalLang: "KO",
        receivedAt: new Date("2026-04-25"), companyCode: "TV",
      },
    });
    inc("created");
  }
  // SUPPLIES_REQUEST
  const exS = await prisma.asTicket.findFirst({ where: { ticketNumber: "AS-100-PORTAL-SUP-001" } });
  if (!exS) {
    await prisma.asTicket.create({
      data: {
        ticketNumber: "AS-100-PORTAL-SUP-001", clientId: samsung.id,
        kind: "SUPPLIES_REQUEST", status: "RECEIVED",
        symptomKo: "포탈에서 등록 — 토너 소진",
        originalLang: "KO",
        suppliesItems: [{ itemId: itemIdMap["ITM-100-006"], quantity: 2, note: "Black Toner D330" }],
        receivedAt: new Date("2026-04-26"), companyCode: "TV",
      },
    });
    inc("created");
  }
}

// ──────────────────────────────────────────────────────────────────
// PHASE 5 — 매출 + 미수금 (S-056 ~ S-065)
// ──────────────────────────────────────────────────────────────────

type SalesDef = {
  code: string; client: string; emp: string; amount: number;
  contract?: string; tmRental?: string;
  type: "RENTAL"|"TRADE"|"MAINTENANCE"|"REPAIR"|"CALIBRATION";
  note: string; company: "TV"|"VR";
};
const SALES_100: SalesDef[] = [
  { code: "SLS-100-001", client: "CL-100-001", emp: "EMP-100-002", amount: 3_000_000,   contract: "TLS-100-001", type: "RENTAL", note: "IT 렌탈 월정액 2026-01", company: "TV" },
  { code: "SLS-100-002", client: "CL-100-001", emp: "EMP-100-002", amount: 3_200_000,   contract: "TLS-100-001", type: "RENTAL", note: "IT 렌탈 월정액 2026-02", company: "TV" },
  { code: "SLS-100-003", client: "CL-100-002", emp: "EMP-100-002", amount: 1_800_000,   contract: "TLS-100-002", type: "RENTAL", note: "IT 렌탈 월정액 2026-01", company: "TV" },
  { code: "SLS-100-004", client: "CL-100-006", emp: "EMP-100-003", amount: 120_000_000, type: "TRADE", note: "TRADE — D330 매매 (S-057에서 부분 환불)", company: "TV" },
  { code: "SLS-100-005", client: "CL-100-007", emp: "EMP-100-003", amount: 24_000_000,  type: "MAINTENANCE", note: "MAINTENANCE — N9020B 유지보수 연간", company: "TV" },
  { code: "SLS-100-006", client: "CL-100-004", emp: "EMP-100-008", amount: 5_000_000,   tmRental: "TM-100-001", type: "RENTAL", note: "TM 렌탈 2026-01", company: "VR" },
  { code: "SLS-100-007", client: "CL-100-005", emp: "EMP-100-008", amount: 8_500_000,   type: "REPAIR", note: "REPAIR — N9020B 수리비 청구", company: "VR" },
  { code: "SLS-100-008", client: "CL-100-005", emp: "EMP-100-008", amount: 3_200_000,   type: "CALIBRATION", note: "CALIBRATION — N9020B 교정", company: "VR" },
  { code: "SLS-100-009", client: "CL-100-003", emp: "EMP-100-003", amount: 2_500_000,   contract: "TLS-100-003", type: "RENTAL", note: "IT 렌탈 월정액 2026-01", company: "TV" },
  { code: "SLS-100-010", client: "CL-100-007", emp: "EMP-100-002", amount: 1_200_000,   contract: "TLS-100-005", type: "RENTAL", note: "IT 렌탈 월정액 2026-01", company: "TV" },
];
const salesIdMap: Record<string, string> = {};

async function s056Sales() {
  log("S-056: 매출 10건");
  for (const s of SALES_100) {
    const client = await prisma.client.findUnique({ where: { clientCode: s.client } });
    if (!client) { inc("errors"); continue; }
    const ex = await prisma.sales.findUnique({ where: { salesNumber: s.code } }).catch(() => null);
    const data: any = {
      clientId: client.id, salesEmployeeId: empIdMap[s.emp] ?? null,
      itContractId: s.contract ? itContractIdMap[s.contract]?.contractId ?? null : null,
      tmRentalId: s.tmRental ? tmRentalIdMap[s.tmRental] ?? null : null,
      totalAmount: s.amount, currency: "VND", fxRate: 1,
      note: s.note, billingMonth: new Date("2026-01-01"),
      isDraft: false, technicianReady: true,
      salesConfirmedAt: new Date("2026-02-05"), salesConfirmedById: empIdMap[s.emp] ?? null,
      financeConfirmedAt: new Date("2026-02-10"), financeConfirmedById: empIdMap["EMP-100-007"] ?? null,
      companyCode: s.company,
    };
    const row = ex
      ? await prisma.sales.update({ where: { id: ex.id }, data })
      : await prisma.sales.create({ data: { salesNumber: s.code, ...data } });
    salesIdMap[s.code] = row.id;
    inc("created");

    // S-039 자동 분개 차) 131 / 대) 511
    const exJE = await prisma.journalEntry.findFirst({ where: { source: "SALES", sourceModuleId: row.id } });
    if (exJE) {
      // 기존 분개 entryDate 보정 (2026-04-15)
      await prisma.journalEntry.update({ where: { id: exJE.id }, data: { entryDate: new Date("2026-04-15") } });
    } else {
      const entryNo = `JE-100-SLS-${s.code.slice(-3)}`;
      await prisma.journalEntry.create({
        data: {
          entryNo, entryDate: new Date("2026-04-15"), description: `${s.code} 매출 자동분개 (시드)`,
          status: "POSTED", source: "SALES", sourceModuleId: row.id, postedAt: new Date(),
          companyCode: s.company,
          lines: { create: [
            { lineNo: 1, accountCode: "131", debitAmount: s.amount, creditAmount: 0,        description: "외상매출금 발생", companyCode: s.company, clientId: client.id },
            { lineNo: 2, accountCode: "511", debitAmount: 0,        creditAmount: s.amount, description: `매출 (${s.type})`, companyCode: s.company },
          ] },
        },
      });
      inc("created");
    }

    // S-038 미수금 자동 (RECEIVABLE) — 모두 OPEN 으로 만들고 S-058에서 입금 처리
    const exPR = await prisma.payableReceivable.findFirst({ where: { salesId: row.id } });
    if (!exPR) {
      const due = new Date(); due.setDate(due.getDate() + 14);
      const idx = parseInt(s.code.split("-").pop() ?? "0");
      if (idx === 8) { due.setDate(due.getDate() - 30); }
      await prisma.payableReceivable.create({
        data: {
          companyCode: s.company, kind: "RECEIVABLE", clientId: client.id,
          salesId: row.id, amount: s.amount, paidAmount: 0, status: "OPEN", dueDate: due,
        },
      });
      inc("created");
    }
  }
}

// S-057: SalesAdjustment (S-004 부분 환불)
async function s057SalesAdjustment() {
  log("S-057: 매출 부분 환불 (SLS-100-004 -20M)");
  const sId = salesIdMap["SLS-100-004"];
  if (!sId) return;
  const ex = await prisma.salesAdjustment.findFirst({ where: { adjustCode: "ADJ-S-100-001" } }).catch(() => null);
  if (ex) { inc("skipped"); return; }
  await prisma.salesAdjustment.create({
    data: {
      adjustCode: "ADJ-S-100-001", companyCode: "TV", originalSalesId: sId,
      type: "PRICE_ADJUST", reason: "부분 환불 합의 (S-057)",
      reasonKo: "부분 환불 합의", reasonVi: "Hoàn tiền một phần", reasonEn: "Partial refund",
      performedAt: new Date("2026-04-20"), performedById: empIdMap["EMP-100-007"] ?? "",
      refundAmount: 20_000_000, newAmount: 0, netAmount: -20_000_000,
    },
  }).catch((e) => { console.warn("adj fail:", String(e).slice(0, 100)); });
  inc("created");
}

// S-058~S-059: 입금/결제 + CashTransaction + JE (3건+2건)
async function s058_059CashTxns() {
  log("S-058~059: 미수/미지급 결제 + CashTransaction (5건)");
  const acc1 = bankIdMap["ACC-100-001"];
  const acc2 = bankIdMap["ACC-100-002"];
  const acc4 = bankIdMap["ACC-100-004"];
  if (!acc1 || !acc2 || !acc4) { inc("errors"); return; }

  // S-058-1: SLS-001 전액 입금 (ACC-001)
  const sale1 = await prisma.sales.findUnique({ where: { id: salesIdMap["SLS-100-001"] } });
  if (sale1) {
    const pr = await prisma.payableReceivable.findFirst({ where: { salesId: sale1.id } });
    if (pr && pr.status !== "PAID") {
      await applyPaymentToPR(pr.id, 3_000_000, acc1, "DEPOSIT", "RECEIVABLE_COLLECTION", "TV", "S-058-1: SLS-100-001 전액 입금", { salesId: sale1.id, clientId: sale1.clientId });
    }
  }
  // S-058-2: SLS-003 부분 입금 1M (ACC-002)
  const sale3 = await prisma.sales.findUnique({ where: { id: salesIdMap["SLS-100-003"] } });
  if (sale3) {
    const pr = await prisma.payableReceivable.findFirst({ where: { salesId: sale3.id } });
    if (pr) {
      await applyPaymentToPR(pr.id, 1_000_000, acc2, "DEPOSIT", "RECEIVABLE_COLLECTION", "TV", "S-058-2: SLS-100-003 부분 입금", { salesId: sale3.id, clientId: sale3.clientId });
    }
  }
  // S-058-3: SLS-006 전액 입금 (ACC-004 VR)
  const sale6 = await prisma.sales.findUnique({ where: { id: salesIdMap["SLS-100-006"] } });
  if (sale6) {
    const pr = await prisma.payableReceivable.findFirst({ where: { salesId: sale6.id } });
    if (pr && pr.status !== "PAID") {
      await applyPaymentToPR(pr.id, 5_000_000, acc4, "DEPOSIT", "RECEIVABLE_COLLECTION", "VR", "S-058-3: SLS-100-006 전액 입금 (VR)", { salesId: sale6.id, clientId: sale6.clientId });
    }
  }
  // S-059-1: PUR-004 전액 결제 (ACC-001)
  const pur4 = await prisma.purchase.findUnique({ where: { id: purchaseIdMap["PUR-100-004"] } });
  if (pur4) {
    const pr = await prisma.payableReceivable.findFirst({ where: { purchaseId: pur4.id } });
    if (pr && pr.status !== "PAID") {
      await applyPaymentToPR(pr.id, 7_000_000, acc1, "WITHDRAWAL", "PAYABLE_PAYMENT", "TV", "S-059-1: PUR-100-004 전액 결제", { purchaseId: pur4.id, clientId: pur4.supplierId });
    }
  }
  // S-059-2: PUR-009 전액 결제 (ACC-001)
  const pur9 = await prisma.purchase.findUnique({ where: { id: purchaseIdMap["PUR-100-009"] } });
  if (pur9) {
    const pr = await prisma.payableReceivable.findFirst({ where: { purchaseId: pur9.id } });
    if (pr && pr.status !== "PAID") {
      await applyPaymentToPR(pr.id, 10_000_000, acc1, "WITHDRAWAL", "PAYABLE_PAYMENT", "TV", "S-059-2: PUR-100-009 전액 결제", { purchaseId: pur9.id, clientId: pur9.supplierId });
    }
  }

  // S-058 추가: SLS-004/005/009/010 — CT가 없으면 강제 생성 (paidAmount 강제 0으로 reset 후 재처리)
  const extras = [
    { code: "SLS-100-004", amount: 100_000_000, acc: acc1, company: "TV" as const, desc: "S-058-4: SLS-100-004 환불후 잔액 입금" },
    { code: "SLS-100-005", amount: 12_000_000,  acc: acc1, company: "TV" as const, desc: "S-058-5: SLS-100-005 부분 입금 (PARTIAL)" },
    { code: "SLS-100-006", amount: 5_000_000,   acc: acc4, company: "VR" as const, desc: "S-058-3b: SLS-100-006 잔재 정합성 처리 (VR)" },
    { code: "SLS-100-009", amount: 1_250_000,   acc: acc2, company: "TV" as const, desc: "S-058-6: SLS-100-009 부분 입금 (PARTIAL)" },
    { code: "SLS-100-010", amount: 1_200_000,   acc: acc1, company: "TV" as const, desc: "S-058-7: SLS-100-010 전액 입금" },
  ];
  for (const ex of extras) {
    const sale = await prisma.sales.findUnique({ where: { id: salesIdMap[ex.code] } });
    if (!sale) continue;
    const pr = await prisma.payableReceivable.findFirst({ where: { salesId: sale.id } });
    if (!pr) continue;
    const cts = await prisma.cashTransaction.count({ where: { prId: pr.id } });
    if (cts > 0) { inc("skipped"); continue; }
    // 기존 paidAmount/status 리셋 (idempotent)
    await prisma.payableReceivable.update({ where: { id: pr.id }, data: { paidAmount: 0, status: "OPEN", completedAt: null } });
    await applyPaymentToPR(pr.id, ex.amount, ex.acc, "DEPOSIT", "RECEIVABLE_COLLECTION", ex.company, ex.desc, { salesId: sale.id, clientId: sale.clientId });
  }
}

async function applyPaymentToPR(
  prId: string, amount: number, accountId: string,
  txnType: "DEPOSIT" | "WITHDRAWAL", category: any,
  company: "TV"|"VR", desc: string,
  refs: { salesId?: string; purchaseId?: string; expenseId?: string; clientId?: string },
) {
  const pr = await prisma.payableReceivable.findUnique({ where: { id: prId } });
  if (!pr) return;
  const newPaid = Number(pr.paidAmount) + amount;
  const newStatus = newPaid >= Number(pr.amount) ? "PAID" : newPaid > 0 ? "PARTIAL" : "OPEN";
  await prisma.payableReceivable.update({
    where: { id: prId }, data: { paidAmount: newPaid, status: newStatus, completedAt: newStatus === "PAID" ? new Date() : null },
  });
  // PrPayment
  await prisma.prPayment.create({
    data: { payableReceivableId: prId, paidAt: new Date(), amount, note: desc, method: "송금" },
  });
  // CashTransaction
  const ctCode = `CT-100-${Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0")}`;
  const ct = await prisma.cashTransaction.create({
    data: {
      txnCode: ctCode, txnDate: new Date(), txnType, amount, currency: "VND",
      exchangeRate: 1, amountLocal: amount, accountId, category,
      prId, ...(refs.salesId ? { salesId: refs.salesId } : {}),
      ...(refs.purchaseId ? { purchaseId: refs.purchaseId } : {}),
      status: "CONFIRMED", description: desc,
      clientId: refs.clientId ?? null, companyCode: company,
      confirmedAt: new Date(),
    },
  });
  // BankAccount.currentBalance update
  const acc = await prisma.bankAccount.findUnique({ where: { id: accountId } });
  if (acc) {
    const delta = txnType === "DEPOSIT" ? amount : -amount;
    await prisma.bankAccount.update({ where: { id: accountId }, data: { currentBalance: Number(acc.currentBalance ?? acc.openingBalance) + delta } });
  }
  // JE — 차)112 / 대)131 (입금) or 차)331 / 대)112 (지급)
  const entryNo = `JE-100-CT-${ctCode.slice(-6)}`;
  const lines = txnType === "DEPOSIT"
    ? [
        { lineNo: 1, accountCode: "112", debitAmount: amount, creditAmount: 0,      description: "예금 입금", companyCode: company },
        { lineNo: 2, accountCode: "131", debitAmount: 0,      creditAmount: amount, description: "외상매출금 회수", companyCode: company, clientId: refs.clientId ?? undefined },
      ]
    : [
        { lineNo: 1, accountCode: "331", debitAmount: amount, creditAmount: 0,      description: "외상매입금 결제", companyCode: company, clientId: refs.clientId ?? undefined },
        { lineNo: 2, accountCode: "112", debitAmount: 0,      creditAmount: amount, description: "예금 출금", companyCode: company },
      ];
  await prisma.journalEntry.create({
    data: {
      entryNo, entryDate: new Date("2026-04-15"), description: desc,
      status: "POSTED", source: "CASH", sourceModuleId: ct.id, postedAt: new Date(),
      companyCode: company,
      lines: { create: lines },
    },
  });
  inc("created");
}

// S-062: 계좌 이체 ACC-001 → ACC-002 50M
async function s062Transfer() {
  log("S-062: 계좌 이체 ACC-001 → ACC-002 50M");
  const ex = await prisma.cashTransaction.findFirst({ where: { description: { contains: "S-062" } } });
  if (ex) { inc("skipped"); return; }
  const acc1 = bankIdMap["ACC-100-001"];
  const acc2 = bankIdMap["ACC-100-002"];
  if (!acc1 || !acc2) return;
  const code1 = `CT-100-XFR-OUT`;
  const code2 = `CT-100-XFR-IN`;
  const out = await prisma.cashTransaction.create({
    data: {
      txnCode: code1, txnDate: new Date(), txnType: "TRANSFER", amount: 50_000_000,
      currency: "VND", exchangeRate: 1, amountLocal: 50_000_000,
      accountId: acc1, counterAccountId: acc2, category: "TRANSFER",
      status: "CONFIRMED", description: "S-062 이체 OUT", companyCode: "TV", confirmedAt: new Date(),
    },
  });
  const inn = await prisma.cashTransaction.create({
    data: {
      txnCode: code2, txnDate: new Date(), txnType: "TRANSFER", amount: 50_000_000,
      currency: "VND", exchangeRate: 1, amountLocal: 50_000_000,
      accountId: acc2, counterAccountId: acc1, category: "TRANSFER",
      status: "CONFIRMED", description: "S-062 이체 IN", companyCode: "TV", confirmedAt: new Date(),
      transferPairId: out.id,
    },
  });
  await prisma.cashTransaction.update({ where: { id: out.id }, data: { transferPairId: inn.id } });
  // 잔고 갱신
  const a1 = await prisma.bankAccount.findUnique({ where: { id: acc1 } });
  const a2 = await prisma.bankAccount.findUnique({ where: { id: acc2 } });
  if (a1) await prisma.bankAccount.update({ where: { id: acc1 }, data: { currentBalance: Number(a1.currentBalance ?? a1.openingBalance) - 50_000_000 } });
  if (a2) await prisma.bankAccount.update({ where: { id: acc2 }, data: { currentBalance: Number(a2.currentBalance ?? a2.openingBalance) + 50_000_000 } });
  inc("created");
}

// S-065: 월간 자금 스냅샷 — 2026-04
async function s065MonthlySnapshot() {
  log("S-065: 월간 자금 스냅샷 2026-04");
  for (const code of Object.keys(BANK_ACCOUNTS_100)) {
    const a = BANK_ACCOUNTS_100[code as any] ?? null;
  }
  for (const a of BANK_ACCOUNTS_100) {
    const accId = bankIdMap[a.code];
    if (!accId) continue;
    const acc = await prisma.bankAccount.findUnique({ where: { id: accId } });
    if (!acc) continue;
    await prisma.bankAccountMonthlySnapshot.upsert({
      where: { companyCode_accountId_yearMonth: { companyCode: a.company, accountId: accId, yearMonth: "2026-04" } },
      update: {},
      create: {
        accountId: accId, yearMonth: "2026-04",
        openingBalance: a.opening, totalIn: 0, totalOut: 0,
        closingBalance: Number(acc.currentBalance ?? a.opening),
        companyCode: a.company,
      },
    });
    inc("created");
  }
}

// ──────────────────────────────────────────────────────────────────
// PHASE 6 — 비용 + 원가 (S-066 ~ S-075)
// ──────────────────────────────────────────────────────────────────

type ExpDef = {
  code: string; type: any; desc: string; amount: number; method: any; status: any;
  vendorName?: string; targetClient?: string; company: "TV"|"VR";
};
const EXPENSES_100: ExpDef[] = [
  { code: "EXP-100-001", type: "TRANSPORT",     desc: "삼성 출동 택시",       amount: 250_000,    method: "CASH_PERSONAL",  status: "PENDING_REIMBURSE", vendorName: "Grab",       targetClient: "CL-100-001", company: "TV" },
  { code: "EXP-100-002", type: "MEAL",          desc: "LG 미팅 식대",         amount: 850_000,    method: "CORPORATE_CARD", status: "PAID",              vendorName: "Lotteria",    targetClient: "CL-100-002", company: "TV" },
  { code: "EXP-100-003", type: "ENTERTAINMENT", desc: "캐논 접대",            amount: 3_500_000,  method: "CORPORATE_CARD", status: "PAID",              vendorName: "Nhà hàng X",  targetClient: "CL-100-003", company: "TV" },
  { code: "EXP-100-004", type: "RENT",          desc: "BN 임대료 5월",        amount: 18_000_000, method: "BANK_TRANSFER",  status: "PAID",              vendorName: "임대인",                                       company: "TV" },
  { code: "EXP-100-005", type: "UTILITY",       desc: "BN 전기 5월",          amount: 6_200_000,  method: "BANK_TRANSFER",  status: "PAID",              vendorName: "EVN",                                          company: "TV" },
  { code: "EXP-100-006", type: "TRANSPORT",     desc: "포스코 연료비",        amount: 180_000,    method: "CASH_PERSONAL",  status: "PENDING_REIMBURSE", vendorName: "Petrolimex",  targetClient: "CL-100-006", company: "TV" },
  { code: "EXP-100-007", type: "GENERAL",       desc: "사무용품",             amount: 2_800_000,  method: "CASH_COMPANY",   status: "PAID",              vendorName: "Office Mart",                                  company: "TV" },
  { code: "EXP-100-008", type: "TRANSPORT",     desc: "도요타 교통비",        amount: 350_000,    method: "CREDIT_PERSONAL",status: "PENDING_REIMBURSE", vendorName: "Be Taxi",     targetClient: "CL-100-004", company: "VR" },
];
const expenseIdMap: Record<string, string> = {};

async function s066Expenses() {
  log("S-066: 비용 8건 (결제방법 5종)");
  for (const e of EXPENSES_100) {
    const ex = await prisma.expense.findUnique({ where: { expenseCode: e.code } }).catch(() => null);
    const targetClient = e.targetClient ? await prisma.client.findUnique({ where: { clientCode: e.targetClient } }) : null;
    const data: any = {
      expenseType: e.type, amount: e.amount, currency: "VND", fxRate: 1,
      note: e.desc, incurredAt: new Date("2026-05-01"),
      paymentMethod: e.method, paymentStatus: e.status,
      vendorName: e.vendorName ?? null,
      targetClientId: targetClient?.id ?? null,
      companyCode: e.company,
    };
    const row = ex
      ? await prisma.expense.update({ where: { id: ex.id }, data })
      : await prisma.expense.create({ data: { expenseCode: e.code, ...data } });
    expenseIdMap[e.code] = row.id;
    inc("created");

    // S-067: PAID 항목은 즉시 출금 (CashTransaction + JE)
    if (e.status === "PAID") {
      const accId = e.method === "CASH_COMPANY" ? bankIdMap["ACC-100-003"] : bankIdMap[e.company === "VR" ? "ACC-100-004" : "ACC-100-001"];
      if (!accId) continue;
      const exCT = await prisma.cashTransaction.findFirst({ where: { expenseId: row.id } });
      if (!exCT) {
        const ctCode = `CT-100-EXP-${e.code.slice(-3)}`;
        const ct = await prisma.cashTransaction.create({
          data: {
            txnCode: ctCode, txnDate: new Date("2026-05-01"), txnType: "WITHDRAWAL",
            amount: e.amount, currency: "VND", exchangeRate: 1, amountLocal: e.amount,
            accountId: accId, category: "EXPENSE", expenseId: row.id,
            status: "CONFIRMED", description: `${e.code} ${e.desc}`,
            clientId: targetClient?.id ?? null, companyCode: e.company, confirmedAt: new Date(),
          },
        });
        const acc = await prisma.bankAccount.findUnique({ where: { id: accId } });
        if (acc) await prisma.bankAccount.update({ where: { id: accId }, data: { currentBalance: Number(acc.currentBalance ?? acc.openingBalance) - e.amount } });
        // JE — 차)642 / 대)112
        await prisma.journalEntry.create({
          data: {
            entryNo: `JE-100-EXP-${e.code.slice(-3)}`, entryDate: new Date("2026-05-01"),
            description: `${e.code} 비용 자동분개 (시드)`,
            status: "POSTED", source: "EXPENSE", sourceModuleId: row.id, postedAt: new Date(),
            companyCode: e.company,
            lines: { create: [
              { lineNo: 1, accountCode: "642", debitAmount: e.amount, creditAmount: 0,        description: `${e.type} 비용`, companyCode: e.company, clientId: targetClient?.id ?? undefined },
              { lineNo: 2, accountCode: "112", debitAmount: 0,        creditAmount: e.amount, description: "예금 출금", companyCode: e.company },
            ] },
          },
        });
      }
    }
  }
}

// S-068: 개인 경비 환급 승인 (EXP-001만)
async function s068Reimburse() {
  log("S-068: 개인 경비 환급 (EXP-100-001)");
  const expId = expenseIdMap["EXP-100-001"];
  if (!expId) return;
  const exp = await prisma.expense.findUnique({ where: { id: expId } });
  if (!exp || exp.paymentStatus === "REIMBURSED") return;
  const accId = bankIdMap["ACC-100-001"];
  const ctCode = `CT-100-RMB-001`;
  // 멱등: ctCode 중복 방지
  const exCT = await prisma.cashTransaction.findUnique({ where: { txnCode: ctCode } }).catch(() => null);
  if (exCT) {
    await prisma.expense.update({ where: { id: expId }, data: {
      paymentStatus: "REIMBURSED", reimbursedAt: exCT.txnDate,
      reimbursedById: empIdMap["EMP-100-007"], reimburseCashTxId: exCT.id,
    } });
    inc("skipped");
    return;
  }
  const ct = await prisma.cashTransaction.create({
    data: {
      txnCode: ctCode, txnDate: new Date("2026-05-02"), txnType: "WITHDRAWAL",
      amount: Number(exp.amount), currency: "VND", exchangeRate: 1, amountLocal: Number(exp.amount),
      accountId: accId, category: "REIMBURSEMENT", expenseId: expId,
      status: "CONFIRMED", description: "S-068 EXP-100-001 환급",
      companyCode: "TV", confirmedAt: new Date(),
    },
  });
  await prisma.expense.update({ where: { id: expId }, data: {
    paymentStatus: "REIMBURSED", reimbursedAt: new Date("2026-05-02"),
    reimbursedById: empIdMap["EMP-100-007"], reimburseCashTxId: ct.id,
  } });
  const acc = await prisma.bankAccount.findUnique({ where: { id: accId } });
  if (acc) await prisma.bankAccount.update({ where: { id: accId }, data: { currentBalance: Number(acc.currentBalance ?? acc.openingBalance) - Number(exp.amount) } });
  await prisma.journalEntry.create({
    data: {
      entryNo: `JE-100-RMB-001`, entryDate: new Date("2026-05-02"),
      description: "S-068 환급 자동분개",
      status: "POSTED", source: "EXPENSE", sourceModuleId: expId, postedAt: new Date(), companyCode: "TV",
      lines: { create: [
        { lineNo: 1, accountCode: "641", debitAmount: Number(exp.amount), creditAmount: 0,                description: "환급 — 영업비", companyCode: "TV" },
        { lineNo: 2, accountCode: "112", debitAmount: 0,                  creditAmount: Number(exp.amount), description: "예금 출금", companyCode: "TV" },
      ] },
    },
  });
  inc("created");
}

// S-069: 비용 센터 배분 (EXP-004 임대료 → CC-MGMT-BN)
async function s069Allocations() {
  log("S-069: 비용 센터 배분");
  const expId = expenseIdMap["EXP-100-004"];
  const ccId = costCenterIdMap["CC-100-MGMT-BN"];
  if (!expId || !ccId) return;
  const ex = await prisma.expenseAllocation.findFirst({ where: { expenseId: expId, costCenterId: ccId } });
  if (ex) { inc("skipped"); return; }
  const exp = await prisma.expense.findUnique({ where: { id: expId } });
  if (!exp) return;
  await prisma.expenseAllocation.create({
    data: {
      expenseId: expId, costCenterId: ccId, basis: "AMOUNT",
      weight: 1, amount: exp.amount, companyCode: "TV",
    },
  });
  inc("created");
}

// S-073: 급여 일괄 지급 (10명, ACC-001)
async function s073PayrollBulk() {
  log("S-073: 급여 일괄 지급 (10명, 2026-04)");
  const accId = bankIdMap["ACC-100-001"];
  if (!accId) return;
  for (const e of EMPS_100) {
    const empId = empIdMap[e.code];
    if (!empId) continue;
    const month = new Date("2026-04-01");
    const ex = await prisma.payroll.findUnique({ where: { employeeId_month: { employeeId: empId, month } } }).catch(() => null);
    if (ex && ex.paidAt) { inc("skipped"); continue; }
    const baseSalary = e.role === "ADMIN" ? 50_000_000 : e.role === "MANAGER" ? 30_000_000 : 18_000_000;
    const allowances = 2_000_000;
    const deductions = 1_500_000;
    const netPay = baseSalary + allowances - deductions;
    let payroll = ex
      ? await prisma.payroll.update({ where: { id: ex.id }, data: { baseSalary, allowances, deductions, netPay } })
      : await prisma.payroll.create({ data: { employeeId: empId, month, baseSalary, allowances, deductions, netPay, companyCode: e.company } });
    if (!payroll.paidAt) {
      const ctCode = `CT-100-PAY-${e.code.slice(-3)}`;
      const ct = await prisma.cashTransaction.create({
        data: {
          txnCode: ctCode, txnDate: new Date("2026-05-05"), txnType: "WITHDRAWAL",
          amount: netPay, currency: "VND", exchangeRate: 1, amountLocal: netPay,
          accountId: accId, category: "SALARY", payrollId: payroll.id,
          status: "CONFIRMED", description: `${e.code} ${e.name} 4월 급여`,
          companyCode: e.company, confirmedAt: new Date(),
        },
      });
      await prisma.payroll.update({ where: { id: payroll.id }, data: { paidAt: new Date("2026-05-05"), bankAccountId: accId, cashTransactionId: ct.id } });
      const acc = await prisma.bankAccount.findUnique({ where: { id: accId } });
      if (acc) await prisma.bankAccount.update({ where: { id: accId }, data: { currentBalance: Number(acc.currentBalance ?? acc.openingBalance) - netPay } });
      // JE 묶음 1건
    }
  }
  // 급여 일괄 분개 (총합 1건)
  const all = await prisma.payroll.findMany({ where: { month: new Date("2026-04-01") } });
  const total = all.reduce((s, p) => s + Number(p.netPay), 0);
  const exJE = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-PAYROLL-2026-04" } });
  if (!exJE) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-PAYROLL-2026-04", entryDate: new Date("2026-05-05"),
        description: "급여 일괄 지급 2026-04 (시드 S-073)",
        status: "POSTED", source: "PAYROLL", postedAt: new Date(), companyCode: "TV",
        lines: { create: [
          { lineNo: 1, accountCode: "334", debitAmount: total, creditAmount: 0,     description: "미지급급여 → 지급", companyCode: "TV" },
          { lineNo: 2, accountCode: "112", debitAmount: 0,     creditAmount: total, description: "예금 출금", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }
}

// S-075: 감가상각 — D330 1대만 (월말 자동)
async function s075Depreciation() {
  log("S-075: 감가상각 (D330-001 단건)");
  const sn = "SN100-D330-001";
  const item = await prisma.inventoryItem.findUnique({ where: { serialNumber: sn } });
  if (!item) return;
  const month = new Date("2026-04-01");
  const acquisitionCost = 85_000_000;
  const usefulLifeMonths = 60;
  const depAmount = Math.floor(acquisitionCost / usefulLifeMonths);
  const ex = await prisma.assetDepreciation.findFirst({ where: { serialNumber: sn, month } });
  if (!ex) {
    await prisma.assetDepreciation.create({
      data: {
        companyCode: "TV", itemId: item.itemId, serialNumber: sn,
        acquisitionDate: new Date("2026-01-01"), acquisitionCost,
        method: "STRAIGHT_LINE", usefulLifeMonths, month,
        depreciationAmount: depAmount, bookValue: acquisitionCost - depAmount * 4,
      },
    });
    // JE 차)642 / 대)214
    await prisma.journalEntry.create({
      data: {
        entryNo: `JE-100-DEP-${sn.slice(-6)}`, entryDate: new Date("2026-04-30"),
        description: "S-075 감가상각",
        status: "POSTED", source: "ADJUSTMENT", postedAt: new Date(), companyCode: "TV",
        lines: { create: [
          { lineNo: 1, accountCode: "642", debitAmount: depAmount, creditAmount: 0,         description: "감가상각비", companyCode: "TV" },
          { lineNo: 2, accountCode: "214", debitAmount: 0,         creditAmount: depAmount, description: "감가상각누계액", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }
}

// ──────────────────────────────────────────────────────────────────
// PHASE 7 — 회계 (S-077~S-090) — 수동 분개·역분개·마감
// ──────────────────────────────────────────────────────────────────

// S-077: 자본금 수동 분개
async function s077ManualJE() {
  log("S-077: 수동 분개 — 자본금 1B");
  const ex = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-MAN-001" } });
  if (ex) { inc("skipped"); return; }
  await prisma.journalEntry.create({
    data: {
      entryNo: "JE-100-MAN-001", entryDate: new Date("2025-12-31"),
      description: "S-077 자본금 수동 분개 (시드)",
      status: "POSTED", source: "MANUAL", postedAt: new Date(), companyCode: "TV",
      lines: { create: [
        { lineNo: 1, accountCode: "112", debitAmount: 1_000_000_000, creditAmount: 0,             description: "은행예금 입금 (자본납입)", companyCode: "TV" },
        { lineNo: 2, accountCode: "411", debitAmount: 0,             creditAmount: 1_000_000_000, description: "자본금", companyCode: "TV" },
      ] },
    },
  });
  inc("created");
}

// S-079: 역분개 시뮬 — 위 분개 reverse
async function s079Reverse() {
  log("S-079: 역분개 시뮬");
  const orig = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-MAN-001" } });
  if (!orig) return;
  const exRev = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-MAN-001-REV" } });
  if (exRev) { inc("skipped"); return; }
  const lines = await prisma.journalLine.findMany({ where: { entryId: orig.id }, orderBy: { lineNo: "asc" } });
  await prisma.journalEntry.update({ where: { id: orig.id }, data: { status: "REVERSED" } });
  await prisma.journalEntry.create({
    data: {
      entryNo: "JE-100-MAN-001-REV", entryDate: new Date(), description: "S-079 역분개",
      status: "POSTED", source: "ADJUSTMENT", postedAt: new Date(),
      reversedById: orig.id, companyCode: "TV",
      lines: { create: lines.map((l) => ({
        lineNo: l.lineNo, accountCode: l.accountCode,
        debitAmount: l.creditAmount, creditAmount: l.debitAmount,
        description: `역분개: ${l.description ?? ""}`,
        companyCode: l.companyCode,
      })) },
    },
  });
  inc("created");
}

// S-087/S-088: 회계마감 verify + close (2026-04)
async function s087_088PeriodClose() {
  log("S-087/S-088: PeriodClose 2026-04 verify+close (시드)");
  for (const company of ["TV", "VR"] as const) {
    const ex = await prisma.periodClose.findUnique({ where: { companyCode_yearMonth: { companyCode: company, yearMonth: "2026-04" } } });
    const data: any = {
      status: "CLOSED" as const,
      verifiedAt: new Date(), verifyResult: { unbalanced: 0, orphans: 0, message: "OK" },
      closedAt: new Date(),
    };
    if (ex) await prisma.periodClose.update({ where: { id: ex.id }, data });
    else    await prisma.periodClose.create({ data: { companyCode: company, yearMonth: "2026-04", ...data } });
    inc("created");
  }
}

// ──────────────────────────────────────────────────────────────────
// PHASE 8 — 포탈 + 알림 + 기타 (S-091~S-100)
// ──────────────────────────────────────────────────────────────────

// S-091: 고객 포탈 사용자
async function s091PortalUser() {
  log("S-091: 고객 포탈 사용자 (삼성)");
  const samsung = await prisma.client.findUnique({ where: { clientCode: "CL-100-001" } });
  if (!samsung) return;
  const username = "samsung-portal-100";
  const ex = await prisma.user.findFirst({ where: { username } });
  if (ex) { inc("skipped"); return; }
  const passwordHash = await bcrypt.hash("samsung123", 10);
  await prisma.user.create({
    data: {
      username, passwordHash, email: "samsung-portal100@test.vn",
      clientId: samsung.id, role: "CLIENT", allowedCompanies: ["TV"],
      preferredLang: "KO", isActive: true,
    },
  });
  inc("created");
}

// S-093: QuoteRequest
async function s093Quote() {
  log("S-093: 견적 요청 (포스코)");
  const posco = await prisma.client.findUnique({ where: { clientCode: "CL-100-006" } });
  if (!posco) return;
  const ex = await prisma.quoteRequest.findFirst({ where: { quoteCode: "QR-100-001" } });
  if (ex) { inc("skipped"); return; }
  await prisma.quoteRequest.create({
    data: {
      quoteCode: "QR-100-001", clientId: posco.id,
      titleKo: "복합기 5대 견적 요청", titleVi: "Yêu cầu báo giá 5 máy",
      titleEn: "Quote 5 multifunction printers",
      descriptionKo: "포스코 사업장 5대 신규 도입 견적",
      originalLang: "KO", quoteType: "RENTAL_IT", quantity: 5,
      desiredStartDate: new Date("2026-06-01"),
      attachmentIds: [], status: "REQUESTED", companyCode: "TV",
    },
  });
  inc("created");
}

// S-094: PortalFeedback
async function s094Feedback() {
  log("S-094: 포탈 피드백 (칭찬, 삼성→Khang)");
  const samsung = await prisma.client.findUnique({ where: { clientCode: "CL-100-001" } });
  const khang = empIdMap["EMP-100-004"];
  if (!samsung || !khang) return;
  const ex = await prisma.portalFeedback.findFirst({ where: { feedbackCode: "FB-100-001" } });
  if (ex) { inc("skipped"); return; }
  await prisma.portalFeedback.create({
    data: {
      feedbackCode: "FB-100-001", clientId: samsung.id, kind: "PRAISE",
      contentKo: "Khang 기사님 친절하고 빠르게 처리해주셨습니다. 감사합니다.",
      contentVi: "Anh Khang xử lý nhanh chóng và thân thiện. Cảm ơn.",
      contentEn: "Engineer Khang was prompt and friendly. Thank you.",
      originalLang: "KO", targetEmployeeId: khang,
      status: "RECEIVED", companyCode: "TV",
    },
  });
  inc("created");
}

// S-095: PortalPoint 잔액 + 만료 시뮬
async function s095PortalPoints() {
  log("S-095: 포탈 포인트 + 만료 예정");
  const samsung = await prisma.client.findUnique({ where: { clientCode: "CL-100-001" } });
  if (!samsung) return;
  const exists = await prisma.portalPoint.count({ where: { clientId: samsung.id } });
  if (exists > 0) { inc("skipped"); return; }
  const expSoon = new Date(); expSoon.setDate(expSoon.getDate() + 25);
  const expFar = new Date(); expFar.setDate(expFar.getDate() + 365);
  await prisma.portalPoint.createMany({
    data: [
      { clientId: samsung.id, amount: 5000,  reason: "AS_REQUEST",      reasonDetail: "AS-100-001", expiresAt: expSoon, companyCode: "TV" },
      { clientId: samsung.id, amount: 10000, reason: "USAGE_CONFIRM",   reasonDetail: "UC-100-001", expiresAt: expFar,  companyCode: "TV" },
      { clientId: samsung.id, amount: 3000,  reason: "FEEDBACK_PRAISE", reasonDetail: "FB-100-001", expiresAt: expFar,  companyCode: "TV" },
    ],
  });
  inc("created");
}

// S-096: 알림 시드 (직원에게 발송 이력)
// S-FINAL-AB: ChartOfAccount 추가 + 매출유형/비용유형 세분 재분류 + VAT 분개
async function sFinalCOAExpand() {
  log("S-FINAL-AB: COA 세분 + 매출/비용 재분류 + VAT");
  // (1) 누락 leaf 계정 추가
  const newCoa = [
    { code: "6424", nameKo: "여비교통비",  nameVi: "Chi phí công tác", nameEn: "Travel expense",      type: "EXPENSE" as const, parent: "642" },
    { code: "6425", nameKo: "접대비",      nameVi: "Chi phí tiếp khách", nameEn: "Entertainment",     type: "EXPENSE" as const, parent: "642" },
    { code: "6426", nameKo: "임차료",      nameVi: "Chi phí thuê",     nameEn: "Rent expense",        type: "EXPENSE" as const, parent: "642" },
    { code: "6429", nameKo: "공과금/통신비",nameVi: "Tiện ích & viễn thông",nameEn: "Utility & telecom", type: "EXPENSE" as const, parent: "642" },
    { code: "152",  nameKo: "원재료",      nameVi: "Nguyên vật liệu",  nameEn: "Raw materials",       type: "ASSET" as const,   parent: "1" },
  ];
  for (const c of newCoa) {
    await prisma.chartOfAccount.upsert({
      where: { companyCode_code: { companyCode: "TV", code: c.code } },
      update: { nameKo: c.nameKo, nameVi: c.nameVi, nameEn: c.nameEn, type: c.type, isLeaf: true, isActive: true, parentCode: c.parent },
      create: { companyCode: "TV", code: c.code, nameKo: c.nameKo, nameVi: c.nameVi, nameEn: c.nameEn, type: c.type, isLeaf: true, isActive: true, parentCode: c.parent, level: 3 },
    });
    inc("created");
  }

  // (2) 매출 재분류 — 511 → 5111/5113/5117 (TRADE/SERVICE/RENTAL)
  // 시드 분개의 511 라인을 그대로 두고, 새로운 reclassification 분개로 511 차감 + 세부 수익 인식
  const salesByType: Record<string, { code: string; amount: number }[]> = { RENTAL: [], TRADE: [], SERVICE: [] };
  for (const s of SALES_100) {
    const typeMap: Record<string, "RENTAL"|"TRADE"|"SERVICE"> = { RENTAL: "RENTAL", TRADE: "TRADE", MAINTENANCE: "SERVICE", REPAIR: "SERVICE", CALIBRATION: "SERVICE" };
    const cls = typeMap[s.type] ?? "SERVICE";
    if (s.company === "TV") salesByType[cls].push({ code: s.code, amount: s.amount });
  }
  const reclassMap: Record<string, string> = { RENTAL: "5117", TRADE: "5111", SERVICE: "5113" };
  for (const cls of Object.keys(salesByType) as Array<keyof typeof salesByType>) {
    const items = salesByType[cls];
    if (!items.length) continue;
    const total = items.reduce((s, x) => s + x.amount, 0);
    const target = reclassMap[cls as string];
    const entryNo = `JE-100-RECLASS-REV-${cls}`;
    const ex = await prisma.journalEntry.findFirst({ where: { entryNo } });
    if (ex) continue;
    await prisma.journalEntry.create({
      data: {
        entryNo, entryDate: new Date("2026-04-30"), companyCode: "TV",
        description: `매출 ${cls} → ${target} 재분류 (${items.length}건)`,
        status: "POSTED", source: "ADJUSTMENT", postedAt: new Date(),
        lines: { create: [
          { lineNo: 1, accountCode: "511",  debitAmount: total, creditAmount: 0,     description: `511 차감 (${items.map(i => i.code).join(",")})`, companyCode: "TV" },
          { lineNo: 2, accountCode: target, debitAmount: 0,     creditAmount: total, description: `${cls} 수익 인식`, companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }

  // (3) 비용 재분류 — 642 → 6423/6424/6425/6426/6428/6429
  const expByType: Record<string, number> = { TRANSPORT: 0, MEAL: 0, ENTERTAINMENT: 0, RENT: 0, UTILITY: 0, GENERAL: 0 };
  for (const e of EXPENSES_100) if (e.company === "TV" && e.status === "PAID") expByType[e.type] = (expByType[e.type] ?? 0) + e.amount;
  const expCoaMap: Record<string, string> = {
    TRANSPORT: "6424", MEAL: "6428", ENTERTAINMENT: "6425",
    RENT: "6426", UTILITY: "6429", GENERAL: "6423",
  };
  for (const [tp, amt] of Object.entries(expByType)) {
    if (amt <= 0) continue;
    const target = expCoaMap[tp];
    const entryNo = `JE-100-RECLASS-EXP-${tp}`;
    const ex = await prisma.journalEntry.findFirst({ where: { entryNo } });
    if (ex) continue;
    await prisma.journalEntry.create({
      data: {
        entryNo, entryDate: new Date("2026-04-30"), companyCode: "TV",
        description: `비용 ${tp} → ${target} 재분류 (${amt.toLocaleString()})`,
        status: "POSTED", source: "ADJUSTMENT", postedAt: new Date(),
        lines: { create: [
          { lineNo: 1, accountCode: target, debitAmount: amt, creditAmount: 0,   description: `${tp} 인식`, companyCode: "TV" },
          { lineNo: 2, accountCode: "642",  debitAmount: 0,   creditAmount: amt, description: `642 차감`, companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }

  // (4) VAT 분개 — 매출 부가세예수금 10%, 매입 매입세액 10% (단순화: 합산 1줄씩)
  const totalSalesTV = SALES_100.filter(s => s.company === "TV").reduce((s, x) => s + x.amount, 0);
  const vatOut = Math.round(totalSalesTV * 0.10);
  const exVatOut = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-VAT-OUT" } });
  if (!exVatOut) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-VAT-OUT", entryDate: new Date("2026-04-30"), companyCode: "TV",
        description: `부가세예수금 인식 10% (매출 ${totalSalesTV.toLocaleString()})`,
        status: "POSTED", source: "ADJUSTMENT", postedAt: new Date(),
        lines: { create: [
          { lineNo: 1, accountCode: "131",  debitAmount: vatOut, creditAmount: 0,      description: "외상매출금 (VAT)", companyCode: "TV" },
          { lineNo: 2, accountCode: "3331", debitAmount: 0,      creditAmount: vatOut, description: "부가세예수금", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }
  const totalPurchaseTV = PURCHASES_100.filter(p => p.company === "TV").reduce((s, p) => s + p.lines.reduce((s2, l) => s2 + l.qty * l.price, 0), 0);
  const vatIn = Math.round(totalPurchaseTV * 0.10);
  const exVatIn = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-VAT-IN" } });
  if (!exVatIn) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-VAT-IN", entryDate: new Date("2026-04-30"), companyCode: "TV",
        description: `매입세액 인식 10% (매입 ${totalPurchaseTV.toLocaleString()})`,
        status: "POSTED", source: "ADJUSTMENT", postedAt: new Date(),
        lines: { create: [
          { lineNo: 1, accountCode: "133", debitAmount: vatIn, creditAmount: 0,     description: "매입세액 (공제)", companyCode: "TV" },
          { lineNo: 2, accountCode: "331", debitAmount: 0,     creditAmount: vatIn, description: "외상매입금 (VAT)", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }

  // (5) 매출원가 라인별 — 매출 10건 각각에 별도 분개 (이미 sFinalFinanceEnrich 에서 합산 1건 만들었지만 여기서는 line별로 만들지 않고 그대로 둠 — 시드 단순화 우선)
  // 대신 152 원재료 사용 분개 추가 (AS 부품 → 매출원가 인식)
  const exMat = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-RAW-USE-001" } });
  if (!exMat) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-RAW-USE-001", entryDate: new Date("2026-04-25"), companyCode: "TV",
        description: "AS 부품 사용 — 원재료 → 매출원가 (시드)",
        status: "POSTED", source: "ADJUSTMENT", postedAt: new Date(),
        lines: { create: [
          { lineNo: 1, accountCode: "152", debitAmount: 12_000_000, creditAmount: 0,          description: "원재료 임시 적치", companyCode: "TV" },
          { lineNo: 2, accountCode: "156", debitAmount: 0,          creditAmount: 12_000_000, description: "상품 → 원재료 전환", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }
  const exMat2 = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-RAW-USE-002" } });
  if (!exMat2) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-RAW-USE-002", entryDate: new Date("2026-04-26"), companyCode: "TV",
        description: "AS 부품 투입 — 원재료 → 매출원가 인식",
        status: "POSTED", source: "ADJUSTMENT", postedAt: new Date(),
        lines: { create: [
          { lineNo: 1, accountCode: "632", debitAmount: 12_000_000, creditAmount: 0,          description: "AS 부품 매출원가", companyCode: "TV" },
          { lineNo: 2, accountCode: "152", debitAmount: 0,          creditAmount: 12_000_000, description: "원재료 사용", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }

  // (6) 153 공구비품 매입 (소액) — 사무실 공구
  const exTool = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-TOOL-001" } });
  if (!exTool) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-TOOL-001", entryDate: new Date("2026-04-12"), companyCode: "TV",
        description: "공구비품 매입 5M (S-FINAL-AB)",
        status: "POSTED", source: "PURCHASE", postedAt: new Date(),
        lines: { create: [
          { lineNo: 1, accountCode: "153", debitAmount: 5_000_000, creditAmount: 0,         description: "공구비품 (드라이버/스패너 세트)", companyCode: "TV" },
          { lineNo: 2, accountCode: "112", debitAmount: 0,         creditAmount: 5_000_000, description: "예금 출금", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }

  // (7) 711 기타수익 — 외환차익 등 영업외수익
  const exOth = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-OTHREV-001" } });
  if (!exOth) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-OTHREV-001", entryDate: new Date("2026-04-28"), companyCode: "TV",
        description: "외환차익 (S-FINAL-AB)",
        status: "POSTED", source: "ADJUSTMENT", postedAt: new Date(),
        lines: { create: [
          { lineNo: 1, accountCode: "112", debitAmount: 2_500_000, creditAmount: 0,         description: "예금 입금", companyCode: "TV" },
          { lineNo: 2, accountCode: "711", debitAmount: 0,         creditAmount: 2_500_000, description: "기타수익 (외환차익)", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }
  // 515 금융수익 — 이자수익
  const exFinRev = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-INTREV-001" } });
  if (!exFinRev) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-INTREV-001", entryDate: new Date("2026-04-30"), companyCode: "TV",
        description: "예금 이자수익 (S-FINAL-AB)",
        status: "POSTED", source: "ADJUSTMENT", postedAt: new Date(),
        lines: { create: [
          { lineNo: 1, accountCode: "112", debitAmount: 1_200_000, creditAmount: 0,         description: "예금 입금", companyCode: "TV" },
          { lineNo: 2, accountCode: "515", debitAmount: 0,         creditAmount: 1_200_000, description: "이자수익", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }
  // 811 기타비용 — 잡손실
  const exOthExp = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-OTHEXP-001" } });
  if (!exOthExp) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-OTHEXP-001", entryDate: new Date("2026-04-29"), companyCode: "TV",
        description: "잡손실 (S-FINAL-AB)",
        status: "POSTED", source: "ADJUSTMENT", postedAt: new Date(),
        lines: { create: [
          { lineNo: 1, accountCode: "811", debitAmount: 800_000, creditAmount: 0,       description: "잡손실 (분실 등)", companyCode: "TV" },
          { lineNo: 2, accountCode: "112", debitAmount: 0,       creditAmount: 800_000, description: "예금 출금", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }

  // (8) 자본 변동 — 이익잉여금 가지급 421
  const exRet = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-RETAIN-001" } });
  if (!exRet) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-RETAIN-001", entryDate: new Date("2026-04-01"), companyCode: "TV",
        description: "전기이월 이익잉여금 (S-FINAL-AB)",
        status: "POSTED", source: "MANUAL", postedAt: new Date(),
        lines: { create: [
          { lineNo: 1, accountCode: "112", debitAmount: 30_000_000, creditAmount: 0,          description: "전기 이월 자금", companyCode: "TV" },
          { lineNo: 2, accountCode: "421", debitAmount: 0,          creditAmount: 30_000_000, description: "이익잉여금 (전기이월)", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }

  // (9) AccountMapping 활성화 (28건 시드되어 있음 — 각 트리거에 정확한 코드 매핑)
  const mappings = [
    { trigger: "SALES_REVENUE",      code: "5111" },
    { trigger: "SALES_RECEIVABLE",   code: "131"  },
    { trigger: "SALES_VAT_OUT",      code: "3331" },
    { trigger: "PURCHASE_INVENTORY", code: "156"  },
    { trigger: "PURCHASE_PAYABLE",   code: "331"  },
    { trigger: "PURCHASE_VAT_IN",    code: "133"  },
    { trigger: "CASH_IN",            code: "112"  },
    { trigger: "CASH_OUT",           code: "112"  },
    { trigger: "CASH_TRANSFER",      code: "112"  },
    { trigger: "EXPENSE_OPEX",       code: "642"  },
    { trigger: "EXPENSE_CASH",       code: "642"  },
    { trigger: "PAYROLL_SALARY",     code: "6421" },
    { trigger: "PAYROLL_PAYABLE",    code: "334"  },
    { trigger: "RENTAL_REVENUE",     code: "5117" },
  ];
  for (const m of mappings) {
    await prisma.accountMapping.upsert({
      where: { companyCode_trigger: { companyCode: "TV", trigger: m.trigger as any } },
      update: { accountCode: m.code, isActive: true },
      create: { companyCode: "TV", trigger: m.trigger as any, accountCode: m.code, isActive: true },
    }).catch(() => undefined);
    inc("updated");
  }
}

// S-FINAL-AA: 재무제표 보강 — 매출원가 / 유형자산 분리 / 자본 / 차입 / 추가 비용
async function sFinalFinanceEnrich() {
  log("S-FINAL-AA: 재무제표 보강 (매출원가 + 유형자산 + 자본 + 차입 + 비용 종류)");

  // (1) 매출원가 분개 — 매출 1건당 차)632 / 대)156
  for (const code of Object.keys(salesIdMap)) {
    const sId = salesIdMap[code];
    const sale = await prisma.sales.findUnique({ where: { id: sId } });
    if (!sale) continue;
    const company = sale.companyCode;
    const amount = Number(sale.totalAmount);
    const cogs = Math.round(amount * 0.65); // 매출원가 65%
    const entryNo = `JE-100-COGS-${code.slice(-3)}`;
    const ex = await prisma.journalEntry.findFirst({ where: { entryNo } });
    if (ex) continue;
    await prisma.journalEntry.create({
      data: {
        entryNo, entryDate: new Date("2026-04-15"),
        description: `${code} 매출원가 인식`,
        status: "POSTED", source: "SALES", sourceModuleId: sId, postedAt: new Date(), companyCode: company,
        lines: { create: [
          { lineNo: 1, accountCode: "632", debitAmount: cogs, creditAmount: 0,    description: "매출원가 (시드)", companyCode: company },
          { lineNo: 2, accountCode: "156", debitAmount: 0,    creditAmount: cogs, description: "상품 출고 (시드)", companyCode: company },
        ] },
      },
    });
    inc("created");
  }

  // (2) 유형자산 분기 — IT 렌탈에 들어간 자산 일부를 211 로 재분류 (300M씩 4건)
  // 대신 자본 변동 없이 차)211 / 대)156 reclassification 분개
  const reclassData = [
    { code: "JE-100-RECLASS-D330",  amount: 255_000_000, desc: "D330 3대 → 유형자산 재분류" },
    { code: "JE-100-RECLASS-X7500", amount: 450_000_000, desc: "X7500 3대 → 유형자산 재분류" },
    { code: "JE-100-RECLASS-D410",  amount: 65_000_000,  desc: "D410 1대 → 유형자산 재분류" },
  ];
  for (const r of reclassData) {
    const ex = await prisma.journalEntry.findFirst({ where: { entryNo: r.code } });
    if (ex) continue;
    await prisma.journalEntry.create({
      data: {
        entryNo: r.code, entryDate: new Date("2026-04-15"),
        description: r.desc,
        status: "POSTED", source: "ADJUSTMENT", postedAt: new Date(), companyCode: "TV",
        lines: { create: [
          { lineNo: 1, accountCode: "211", debitAmount: r.amount, creditAmount: 0,        description: "유형자산", companyCode: "TV" },
          { lineNo: 2, accountCode: "156", debitAmount: 0,        creditAmount: r.amount, description: "상품 → 자산", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }

  // (3) 자본금 — 시드 자본 200M (FINANCING)
  const capEx = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-CAPITAL-001" } });
  if (!capEx) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-CAPITAL-001", entryDate: new Date("2026-04-01"),
        description: "초기 자본금 200M (S-FINAL-AA)",
        status: "POSTED", source: "MANUAL", postedAt: new Date(), companyCode: "TV",
        lines: { create: [
          { lineNo: 1, accountCode: "112", debitAmount: 200_000_000, creditAmount: 0,           description: "예금 입금 (자본납입)", companyCode: "TV" },
          { lineNo: 2, accountCode: "411", debitAmount: 0,           creditAmount: 200_000_000, description: "자본금", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }

  // (4) 차입금 — 단기차입 100M (FINANCING)
  const loanEx = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-LOAN-001" } });
  if (!loanEx) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-LOAN-001", entryDate: new Date("2026-04-10"),
        description: "단기차입 100M (S-FINAL-AA)",
        status: "POSTED", source: "MANUAL", postedAt: new Date(), companyCode: "TV",
        lines: { create: [
          { lineNo: 1, accountCode: "112", debitAmount: 100_000_000, creditAmount: 0,           description: "차입금 입금", companyCode: "TV" },
          { lineNo: 2, accountCode: "311", debitAmount: 0,           creditAmount: 100_000_000, description: "단기차입금", companyCode: "TV" },
        ] },
      },
    }).catch(() => {
      // 311 없을 수 있음 — 338로 fallback
      return prisma.journalEntry.create({
        data: {
          entryNo: "JE-100-LOAN-001", entryDate: new Date("2026-04-10"),
          description: "단기차입 100M (S-FINAL-AA, 338)",
          status: "POSTED", source: "MANUAL", postedAt: new Date(), companyCode: "TV",
          lines: { create: [
            { lineNo: 1, accountCode: "112", debitAmount: 100_000_000, creditAmount: 0,           description: "차입금 입금", companyCode: "TV" },
            { lineNo: 2, accountCode: "338", debitAmount: 0,           creditAmount: 100_000_000, description: "기타미지급금 (차입)", companyCode: "TV" },
          ] },
        },
      });
    });
    inc("created");
  }

  // (5) 영업외 비용 — 이자비용 5M (635)
  const intEx = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-INTEREST-001" } });
  if (!intEx) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-INTEREST-001", entryDate: new Date("2026-04-30"),
        description: "이자비용 5M (S-FINAL-AA)",
        status: "POSTED", source: "EXPENSE", postedAt: new Date(), companyCode: "TV",
        lines: { create: [
          { lineNo: 1, accountCode: "635", debitAmount: 5_000_000, creditAmount: 0,         description: "이자비용", companyCode: "TV" },
          { lineNo: 2, accountCode: "112", debitAmount: 0,         creditAmount: 5_000_000, description: "예금 출금", companyCode: "TV" },
        ] },
      },
    });
    // ACC-001 잔고 차감
    const a1 = await prisma.bankAccount.findUnique({ where: { id: bankIdMap["ACC-100-001"] } });
    if (a1) await prisma.bankAccount.update({ where: { id: a1.id }, data: { currentBalance: Number(a1.currentBalance ?? a1.openingBalance) - 5_000_000 } });
    // CT 행
    await prisma.cashTransaction.create({
      data: {
        txnCode: "CT-100-INT-001", txnDate: new Date("2026-04-30"), txnType: "WITHDRAWAL",
        amount: 5_000_000, currency: "VND", exchangeRate: 1, amountLocal: 5_000_000,
        accountId: bankIdMap["ACC-100-001"], category: "EXPENSE",
        status: "CONFIRMED", description: "이자비용 (시드)", companyCode: "TV", confirmedAt: new Date(),
      },
    });
    // CT for capital deposit (FINANCING)
    await prisma.cashTransaction.create({
      data: {
        txnCode: "CT-100-CAP-001", txnDate: new Date("2026-04-01"), txnType: "DEPOSIT",
        amount: 200_000_000, currency: "VND", exchangeRate: 1, amountLocal: 200_000_000,
        accountId: bankIdMap["ACC-100-001"], category: "OTHER",
        status: "CONFIRMED", description: "자본납입 200M", companyCode: "TV", confirmedAt: new Date(),
      },
    });
    // CT for loan (FINANCING)
    await prisma.cashTransaction.create({
      data: {
        txnCode: "CT-100-LOAN-001", txnDate: new Date("2026-04-10"), txnType: "DEPOSIT",
        amount: 100_000_000, currency: "VND", exchangeRate: 1, amountLocal: 100_000_000,
        accountId: bankIdMap["ACC-100-001"], category: "LOAN_IN",
        status: "CONFIRMED", description: "단기차입 100M", companyCode: "TV", confirmedAt: new Date(),
      },
    });
    // ACC-001 잔고 += 200M + 100M
    const a1b = await prisma.bankAccount.findUnique({ where: { id: bankIdMap["ACC-100-001"] } });
    if (a1b) await prisma.bankAccount.update({ where: { id: a1b.id }, data: { currentBalance: Number(a1b.currentBalance ?? a1b.openingBalance) + 300_000_000 } });
    inc("created");
  }

  // (6) 추가 비용 종류 다양화 — 통신비/광고비 등 차)642 (관리비) / 대)112
  // 이미 EXP 비용으로 642 잡혀 있으므로 대신 5113(서비스매출)에 분개 추가 — IT 렌탈 매출 일부 재분류
  const svcEx = await prisma.journalEntry.findFirst({ where: { entryNo: "JE-100-SVC-RECLASS" } });
  if (!svcEx) {
    await prisma.journalEntry.create({
      data: {
        entryNo: "JE-100-SVC-RECLASS", entryDate: new Date("2026-04-30"),
        description: "IT 렌탈 매출 → 임대수익 5117 재분류 (시드)",
        status: "POSTED", source: "ADJUSTMENT", postedAt: new Date(), companyCode: "TV",
        lines: { create: [
          { lineNo: 1, accountCode: "511",  debitAmount: 100_000_000, creditAmount: 0,           description: "511 차감", companyCode: "TV" },
          { lineNo: 2, accountCode: "5117", debitAmount: 0,           creditAmount: 100_000_000, description: "임대수익 인식", companyCode: "TV" },
        ] },
      },
    });
    inc("created");
  }
}

// S-FINAL-A: 모든 JE-100-* 의 entryDate를 2026-04-15 로 보정 (멱등 시드 잔재 처리)
async function sFinalEntryDateNormalize() {
  log("S-FINAL-A: JE-100-* entryDate 보정 (2026-04-15)");
  const result = await prisma.journalEntry.updateMany({
    where: { entryNo: { startsWith: "JE-100-" }, NOT: [
      { entryNo: "JE-100-MAN-001" }, // 자본금 — 2025-12-31 유지
      { entryNo: "JE-100-MAN-001-REV" }, // 역분개
    ] },
    data: { entryDate: new Date("2026-04-15") },
  });
  console.log(`     업데이트=${result.count}`);
}

// S-FINAL: BankAccount.currentBalance 재계산 (시드 누적 정합성)
async function sFinalBalanceRecompute() {
  log("S-FINAL: BankAccount.currentBalance 재계산");
  for (const a of BANK_ACCOUNTS_100) {
    const accId = bankIdMap[a.code];
    if (!accId) continue;
    const txns = await prisma.cashTransaction.findMany({ where: { accountId: accId, status: "CONFIRMED" } });
    let bal = a.opening;
    for (const t of txns) {
      const amt = Number(t.amount);
      if (t.txnType === "DEPOSIT") bal += amt;
      else if (t.txnType === "WITHDRAWAL") bal -= amt;
      else if (t.txnType === "TRANSFER") {
        // OUT side or IN side
        if (t.txnCode.endsWith("-OUT")) bal -= amt;
        else if (t.txnCode.endsWith("-IN")) bal += amt;
      }
    }
    await prisma.bankAccount.update({ where: { id: accId }, data: { currentBalance: bal } });
  }
  inc("updated");
}

async function s096Notifications() {
  log("S-096: 알림 발송 이력 시드 (4건)");
  const userKhang = await prisma.user.findFirst({ where: { employeeId: empIdMap["EMP-100-004"] } });
  const userAdmin = await prisma.user.findFirst({ where: { employeeId: empIdMap["EMP-100-001"] } });
  const userSales = await prisma.user.findFirst({ where: { employeeId: empIdMap["EMP-100-002"] } });
  const userAcct  = await prisma.user.findFirst({ where: { employeeId: empIdMap["EMP-100-007"] } });
  const items = [
    { user: userKhang, type: "AS_NEW" as const,             event: "AS_TICKET_ASSIGNED" as const,           titleKo: "AS-100-001 배정됨", linkUrl: "/as/dispatches" },
    { user: userSales, type: "OTHER" as const,              event: "SALES_FINANCE_CFM_DONE" as const,       titleKo: "SLS-100-001 재경 CFM 완료", linkUrl: "/sales" },
    { user: userAcct,  type: "OTHER" as const,              event: "EXPENSE_REIMBURSE_APPROVED" as const,   titleKo: "EXP-100-001 환급 승인", linkUrl: "/finance/expenses" },
    { user: userAdmin, type: "YIELD_FRAUD_SUSPECT" as const,event: "YIELD_FRAUD_SUSPECT_EVENT" as const,    titleKo: "AS-100-010 부정 의심", linkUrl: "/admin/yield-analysis" },
  ];
  for (const it of items) {
    if (!it.user) continue;
    const ex = await prisma.notification.findFirst({ where: { userId: it.user.id, eventType: it.event, titleKo: it.titleKo } });
    if (ex) { inc("skipped"); continue; }
    const noti = await prisma.notification.create({
      data: {
        userId: it.user.id, type: it.type, eventType: it.event,
        titleKo: it.titleKo, titleVi: it.titleKo, titleEn: it.titleKo,
        bodyKo: `상세: ${it.titleKo}`, linkUrl: it.linkUrl, companyCode: "TV",
      },
    });
    // delivery
    await prisma.notificationDelivery.createMany({
      data: [
        { notificationId: noti.id, channel: "EMAIL", recipientId: it.user.employeeId ?? "", recipientAddress: it.user.email ?? "", status: "SENT", sentAt: new Date(), companyCode: "TV" },
        { notificationId: noti.id, channel: "ZALO",  recipientId: it.user.employeeId ?? "", recipientAddress: "0901100000", status: "SENT", sentAt: new Date(), companyCode: "TV" },
      ],
    });
    inc("created");
  }
}

// ──────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 seed-full-100 시작 — 기존 데이터 보존, prefix(100) 추가만");
  const t0 = Date.now();

  // PHASE 1
  await s001Clients();
  await s002Departments();
  await s003Employees();
  await s004Warehouses();
  await s005Items();
  await s006BOM();
  await s007Compat();
  await s008Projects();
  await s009Licenses();
  await s010Schedules();
  await s011CostCenters();
  await s012BankAccounts();
  await s013_015Verify();

  // PHASE 2
  await s016Purchases();
  await s021_025InventoryScenarios();

  // PHASE 3
  await s026ItContracts();
  await s027_029Amendments();
  await s030EarlyTerminate();
  await s031TmRentals();
  await s032TmTerminate();
  await s033SnmpReadings();
  await s034UsageConfirmations();
  await s040YieldAnalysis();

  // PHASE 4
  await s041_046AsTickets();
  await s054_055PortalRequests();

  // PHASE 5
  await s056Sales();
  await s057SalesAdjustment();
  await s058_059CashTxns();
  await s062Transfer();
  await s065MonthlySnapshot();

  // PHASE 6
  await s066Expenses();
  await s068Reimburse();
  await s069Allocations();
  await s073PayrollBulk();
  await s075Depreciation();

  // PHASE 7
  await s077ManualJE();
  await s079Reverse();
  await s087_088PeriodClose();

  // PHASE 8
  await s091PortalUser();
  await s093Quote();
  await s094Feedback();
  await s095PortalPoints();
  await s096Notifications();
  await sFinalFinanceEnrich();
  await sFinalCOAExpand();
  await sFinalEntryDateNormalize();
  await sFinalBalanceRecompute();

  const t = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`✅ 완료 (${t}s) — created=${counts.created} updated=${counts.updated} skipped=${counts.skipped} errors=${counts.errors}`);
}

main().catch((e) => { console.error("❌", e); process.exit(1); }).finally(() => prisma.$disconnect());
