import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest, handleFieldError, ok, requireEnum, serverError, trimNonEmpty,
} from "@/lib/api-utils";
import { ensureInventoryItemOnReceipt } from "@/lib/inventory-receipt";
import {
  lookupBaseRule,
  inferOwnerTypeForNewIn,
  type RefModule,
  type SubKind,
  type TxnTypeNew,
} from "@/lib/inventory-rules";
import type { InventoryReason, InventoryTxnType, AssetOwnerType } from "@/generated/prisma/client";

// Phase 1: 진리표 기반 입출고 bulk endpoint.
// 헤더 = txnType + referenceModule + subKind + 창고/거래처 (공통).
// 라인 = itemId + S/N + qty (+소모품: targetEquipmentSN).
// 라인별로 BASE_RULES 룩업 → masterAction 실행 + 자동 매입·매출 후보 생성.
// 구 reason 컬럼은 호환을 위해 backfill 매핑으로 채움.

const TXN_TYPES: readonly InventoryTxnType[] = ["IN", "OUT", "TRANSFER"] as const;
const REF_MODULES: readonly RefModule[] = ["RENTAL", "REPAIR", "CALIB", "DEMO", "TRADE", "CONSUMABLE"] as const;
const SUB_KINDS: readonly SubKind[] = ["REQUEST", "RETURN", "BORROW", "LEND", "PURCHASE", "SALE", "OTHER", "CONSUMABLE"] as const;

// 기존 호출자(매입·매출 모듈, AS dispatch, amendments) 호환을 위한 legacy reason 매핑.
function deriveLegacyReason(
  txnType: TxnTypeNew,
  refModule: RefModule | null,
  subKind: SubKind | null,
): InventoryReason {
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
  // TRANSFER
  if (refModule === "RENTAL") return "RENTAL";
  if (refModule === "REPAIR") return "REPAIR";
  if (refModule === "CALIB") return "CALIBRATION";
  if (refModule === "DEMO") return "DEMO";
  return "RENTAL";
}

const MAX_LINES = 1000;

function parseQty(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return 1;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

type Line = {
  itemId: string;
  serialNumber: string | null;
  quantity: number;
  targetEquipmentSN: string | null;
  targetContractId: string | null;
  note: string | null;
  scannedBarcode: string | null;
};

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const txnType = requireEnum(p.txnType, TXN_TYPES, "txnType") as TxnTypeNew;
      // referenceModule + subKind 신규 헤더
      const refModuleRaw = trimNonEmpty(p.referenceModule);
      const subKindRaw = trimNonEmpty(p.subKind);
      if (!refModuleRaw || !REF_MODULES.includes(refModuleRaw as RefModule)) {
        return badRequest("invalid_input", { field: "referenceModule" });
      }
      if (!subKindRaw || !SUB_KINDS.includes(subKindRaw as SubKind)) {
        return badRequest("invalid_input", { field: "subKind" });
      }
      const refModule = refModuleRaw as RefModule;
      const subKind = subKindRaw as SubKind;

      const fromWarehouseId = trimNonEmpty(p.fromWarehouseId);
      const toWarehouseId = trimNonEmpty(p.toWarehouseId);
      const clientId = trimNonEmpty(p.clientId);
      const fromClientId = trimNonEmpty(p.fromClientId);
      const toClientId = trimNonEmpty(p.toClientId);
      const headerNote = trimNonEmpty(p.note);

      // 헤더 가드
      if (txnType === "IN" && !toWarehouseId) {
        return badRequest("invalid_input", { field: "toWarehouseId", reason: "required_for_IN" });
      }
      if (txnType === "OUT") {
        if (!fromWarehouseId) return badRequest("invalid_input", { field: "fromWarehouseId", reason: "required_for_OUT" });
        if (!clientId) return badRequest("invalid_input", { field: "clientId", reason: "required_for_OUT" });
      }
      if (txnType === "TRANSFER") {
        if (fromWarehouseId || toWarehouseId) {
          return badRequest("invalid_input", { field: "warehouse", reason: "transfer_must_be_external_only" });
        }
        if (!fromClientId || !toClientId) {
          return badRequest("invalid_input", { field: "transferEndpoints", reason: "external_clients_required" });
        }
      }

      // 거래처/창고 존재성 검증
      if (fromWarehouseId) {
        const wh = await prisma.warehouse.findUnique({ where: { id: fromWarehouseId }, select: { id: true } });
        if (!wh) return badRequest("invalid_warehouse", { field: "fromWarehouseId" });
      }
      if (toWarehouseId) {
        const wh = await prisma.warehouse.findUnique({ where: { id: toWarehouseId }, select: { id: true } });
        if (!wh) return badRequest("invalid_warehouse", { field: "toWarehouseId" });
      }
      for (const [field, id] of [["clientId", clientId], ["fromClientId", fromClientId], ["toClientId", toClientId]] as const) {
        if (!id) continue;
        const c = await prisma.client.findUnique({ where: { id }, select: { id: true } });
        if (!c) return badRequest("invalid_client", { field });
      }

      // 라인 파싱
      const rawLines = Array.isArray(p.items) ? (p.items as unknown[]) : [];
      if (rawLines.length === 0) return badRequest("invalid_input", { field: "items", reason: "empty" });
      if (rawLines.length > MAX_LINES) return badRequest("invalid_input", { field: "items", reason: `over_${MAX_LINES}` });

      const lines: Line[] = [];
      for (let i = 0; i < rawLines.length; i++) {
        const r = rawLines[i] as Record<string, unknown>;
        const itemId = trimNonEmpty(r.itemId);
        if (!itemId) return badRequest("invalid_input", { field: `items[${i}].itemId` });
        const sn = trimNonEmpty(r.serialNumber);
        const qty = parseQty(r.quantity);
        if (!qty) return badRequest("invalid_input", { field: `items[${i}].quantity` });
        // S/N 필수성은 BASE_RULES 의 requireSerialNumber 로 일괄 결정 (CONSUMABLE 만 false)
        // 단 OUT 마스터 매칭은 OUT + sn 있을 때만 검증.
        if (subKind !== "CONSUMABLE" && txnType !== "TRANSFER" && !sn) {
          return badRequest("invalid_input", { field: `items[${i}].serialNumber`, reason: "required" });
        }
        const targetEquipmentSN = trimNonEmpty(r.targetEquipmentSN);
        if (subKind === "CONSUMABLE" && !targetEquipmentSN) {
          return badRequest("invalid_input", { field: `items[${i}].targetEquipmentSN`, reason: "required_for_consumable" });
        }
        lines.push({
          itemId,
          serialNumber: sn,
          quantity: qty,
          targetEquipmentSN: targetEquipmentSN ?? null,
          targetContractId: trimNonEmpty(r.targetContractId) ?? null,
          note: trimNonEmpty(r.note) ?? null,
          scannedBarcode: trimNonEmpty(r.scannedBarcode) ?? null,
        });
      }

      // Item 존재성 + S/N 중복(라인 내) 검증
      const itemIds = Array.from(new Set(lines.map((l) => l.itemId)));
      const items = await prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true } });
      const validItemIds = new Set(items.map((it) => it.id));
      for (let i = 0; i < lines.length; i++) {
        if (!validItemIds.has(lines[i].itemId)) return badRequest("invalid_item", { field: `items[${i}].itemId` });
      }
      const sns = lines.map((l) => l.serialNumber).filter((s): s is string => !!s);
      if (sns.length !== new Set(sns).size) {
        return badRequest("invalid_input", { field: "items", reason: "duplicate_serial_in_request" });
      }

      // OUT 검증 — 마스터 존재 + 창고 일치 (CONSUMABLE 예외)
      const masters = sns.length > 0
        ? await prisma.inventoryItem.findMany({
          where: { serialNumber: { in: sns } },
          select: { serialNumber: true, warehouseId: true, ownerType: true, archivedAt: true },
        })
        : [];
      const masterBySn = new Map(masters.map((m) => [m.serialNumber, m]));

      if (txnType === "OUT" && subKind !== "CONSUMABLE") {
        for (let i = 0; i < lines.length; i++) {
          const sn = lines[i].serialNumber;
          if (!sn) continue;
          const m = masterBySn.get(sn);
          if (!m) return badRequest("invalid_input", { field: `items[${i}].serialNumber`, reason: "sn_not_in_inventory" });
          if (m.archivedAt) return badRequest("invalid_input", { field: `items[${i}].serialNumber`, reason: "sn_archived" });
          if (fromWarehouseId && m.warehouseId !== fromWarehouseId) {
            return badRequest("invalid_input", { field: `items[${i}].serialNumber`, reason: "sn_warehouse_mismatch" });
          }
        }
      }

      // 거래처 ClientRuleOverride 1회 룩업 (옵션)
      const overrideClient = clientId ?? fromClientId ?? toClientId ?? null;
      const ruleOverride = overrideClient
        ? await prisma.clientRuleOverride.findUnique({
          where: { clientId_referenceModule: { clientId: overrideClient, referenceModule: refModule } },
        })
        : null;

      // targetContractId 자동 매핑 (CONSUMABLE)
      const targetSns = Array.from(new Set(lines.map((l) => l.targetEquipmentSN).filter((s): s is string => !!s)));
      const eqMap = new Map<string, string>();
      if (targetSns.length > 0) {
        const eqs = await prisma.itContractEquipment.findMany({
          where: { serialNumber: { in: targetSns }, removedAt: null },
          select: { serialNumber: true, itContractId: true },
        });
        for (const eq of eqs) eqMap.set(eq.serialNumber, eq.itContractId);
      }

      // 라인별 처리
      const txnSharedClientId = txnType === "TRANSFER" ? fromClientId : clientId;
      const transferTail = txnType === "TRANSFER" && toClientId ? ` → client:${toClientId}` : "";

      const created = await prisma.$transaction(async (tx) => {
        const txns: { id: string; ruleScenario: string | null }[] = [];
        for (const line of lines) {
          // ownerType 결정: 마스터 있으면 그대로, 없으면 IN-신규 추론
          const masterRow = line.serialNumber ? masterBySn.get(line.serialNumber) : null;
          let ownerType: AssetOwnerType;
          if (masterRow) {
            ownerType = masterRow.ownerType;
          } else if (txnType === "IN") {
            ownerType = inferOwnerTypeForNewIn(subKind);
          } else {
            // OUT/TRANSFER 인데 마스터 없으면 (CONSUMABLE_OUT 만 가능) — 회사 기본
            ownerType = "COMPANY";
          }

          // BASE_RULES 룩업
          const baseAction = lookupBaseRule(txnType, refModule, subKind, ownerType);
          // override 적용 (예외 거래처 — autoPurchaseCandidate/autoSalesCandidate 만 덮어씀)
          const action = baseAction
            ? { ...baseAction, ...((ruleOverride?.overrideJson as Record<string, unknown>) ?? {}) }
            : null;

          const lineNoteFinal = [headerNote, line.note, transferTail].filter(Boolean).join(" · ");
          const resolvedTargetContractId = line.targetContractId
            ?? (line.targetEquipmentSN ? eqMap.get(line.targetEquipmentSN) ?? null : null);

          const legacyReason = deriveLegacyReason(txnType, refModule, subKind);
          const txn = await tx.inventoryTransaction.create({
            data: {
              companyCode: session.companyCode,
              itemId: line.itemId,
              fromWarehouseId: fromWarehouseId ?? null,
              toWarehouseId: toWarehouseId ?? null,
              clientId: txnSharedClientId ?? null,
              fromClientId: fromClientId ?? null,
              toClientId: toClientId ?? null,
              serialNumber: line.serialNumber,
              txnType,
              reason: legacyReason,
              referenceModule: refModule,
              subKind,
              quantity: line.quantity,
              scannedBarcode: line.scannedBarcode,
              note: lineNoteFinal || null,
              targetEquipmentSN: line.targetEquipmentSN,
              targetContractId: resolvedTargetContractId,
              performedById: session.sub,
              performedAt: new Date(),
            },
          });

          // 마스터 동작 (BASE_RULES 결정)
          if (action && line.serialNumber) {
            switch (action.masterAction) {
              case "NEW":
                if (txnType === "IN" && toWarehouseId) {
                  await ensureInventoryItemOnReceipt(tx, {
                    itemId: line.itemId,
                    serialNumber: line.serialNumber,
                    warehouseId: toWarehouseId,
                    companyCode: session.companyCode,
                    ownerType,
                    ownerClientId: ownerType === "EXTERNAL_CLIENT" ? (clientId ?? null) : null,
                    inboundReason: legacyReason,
                  });
                }
                break;
              case "MOVE":
                if (txnType === "IN" && toWarehouseId) {
                  await tx.inventoryItem.update({
                    where: { serialNumber: line.serialNumber },
                    data: {
                      warehouseId: toWarehouseId,
                      currentLocationClientId: null,
                      currentLocationSinceAt: new Date(),
                    },
                  }).catch(() => undefined);
                }
                break;
              case "TRANSFER_LOC":
                // 외부 위탁 — 거래처 위치로 마스터 이동 표시 (자사창고는 그대로 둠 — 회수 시점에 복원)
                await tx.inventoryItem.update({
                  where: { serialNumber: line.serialNumber },
                  data: {
                    currentLocationClientId: clientId ?? null,
                    currentLocationSinceAt: new Date(),
                  },
                }).catch(() => undefined);
                break;
              case "ARCHIVE":
                await tx.inventoryItem.update({
                  where: { serialNumber: line.serialNumber },
                  data: { archivedAt: new Date() },
                }).catch(() => undefined);
                break;
              case "NONE":
              default:
                break;
            }
          }

          // Phase 2: 자동 매입·매출 후보 (PayableReceivable DRAFT) 생성
          if (action) {
            // 매입후보: clientId(외주처/공급처)와 자기 자신을 sourceInventoryTxn 으로 연결
            if (action.autoPurchaseCandidate) {
              const supplierCandidate = clientId ?? fromClientId ?? null;
              if (supplierCandidate) {
                await tx.payableReceivable.create({
                  data: {
                    companyCode: session.companyCode,
                    kind: "PAYABLE",
                    clientId: supplierCandidate,
                    amount: "0", // 금액 미정 — 매입 발행 시점에 입력
                    status: "DRAFT",
                    sourceInventoryTxnId: txn.id,
                  },
                });
              }
            }
            // 매출후보: clientId(고객) 또는 toClientId
            if (action.autoSalesCandidate) {
              const customerCandidate = clientId ?? toClientId ?? null;
              if (customerCandidate) {
                await tx.payableReceivable.create({
                  data: {
                    companyCode: session.companyCode,
                    kind: "RECEIVABLE",
                    clientId: customerCandidate,
                    amount: "0",
                    status: "DRAFT",
                    sourceInventoryTxnId: txn.id,
                  },
                });
              }
            }
          }

          txns.push({ id: txn.id, ruleScenario: action ? `${action.scenarioId}: ${action.scenarioLabel}` : null });
        }
        return txns;
      }, { timeout: 30_000 });

      return ok({ transactions: created, count: created.length }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      return serverError(err);
    }
  });
}
