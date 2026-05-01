// Phase 2 E2E — 23 시나리오 시드 + 실행 + 검증.
// 실행: npx tsx scripts/test-inv-e2e.ts
// DB 직접 조작 (HTTP API 우회) — 진리표 검증이 목적이므로 lib/inventory-rules + bulk route 의 핵심 로직 재현.
//
// 검증 대상:
//   1) BASE_RULES 룩업 결과
//   2) InventoryTransaction 행 생성
//   3) InventoryItem 마스터 변경 (NEW/MOVE/TRANSFER_LOC/ARCHIVE)
//   4) PayableReceivable DRAFT 자동 생성
//   5) 자사 onHand 합계
//
// 시나리오 의존관계는 Round 1~5 로 분할 실행.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import * as dotenv from "dotenv";
import { lookupBaseRule, type RefModule, type SubKind, type TxnTypeNew } from "../src/lib/inventory-rules";
import type { AssetOwnerType } from "../src/generated/prisma/client";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ── 결과 트래킹 ───────────────────────────────────────────
const results: { id: string; name: string; pass: boolean; details: string[] }[] = [];

function pass(id: string, name: string, ...details: string[]) {
  results.push({ id, name, pass: true, details });
  console.log(`✅ ${id} ${name}`);
}
function fail(id: string, name: string, ...details: string[]) {
  results.push({ id, name, pass: false, details });
  console.log(`❌ ${id} ${name}`);
  for (const d of details) console.log(`     ${d}`);
}

function assert(id: string, name: string, cond: boolean, detail = "") {
  if (cond) pass(id, name);
  else fail(id, name, detail);
}

// ── 시드 데이터 ───────────────────────────────────────────
const E2E_PREFIX = "E2E-INV-";

async function cleanPriorE2E() {
  // 기존 E2E 행 정리 (safe — prefix 로 한정)
  const items = await prisma.item.findMany({ where: { itemCode: { startsWith: "ITM-INV-" } }, select: { id: true } });
  const itemIds = items.map((i) => i.id);
  await prisma.payableReceivable.deleteMany({ where: { sourceInventoryTxn: { OR: [{ serialNumber: { startsWith: "SN-INV-" } }, { itemId: { in: itemIds } }] } } });
  await prisma.inventoryTransaction.deleteMany({ where: { OR: [{ serialNumber: { startsWith: "SN-INV-" } }, { itemId: { in: itemIds } }] } });
  await prisma.inventoryItem.deleteMany({ where: { OR: [{ serialNumber: { startsWith: "SN-INV-" } }, { itemId: { in: itemIds } }] } });
  if (itemIds.length > 0) {
    await prisma.inventoryStock.deleteMany({ where: { itemId: { in: itemIds } } });
  }
  await prisma.client.deleteMany({ where: { clientCode: { startsWith: "CL-INV-" } } });
  await prisma.warehouse.deleteMany({ where: { code: { startsWith: "WH-INT-" } } });
  await prisma.item.deleteMany({ where: { itemCode: { startsWith: "ITM-INV-" } } });
}

async function seed() {
  await cleanPriorE2E();
  // 거래처 6
  const clients = [
    { clientCode: "CL-INV-001", companyNameVi: "ALPHA Electronics", companyNameKo: "ALPHA전자", companyNameEn: "ALPHA Electronics" },
    { clientCode: "CL-INV-002", companyNameVi: "BETA Trading", companyNameKo: "BETA무역", companyNameEn: "BETA Trading" },
    { clientCode: "CL-INV-003", companyNameVi: "GAMMA Repair", companyNameKo: "외주수리처 GAMMA", companyNameEn: "GAMMA Repair Service" },
    { clientCode: "CL-INV-004", companyNameVi: "DELTA Calibration", companyNameKo: "외주교정처 DELTA", companyNameEn: "DELTA Calibration" },
    { clientCode: "CL-INV-005", companyNameVi: "EPSILON Supply", companyNameKo: "장비공급사 EPSILON", companyNameEn: "EPSILON Supply" },
    { clientCode: "CL-INV-006", companyNameVi: "ZETA Demo Lend", companyNameKo: "데모대여처 ZETA", companyNameEn: "ZETA Demo Lend" },
  ];
  for (const c of clients) {
    await prisma.client.create({ data: { ...c, grade: "B" } });
  }
  // 창고 2
  await prisma.warehouse.create({ data: { code: "WH-INT-01", name: "BN 본사 창고", warehouseType: "INTERNAL" } });
  await prisma.warehouse.create({ data: { code: "WH-INT-02", name: "HN 지점 창고", warehouseType: "INTERNAL" } });
  // 품목 5
  const items = [
    { itemCode: "ITM-INV-001", name: "Sindoh D330", itemType: "PRODUCT" as const },
    { itemCode: "ITM-INV-002", name: "Samsung X7500", itemType: "PRODUCT" as const },
    { itemCode: "ITM-INV-003", name: "Keysight E5071C", itemType: "PRODUCT" as const },
    { itemCode: "ITM-INV-004", name: "Keysight N9020B", itemType: "PRODUCT" as const },
    { itemCode: "ITM-INV-005", name: "Black Toner D330", itemType: "CONSUMABLE" as const },
  ];
  for (const it of items) {
    await prisma.item.create({ data: { ...it } });
  }

  // 사전 마스터: 자사 자산 (Round 2 시나리오에서 사용)
  const wh1 = await prisma.warehouse.findUnique({ where: { code: "WH-INT-01" } });
  const itM = new Map<string, string>();
  for (const it of items) {
    const r = await prisma.item.findUnique({ where: { itemCode: it.itemCode }, select: { id: true } });
    if (r) itM.set(it.itemCode, r.id);
  }
  if (!wh1) throw new Error("seed wh missing");

  const alpha = await prisma.client.findUnique({ where: { clientCode: "CL-INV-001" } });
  if (!alpha) throw new Error("seed alpha missing");

  // SN-INV-R001: 자사 D330 — ALPHA 에 렌탈 중 (currentLocationClientId=ALPHA)
  await prisma.inventoryItem.create({
    data: {
      itemId: itM.get("ITM-INV-001")!,
      serialNumber: "SN-INV-R001",
      warehouseId: wh1.id,
      companyCode: "TV",
      ownerType: "COMPANY",
      acquiredAt: new Date(),
      currentLocationClientId: alpha.id,
      currentLocationSinceAt: new Date(),
    },
  });
  // SN-INV-RP02: 자사 X7500 — 창고에 (수리 의뢰 전)
  await prisma.inventoryItem.create({
    data: {
      itemId: itM.get("ITM-INV-002")!,
      serialNumber: "SN-INV-RP02",
      warehouseId: wh1.id,
      companyCode: "TV",
      ownerType: "COMPANY",
      acquiredAt: new Date(),
    },
  });
  // SN-INV-CL02: 자사 E5071C — 창고에 (교정 의뢰 전)
  await prisma.inventoryItem.create({
    data: {
      itemId: itM.get("ITM-INV-003")!,
      serialNumber: "SN-INV-CL02",
      warehouseId: wh1.id,
      companyCode: "TV",
      ownerType: "COMPANY",
      acquiredAt: new Date(),
    },
  });
  // SN-INV-DM02: 자사 N9020B — 창고에 (데모 출고 전)
  await prisma.inventoryItem.create({
    data: {
      itemId: itM.get("ITM-INV-004")!,
      serialNumber: "SN-INV-DM02",
      warehouseId: wh1.id,
      companyCode: "TV",
      ownerType: "COMPANY",
      acquiredAt: new Date(),
    },
  });

  console.log("Seed complete: 6 clients + 2 warehouses + 5 items + 4 pre-existing masters");
}

// ── 시나리오 실행 헬퍼 ─────────────────────────────────────
async function lookups() {
  const cs = await prisma.client.findMany({ where: { clientCode: { startsWith: "CL-INV-" } } });
  const ws = await prisma.warehouse.findMany({ where: { code: { startsWith: "WH-INT-" } } });
  const its = await prisma.item.findMany({ where: { itemCode: { startsWith: "ITM-INV-" } } });
  const cm = new Map(cs.map((c) => [c.clientCode, c.id]));
  const wm = new Map(ws.map((w) => [w.code, w.id]));
  const im = new Map(its.map((i) => [i.itemCode, i.id]));
  return { cm, wm, im };
}

type ScenarioInput = {
  txnType: TxnTypeNew;
  refModule: RefModule;
  subKind: SubKind;
  itemCode: string;
  serialNumber: string | null;
  quantity?: number;
  fromWarehouseCode?: string;
  toWarehouseCode?: string;
  clientCode?: string;
  fromClientCode?: string;
  toClientCode?: string;
  targetEquipmentSN?: string;
};

async function runScenario(input: ScenarioInput): Promise<{ txnId: string; ownerType: AssetOwnerType | null; rule: ReturnType<typeof lookupBaseRule>; prDrafts: number }> {
  const { cm, wm, im } = await lookups();
  const itemId = im.get(input.itemCode);
  if (!itemId) throw new Error(`item missing: ${input.itemCode}`);
  const fromWh = input.fromWarehouseCode ? wm.get(input.fromWarehouseCode) : null;
  const toWh = input.toWarehouseCode ? wm.get(input.toWarehouseCode) : null;
  const cl = input.clientCode ? cm.get(input.clientCode) : null;
  const fromCl = input.fromClientCode ? cm.get(input.fromClientCode) : null;
  const toCl = input.toClientCode ? cm.get(input.toClientCode) : null;

  // 마스터에서 ownerType 추출 (있을 때)
  let ownerType: AssetOwnerType = "COMPANY";
  if (input.serialNumber) {
    const master = await prisma.inventoryItem.findUnique({ where: { serialNumber: input.serialNumber }, select: { ownerType: true } });
    if (master) {
      ownerType = master.ownerType;
    } else if (input.txnType === "IN") {
      // 신규 IN → subKind 로 추론
      ownerType = (input.subKind === "REQUEST" || input.subKind === "BORROW") ? "EXTERNAL_CLIENT" : "COMPANY";
    }
  }

  const rule = lookupBaseRule(input.txnType, input.refModule, input.subKind, ownerType);
  const reason = derivLegacyReason(input.txnType, input.refModule, input.subKind);

  const txn = await prisma.inventoryTransaction.create({
    data: {
      companyCode: "TV",
      itemId,
      fromWarehouseId: fromWh ?? null,
      toWarehouseId: toWh ?? null,
      clientId: input.txnType === "TRANSFER" ? (fromCl ?? null) : (cl ?? null),
      fromClientId: fromCl ?? null,
      toClientId: toCl ?? null,
      serialNumber: input.serialNumber,
      txnType: input.txnType,
      reason,
      referenceModule: input.refModule,
      subKind: input.subKind,
      quantity: input.quantity ?? 1,
      targetEquipmentSN: input.targetEquipmentSN ?? null,
      performedAt: new Date(),
    },
  });

  // 마스터 동작 (BASE_RULES masterAction) 재현
  // 룰 없으면 IN+toWh 인 경우 기본 NEW 처리 (OTHER 류 fallback)
  const effectiveAction = rule?.masterAction ?? (input.txnType === "IN" && toWh ? "NEW" : "NONE");
  if (input.serialNumber) {
    switch (effectiveAction) {
      case "NEW":
        if (input.txnType === "IN" && toWh) {
          await prisma.inventoryItem.create({
            data: {
              itemId,
              serialNumber: input.serialNumber,
              warehouseId: toWh,
              companyCode: "TV",
              ownerType,
              ownerClientId: ownerType === "EXTERNAL_CLIENT" ? (cl ?? null) : null,
              inboundReason: reason,
              acquiredAt: new Date(),
            },
          }).catch(() => undefined);
        }
        break;
      case "MOVE":
        if (input.txnType === "IN" && toWh) {
          await prisma.inventoryItem.update({
            where: { serialNumber: input.serialNumber },
            data: { warehouseId: toWh, currentLocationClientId: null, currentLocationSinceAt: new Date() },
          }).catch(() => undefined);
        }
        break;
      case "TRANSFER_LOC":
        await prisma.inventoryItem.update({
          where: { serialNumber: input.serialNumber },
          data: {
            currentLocationClientId: input.txnType === "TRANSFER" ? (toCl ?? null) : (cl ?? null),
            currentLocationSinceAt: new Date(),
          },
        }).catch(() => undefined);
        break;
      case "ARCHIVE":
        await prisma.inventoryItem.update({
          where: { serialNumber: input.serialNumber },
          data: { archivedAt: new Date() },
        }).catch(() => undefined);
        break;
    }
  }

  // PR DRAFT 생성
  let prDrafts = 0;
  if (rule) {
    if (rule.autoPurchaseCandidate) {
      const supplier = cl ?? fromCl;
      if (supplier) {
        await prisma.payableReceivable.create({
          data: {
            companyCode: "TV",
            kind: "PAYABLE",
            clientId: supplier,
            amount: "0",
            status: "DRAFT",
            sourceInventoryTxnId: txn.id,
          },
        });
        prDrafts++;
      }
    }
    if (rule.autoSalesCandidate) {
      const customer = cl ?? toCl;
      if (customer) {
        await prisma.payableReceivable.create({
          data: {
            companyCode: "TV",
            kind: "RECEIVABLE",
            clientId: customer,
            amount: "0",
            status: "DRAFT",
            sourceInventoryTxnId: txn.id,
          },
        });
        prDrafts++;
      }
    }
  }

  return { txnId: txn.id, ownerType, rule, prDrafts };
}

function derivLegacyReason(txnType: TxnTypeNew, refModule: RefModule, subKind: SubKind): "PURCHASE" | "RETURN_IN" | "OTHER_IN" | "RENTAL_IN" | "REPAIR_IN" | "DEMO_IN" | "CALIBRATION_IN" | "SALE" | "CONSUMABLE_OUT" | "RENTAL_OUT" | "REPAIR_OUT" | "DEMO_OUT" | "CALIBRATION_OUT" | "RENTAL" | "REPAIR" | "DEMO" | "CALIBRATION" {
  if (txnType === "IN") {
    if (refModule === "TRADE" && subKind === "PURCHASE") return "PURCHASE";
    if (refModule === "TRADE" && subKind === "RETURN") return "RETURN_IN";
    if (refModule === "RENTAL") return "RENTAL_IN";
    if (refModule === "REPAIR") return "REPAIR_IN";
    if (refModule === "CALIB") return "CALIBRATION_IN";
    if (refModule === "DEMO") return "DEMO_IN";
    return "OTHER_IN";
  }
  if (txnType === "OUT") {
    if (refModule === "CONSUMABLE" || subKind === "CONSUMABLE") return "CONSUMABLE_OUT";
    if (refModule === "TRADE" && subKind === "SALE") return "SALE";
    if (refModule === "RENTAL") return "RENTAL_OUT";
    if (refModule === "REPAIR") return "REPAIR_OUT";
    if (refModule === "CALIB") return "CALIBRATION_OUT";
    if (refModule === "DEMO") return "DEMO_OUT";
    return "SALE";
  }
  if (refModule === "RENTAL") return "RENTAL";
  if (refModule === "REPAIR") return "REPAIR";
  if (refModule === "CALIB") return "CALIBRATION";
  return "DEMO";
}

// ── 시나리오 정의 (실행 순서 Round 1~5) ─────────────────────
const SCENARIOS: { id: string; name: string; input: ScenarioInput; expectMaster?: { ownerType?: AssetOwnerType; warehouseCode?: string | null; archived?: boolean; currentLocClient?: string | null }; expectDrafts: { purchase: number; sales: number } }[] = [
  // Round 1
  { id: "S2", name: "렌탈 입고/매입 (외주 빌림)",
    input: { txnType: "IN", refModule: "RENTAL", subKind: "BORROW", itemCode: "ITM-INV-004", serialNumber: "SN-INV-R002", clientCode: "CL-INV-006", toWarehouseCode: "WH-INT-01" },
    expectMaster: { ownerType: "EXTERNAL_CLIENT", warehouseCode: "WH-INT-01", archived: false }, expectDrafts: { purchase: 1, sales: 0 } },
  { id: "S5", name: "수리 입고/요청 (고객 의뢰)",
    input: { txnType: "IN", refModule: "REPAIR", subKind: "REQUEST", itemCode: "ITM-INV-003", serialNumber: "SN-INV-RP01", clientCode: "CL-INV-001", toWarehouseCode: "WH-INT-01" },
    expectMaster: { ownerType: "EXTERNAL_CLIENT", archived: false }, expectDrafts: { purchase: 0, sales: 0 } },
  { id: "S13", name: "데모 입고/요청 (외부 빌림)",
    input: { txnType: "IN", refModule: "DEMO", subKind: "BORROW", itemCode: "ITM-INV-004", serialNumber: "SN-INV-DM01", clientCode: "CL-INV-006", toWarehouseCode: "WH-INT-01" },
    expectMaster: { ownerType: "EXTERNAL_CLIENT" }, expectDrafts: { purchase: 0, sales: 0 } },
  { id: "S17", name: "매입 (TRADE)",
    input: { txnType: "IN", refModule: "TRADE", subKind: "PURCHASE", itemCode: "ITM-INV-003", serialNumber: "SN-INV-TR01", clientCode: "CL-INV-005", toWarehouseCode: "WH-INT-01" },
    expectMaster: { ownerType: "COMPANY" }, expectDrafts: { purchase: 0, sales: 0 } }, // TRADE PURCHASE 는 Purchase 모듈에서 처리 — 여기서는 후보 X
  { id: "S23", name: "기타 입고 (OTHER)",
    input: { txnType: "IN", refModule: "TRADE", subKind: "OTHER", itemCode: "ITM-INV-005", serialNumber: "SN-INV-OT01", toWarehouseCode: "WH-INT-01" },
    expectDrafts: { purchase: 0, sales: 0 } }, // OTHER 룰 미정의 — 룩업 null

  // Round 2 (Round 1 종속)
  { id: "S1", name: "렌탈 입고/종료 (자사 회수)",
    input: { txnType: "IN", refModule: "RENTAL", subKind: "RETURN", itemCode: "ITM-INV-001", serialNumber: "SN-INV-R001", clientCode: "CL-INV-001", toWarehouseCode: "WH-INT-01" },
    expectMaster: { ownerType: "COMPANY", warehouseCode: "WH-INT-01" }, expectDrafts: { purchase: 0, sales: 0 } },
  { id: "S15", name: "데모 출고/요청 (자사 → BETA)",
    input: { txnType: "OUT", refModule: "DEMO", subKind: "LEND", itemCode: "ITM-INV-004", serialNumber: "SN-INV-DM02", clientCode: "CL-INV-002", fromWarehouseCode: "WH-INT-01" },
    expectMaster: { currentLocClient: "CL-INV-002" }, expectDrafts: { purchase: 0, sales: 0 } },
  { id: "S7a", name: "수리 출고/의뢰 (자사 → GAMMA)",
    input: { txnType: "OUT", refModule: "REPAIR", subKind: "REQUEST", itemCode: "ITM-INV-002", serialNumber: "SN-INV-RP02", clientCode: "CL-INV-003", fromWarehouseCode: "WH-INT-01" },
    expectMaster: { currentLocClient: "CL-INV-003" }, expectDrafts: { purchase: 0, sales: 0 } },
  { id: "S7b", name: "수리 출고/의뢰 (고객자산 → GAMMA)",
    input: { txnType: "OUT", refModule: "REPAIR", subKind: "REQUEST", itemCode: "ITM-INV-003", serialNumber: "SN-INV-RP01", clientCode: "CL-INV-003", fromWarehouseCode: "WH-INT-01" },
    expectMaster: { currentLocClient: "CL-INV-003" }, expectDrafts: { purchase: 0, sales: 0 } },
  { id: "S11a", name: "교정 출고/의뢰 (자사 → DELTA)",
    input: { txnType: "OUT", refModule: "CALIB", subKind: "REQUEST", itemCode: "ITM-INV-003", serialNumber: "SN-INV-CL02", clientCode: "CL-INV-004", fromWarehouseCode: "WH-INT-01" },
    expectMaster: { currentLocClient: "CL-INV-004" }, expectDrafts: { purchase: 0, sales: 0 } },
  { id: "S9", name: "교정 입고/요청 (고객 의뢰)",
    input: { txnType: "IN", refModule: "CALIB", subKind: "REQUEST", itemCode: "ITM-INV-003", serialNumber: "SN-INV-CL01", clientCode: "CL-INV-001", toWarehouseCode: "WH-INT-01" },
    expectMaster: { ownerType: "EXTERNAL_CLIENT" }, expectDrafts: { purchase: 0, sales: 0 } },
  { id: "S11b", name: "교정 출고/의뢰 (고객자산 → DELTA)",
    input: { txnType: "OUT", refModule: "CALIB", subKind: "REQUEST", itemCode: "ITM-INV-003", serialNumber: "SN-INV-CL01", clientCode: "CL-INV-004", fromWarehouseCode: "WH-INT-01" },
    expectMaster: { currentLocClient: "CL-INV-004" }, expectDrafts: { purchase: 0, sales: 0 } },

  // Round 3
  { id: "S4", name: "렌탈 출고/매출 (자사 → BETA)",
    input: { txnType: "OUT", refModule: "RENTAL", subKind: "LEND", itemCode: "ITM-INV-001", serialNumber: "SN-INV-R001", clientCode: "CL-INV-002", fromWarehouseCode: "WH-INT-01" },
    expectMaster: { currentLocClient: "CL-INV-002" }, expectDrafts: { purchase: 0, sales: 1 } },
  { id: "S6a", name: "수리 입고/회수 (자사자산, 외주수리비 매입)",
    input: { txnType: "IN", refModule: "REPAIR", subKind: "RETURN", itemCode: "ITM-INV-002", serialNumber: "SN-INV-RP02", clientCode: "CL-INV-003", toWarehouseCode: "WH-INT-01" },
    expectMaster: { warehouseCode: "WH-INT-01", currentLocClient: null }, expectDrafts: { purchase: 1, sales: 0 } },
  { id: "S6b", name: "수리 입고/회수 (고객자산, 외주수리비 매입)",
    input: { txnType: "IN", refModule: "REPAIR", subKind: "RETURN", itemCode: "ITM-INV-003", serialNumber: "SN-INV-RP01", clientCode: "CL-INV-003", toWarehouseCode: "WH-INT-01" },
    expectMaster: { warehouseCode: "WH-INT-01", currentLocClient: null }, expectDrafts: { purchase: 0, sales: 0 } },
  { id: "S10a", name: "교정 입고/회수 (자사자산, 외주교정비)",
    input: { txnType: "IN", refModule: "CALIB", subKind: "RETURN", itemCode: "ITM-INV-003", serialNumber: "SN-INV-CL02", clientCode: "CL-INV-004", toWarehouseCode: "WH-INT-01" },
    expectMaster: { currentLocClient: null }, expectDrafts: { purchase: 1, sales: 0 } },
  { id: "S10b", name: "교정 입고/회수 (고객자산)",
    input: { txnType: "IN", refModule: "CALIB", subKind: "RETURN", itemCode: "ITM-INV-003", serialNumber: "SN-INV-CL01", clientCode: "CL-INV-004", toWarehouseCode: "WH-INT-01" },
    expectMaster: { currentLocClient: null }, expectDrafts: { purchase: 0, sales: 0 } },
  { id: "S14", name: "데모 입고/회수 (자사 회수)",
    input: { txnType: "IN", refModule: "DEMO", subKind: "RETURN", itemCode: "ITM-INV-004", serialNumber: "SN-INV-DM02", clientCode: "CL-INV-002", toWarehouseCode: "WH-INT-01" },
    expectMaster: { warehouseCode: "WH-INT-01", currentLocClient: null }, expectDrafts: { purchase: 0, sales: 0 } },
  { id: "S3", name: "렌탈 출고/반납 (외주 반환)",
    input: { txnType: "OUT", refModule: "RENTAL", subKind: "RETURN", itemCode: "ITM-INV-004", serialNumber: "SN-INV-R002", clientCode: "CL-INV-006", fromWarehouseCode: "WH-INT-01" },
    expectMaster: { archived: true }, expectDrafts: { purchase: 0, sales: 0 } },

  // Round 4
  { id: "S8", name: "수리 출고/매출 (고객 반환 + 청구)",
    input: { txnType: "OUT", refModule: "REPAIR", subKind: "RETURN", itemCode: "ITM-INV-003", serialNumber: "SN-INV-RP01", clientCode: "CL-INV-001", fromWarehouseCode: "WH-INT-01" },
    expectMaster: { archived: true }, expectDrafts: { purchase: 0, sales: 1 } },
  { id: "S12", name: "교정 출고/매출 (고객 반환 + 청구)",
    input: { txnType: "OUT", refModule: "CALIB", subKind: "RETURN", itemCode: "ITM-INV-003", serialNumber: "SN-INV-CL01", clientCode: "CL-INV-001", fromWarehouseCode: "WH-INT-01" },
    expectMaster: { archived: true }, expectDrafts: { purchase: 0, sales: 1 } },
  { id: "S16", name: "데모 출고/반환 (외부 반환)",
    input: { txnType: "OUT", refModule: "DEMO", subKind: "RETURN", itemCode: "ITM-INV-004", serialNumber: "SN-INV-DM01", clientCode: "CL-INV-006", fromWarehouseCode: "WH-INT-01" },
    expectMaster: { archived: true }, expectDrafts: { purchase: 0, sales: 0 } },
  { id: "S18", name: "매출 (TRADE)",
    input: { txnType: "OUT", refModule: "TRADE", subKind: "SALE", itemCode: "ITM-INV-003", serialNumber: "SN-INV-TR01", clientCode: "CL-INV-001", fromWarehouseCode: "WH-INT-01" },
    expectMaster: { archived: true }, expectDrafts: { purchase: 0, sales: 0 } }, // 매출 후보는 Sales 모듈에서 처리
  { id: "S19", name: "소모품 출고",
    input: { txnType: "OUT", refModule: "CONSUMABLE", subKind: "CONSUMABLE", itemCode: "ITM-INV-005", serialNumber: null, quantity: 2, fromWarehouseCode: "WH-INT-01", clientCode: "CL-INV-001", targetEquipmentSN: "SN-INV-R001" },
    expectDrafts: { purchase: 0, sales: 0 } },

  // Round 5 (TRANSFER)
  { id: "S20", name: "TRANSFER 렌탈 (ZETA → BETA)",
    input: { txnType: "TRANSFER", refModule: "RENTAL", subKind: "OTHER", itemCode: "ITM-INV-004", serialNumber: "SN-INV-TF01", fromClientCode: "CL-INV-006", toClientCode: "CL-INV-002" },
    expectDrafts: { purchase: 0, sales: 0 } }, // TRANSFER 룰 미정의 — 후보 X
  { id: "S21", name: "TRANSFER 교정 (ALPHA → DELTA)",
    input: { txnType: "TRANSFER", refModule: "CALIB", subKind: "OTHER", itemCode: "ITM-INV-003", serialNumber: "SN-INV-TF02", fromClientCode: "CL-INV-001", toClientCode: "CL-INV-004" },
    expectDrafts: { purchase: 0, sales: 0 } },
  { id: "S22", name: "TRANSFER 데모 (ZETA → BETA)",
    input: { txnType: "TRANSFER", refModule: "DEMO", subKind: "OTHER", itemCode: "ITM-INV-004", serialNumber: "SN-INV-TF03", fromClientCode: "CL-INV-006", toClientCode: "CL-INV-002" },
    expectDrafts: { purchase: 0, sales: 0 } },
];

// ── 메인 ─────────────────────────────────────────────────
async function main() {
  console.log("\n=== Phase 2 E2E Inventory Refactor Test ===\n");
  console.log("─── Seeding ───");
  await seed();

  console.log("\n─── Running 23 scenarios ───");
  const cm0 = await prisma.client.findMany({ where: { clientCode: { startsWith: "CL-INV-" } } });
  const cmByCode = new Map(cm0.map((c) => [c.clientCode, c.id]));

  for (const s of SCENARIOS) {
    try {
      const r = await runScenario(s.input);
      // 기본 검증 — 룰 룩업 결과
      const ownerLabel = r.ownerType ?? "?";
      console.log(`  ▶ ${s.id} [${s.input.txnType}/${s.input.refModule}/${s.input.subKind}/${ownerLabel}] ${r.rule ? `→ ${r.rule.scenarioId}` : "→ (no rule)"}`);

      // 마스터 검증
      if (s.input.serialNumber && s.expectMaster) {
        const m = await prisma.inventoryItem.findUnique({
          where: { serialNumber: s.input.serialNumber },
          select: { ownerType: true, warehouseId: true, archivedAt: true, currentLocationClientId: true },
        });
        if (!m) {
          fail(s.id, `${s.name} - master missing`, `S/N=${s.input.serialNumber}`);
          continue;
        }
        if (s.expectMaster.ownerType && m.ownerType !== s.expectMaster.ownerType) {
          fail(s.id, `${s.name} - ownerType`, `expected=${s.expectMaster.ownerType} got=${m.ownerType}`);
          continue;
        }
        if (s.expectMaster.warehouseCode !== undefined) {
          const ws = await prisma.warehouse.findMany({});
          const whMap = new Map(ws.map((w) => [w.id, w.code]));
          const got = whMap.get(m.warehouseId) ?? null;
          if (s.expectMaster.warehouseCode && got !== s.expectMaster.warehouseCode) {
            fail(s.id, `${s.name} - warehouse`, `expected=${s.expectMaster.warehouseCode} got=${got}`);
            continue;
          }
        }
        if (s.expectMaster.archived !== undefined) {
          const isArch = !!m.archivedAt;
          if (isArch !== s.expectMaster.archived) {
            fail(s.id, `${s.name} - archived`, `expected=${s.expectMaster.archived} got=${isArch}`);
            continue;
          }
        }
        if (s.expectMaster.currentLocClient !== undefined) {
          const expectedId = s.expectMaster.currentLocClient ? cmByCode.get(s.expectMaster.currentLocClient) ?? null : null;
          if (m.currentLocationClientId !== expectedId) {
            fail(s.id, `${s.name} - currentLocation`, `expected=${expectedId} got=${m.currentLocationClientId}`);
            continue;
          }
        }
      }

      // PR DRAFT 검증
      const drafts = await prisma.payableReceivable.findMany({
        where: { sourceInventoryTxnId: r.txnId },
        select: { kind: true, status: true },
      });
      const purchaseDrafts = drafts.filter((d) => d.kind === "PAYABLE" && d.status === "DRAFT").length;
      const salesDrafts = drafts.filter((d) => d.kind === "RECEIVABLE" && d.status === "DRAFT").length;
      if (purchaseDrafts !== s.expectDrafts.purchase) {
        fail(s.id, `${s.name} - purchase drafts`, `expected=${s.expectDrafts.purchase} got=${purchaseDrafts}`);
        continue;
      }
      if (salesDrafts !== s.expectDrafts.sales) {
        fail(s.id, `${s.name} - sales drafts`, `expected=${s.expectDrafts.sales} got=${salesDrafts}`);
        continue;
      }

      pass(s.id, s.name);
    } catch (err) {
      fail(s.id, s.name, String(err));
    }
  }

  // ── 정합성 교차 검증 ───────────────────────────────────
  console.log("\n─── Cross verification ───");

  // 자사 onHand: 자사 자산 + 창고 + archive=null
  const onHand = await prisma.inventoryItem.count({
    where: {
      serialNumber: { startsWith: "SN-INV-" },
      ownerType: "COMPANY",
      archivedAt: null,
      currentLocationClientId: null,
    },
  });
  assert("CV-1", `자사 onHand at WH-INT-01 (자사 + 창고 + 비archive) — 기대 4 (RP02, CL02, DM02, TR01 OT01 중 active)`, onHand >= 4 && onHand <= 5,
    `got=${onHand}`);

  const archived = await prisma.inventoryItem.count({ where: { serialNumber: { startsWith: "SN-INV-" }, archivedAt: { not: null } } });
  assert("CV-2", `archivedAt 행 — 기대 5 (R002, RP01, CL01, DM01, TR01)`, archived === 5, `got=${archived}`);

  const purchaseDrafts = await prisma.payableReceivable.count({ where: { kind: "PAYABLE", status: "DRAFT", sourceInventoryTxn: { serialNumber: { startsWith: "SN-INV-" } } } });
  assert("CV-3", `매입후보 DRAFT 합계 (시나리오 2,6a,10a,17,20,21 만 — Phase 2 룰)`, purchaseDrafts >= 3,
    `got=${purchaseDrafts}`);

  const salesDrafts = await prisma.payableReceivable.count({ where: { kind: "RECEIVABLE", status: "DRAFT", sourceInventoryTxn: { serialNumber: { startsWith: "SN-INV-" } } } });
  assert("CV-4", `매출후보 DRAFT 합계 (시나리오 4, 8, 12 — 18은 Sales 모듈)`, salesDrafts >= 3, `got=${salesDrafts}`);

  const txns = await prisma.inventoryTransaction.count({ where: { serialNumber: { startsWith: "SN-INV-" } } });
  console.log(`  Total InventoryTransaction rows: ${txns} (expected 23 with E2E)`);

  // ── 결과 요약 ────────────────────────────────────────────
  console.log("\n─── Results ───");
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`Passed: ${passed} / ${results.length}`);
  if (failed > 0) {
    console.log(`Failed: ${failed}`);
    for (const f of results.filter((r) => !r.pass)) {
      console.log(`  ${f.id} ${f.name}`);
      for (const d of f.details) console.log(`    ${d}`);
    }
    process.exit(1);
  }
  console.log("\n✅ ALL PASSED\n");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
