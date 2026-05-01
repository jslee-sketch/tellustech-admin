import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  companyScope,
  handleFieldError,
  ok,
  optionalEnum,
  requireEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { ensureInventoryItemOnReceipt } from "@/lib/inventory-receipt";
import type { InventoryReason, InventoryTxnType } from "@/generated/prisma/client";

const TXN_TYPES: readonly InventoryTxnType[] = ["IN", "OUT", "TRANSFER"] as const;
const REASONS: readonly InventoryReason[] = [
  "PURCHASE", "RETURN_IN", "OTHER_IN",
  "RENTAL_IN", "REPAIR_IN", "DEMO_IN", "CALIBRATION_IN",
  "SALE", "CONSUMABLE_OUT",
  "RENTAL_OUT", "REPAIR_OUT", "DEMO_OUT", "CALIBRATION_OUT",
  "CALIBRATION", "REPAIR", "RENTAL", "DEMO",
] as const;

// 외부 자산 입고 사유 — ownerClientId 필수 + 자동으로 EXTERNAL_CLIENT 소유주 처리
const EXTERNAL_IN_REASONS: readonly InventoryReason[] = [
  "RENTAL_IN", "REPAIR_IN", "DEMO_IN", "CALIBRATION_IN",
] as const;
// 외부 자산 반환 사유 — InventoryItem.ownerType=EXTERNAL_CLIENT 인 S/N 만 허용
const EXTERNAL_OUT_REASONS: readonly InventoryReason[] = [
  "RENTAL_OUT", "REPAIR_OUT", "DEMO_OUT", "CALIBRATION_OUT",
] as const;

// 유형-사유 매핑 (잘못된 조합 차단)
const REASON_BY_TYPE: Record<InventoryTxnType, readonly InventoryReason[]> = {
  IN: ["PURCHASE", "RETURN_IN", "OTHER_IN", "RENTAL_IN", "REPAIR_IN", "DEMO_IN", "CALIBRATION_IN"],
  OUT: ["SALE", "CONSUMABLE_OUT", "RENTAL_OUT", "REPAIR_OUT", "DEMO_OUT", "CALIBRATION_OUT"],
  TRANSFER: ["CALIBRATION", "REPAIR", "RENTAL", "DEMO"],
};

// Phase 1: legacy reason → 4축 (referenceModule, subKind) 파생 — single endpoint 호환용.
function deriveRefModule(reason: InventoryReason): string {
  switch (reason) {
    case "PURCHASE":
    case "SALE":
    case "RETURN_IN":
      return "TRADE";
    case "RENTAL_IN":
    case "RENTAL_OUT":
    case "RENTAL":
      return "RENTAL";
    case "REPAIR_IN":
    case "REPAIR_OUT":
    case "REPAIR":
      return "REPAIR";
    case "CALIBRATION_IN":
    case "CALIBRATION_OUT":
    case "CALIBRATION":
      return "CALIB";
    case "DEMO_IN":
    case "DEMO_OUT":
    case "DEMO":
      return "DEMO";
    case "CONSUMABLE_OUT":
      return "CONSUMABLE";
    default:
      return "TRADE";
  }
}
function deriveSubKind(reason: InventoryReason): string {
  switch (reason) {
    case "PURCHASE": return "PURCHASE";
    case "SALE": return "SALE";
    case "RETURN_IN": return "RETURN";
    case "RENTAL_IN": return "BORROW";
    case "REPAIR_IN":
    case "CALIBRATION_IN": return "REQUEST";
    case "DEMO_IN": return "BORROW";
    case "RENTAL_OUT":
    case "REPAIR_OUT":
    case "CALIBRATION_OUT":
    case "DEMO_OUT": return "RETURN";
    case "CONSUMABLE_OUT": return "CONSUMABLE";
    case "OTHER_IN": return "OTHER";
    default: return "OTHER";
  }
}

function parseIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const itemId = trimNonEmpty(url.searchParams.get("item"));
    const warehouseId = trimNonEmpty(url.searchParams.get("warehouse")); // from 또는 to 어디서든
    const txnType = optionalEnum(url.searchParams.get("type"), TXN_TYPES);
    const reason = optionalEnum(url.searchParams.get("reason"), REASONS);
    const fromDate = trimNonEmpty(url.searchParams.get("from"));
    const toDate = trimNonEmpty(url.searchParams.get("to"));

    const where = {
      ...companyScope(session),
      ...(itemId ? { itemId } : {}),
      ...(warehouseId
        ? { OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }] }
        : {}),
      ...(txnType ? { txnType } : {}),
      ...(reason ? { reason } : {}),
      ...(fromDate || toDate
        ? {
            performedAt: {
              ...(fromDate ? { gte: new Date(fromDate) } : {}),
              ...(toDate ? { lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { serialNumber: { contains: q, mode: "insensitive" as const } },
              { scannedBarcode: { contains: q, mode: "insensitive" as const } },
              { item: { itemCode: { contains: q, mode: "insensitive" as const } } },
              { item: { name: { contains: q, mode: "insensitive" as const } } },
              { targetEquipmentSN: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      orderBy: { performedAt: "desc" },
      take: 500,
      include: {
        item: { select: { id: true, itemCode: true, name: true } },
        fromWarehouse: { select: { id: true, code: true, name: true, warehouseType: true } },
        toWarehouse: { select: { id: true, code: true, name: true, warehouseType: true } },
        client: { select: { id: true, clientCode: true, companyNameVi: true } },
      },
    });
    return ok({ transactions });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const itemId = requireString(p.itemId, "itemId");
      const txnType = requireEnum(p.txnType, TXN_TYPES, "txnType");
      const reason = requireEnum(p.reason, REASONS, "reason");

      // 유형-사유 매핑 검증
      if (!REASON_BY_TYPE[txnType].includes(reason)) {
        return badRequest("invalid_input", { field: "reason", reason: `not_allowed_for_${txnType}` });
      }
      // A안: 매입/매출/매입반품은 매입·매출·Adjustment 모듈을 통해서만 생성. 직접 호출 차단.
      // X-Internal-Caller 헤더를 사용하면 우회(매입/매출 라우트가 직접 prisma 사용하므로 사실상 영향 없음).
      const MANUAL_FORBIDDEN: readonly InventoryReason[] = ["PURCHASE", "SALE", "RETURN_IN"];
      if (MANUAL_FORBIDDEN.includes(reason)) {
        return badRequest("invalid_input", { field: "reason", reason: "use_purchase_or_sales_module" });
      }

      const quantity = parseIntOrNull(p.quantity);
      if (!quantity) return badRequest("invalid_input", { field: "quantity" });

      const fromWarehouseId = trimNonEmpty(p.fromWarehouseId);
      const toWarehouseId = trimNonEmpty(p.toWarehouseId);
      const clientId = trimNonEmpty(p.clientId);
      const targetEquipmentSN = trimNonEmpty(p.targetEquipmentSN);
      const targetContractId = trimNonEmpty(p.targetContractId);

      // 유형별 창고 필수성 검증
      // IN: toWarehouse(자사 내부 또는 외부) 필수 + S/N 필수 (CONSUMABLE 만 예외)
      // OUT: fromWarehouse 필수 + S/N 필수 + InventoryItem 마스터 매칭 검증 (CONSUMABLE_OUT 예외)
      // TRANSFER: External(고객/외주처) ↔ External 패스스루. 양쪽 endpoint 모두 거래처. S/N 선택. 자사 창고 사용 금지.
      if (txnType === "IN" && !toWarehouseId) {
        return badRequest("invalid_input", { field: "toWarehouseId", reason: "required_for_IN" });
      }
      if (txnType === "OUT" && !fromWarehouseId) {
        return badRequest("invalid_input", { field: "fromWarehouseId", reason: "required_for_OUT" });
      }
      const sn = trimNonEmpty(p.serialNumber);
      // S/N 필수 (CONSUMABLE_OUT 예외 — 토너/소모품은 lot 단위 가능)
      if (txnType === "IN" && !sn) {
        return badRequest("invalid_input", { field: "serialNumber", reason: "required_for_IN" });
      }
      if (txnType === "OUT" && reason !== "CONSUMABLE_OUT" && !sn) {
        return badRequest("invalid_input", { field: "serialNumber", reason: "required_for_OUT" });
      }
      // TRANSFER (External ↔ External): 양쪽 모두 거래처여야 함. 자사 창고 지정 금지.
      const fromClientId = trimNonEmpty(p.fromClientId);
      const toClientId = trimNonEmpty(p.toClientId);
      if (txnType === "TRANSFER") {
        if (fromWarehouseId || toWarehouseId) {
          return badRequest("invalid_input", { field: "warehouse", reason: "transfer_must_be_external_only" });
        }
        if (!fromClientId || !toClientId) {
          return badRequest("invalid_input", { field: "transferEndpoints", reason: "external_clients_required" });
        }
      }
      // 소모품출고 시 대상장비 S/N 필수
      if (reason === "CONSUMABLE_OUT" && !targetEquipmentSN) {
        return badRequest("invalid_input", { field: "targetEquipmentSN", reason: "required_for_consumable" });
      }
      // 외부 자산 입고 (수리/데모/교정/렌탈입고) — 소유주 거래처 필수
      if (EXTERNAL_IN_REASONS.includes(reason)) {
        if (!clientId) return badRequest("invalid_input", { field: "clientId", reason: "owner_required_for_external_in" });
      }

      // 존재성 검증
      const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
      if (!item) return badRequest("invalid_item");

      if (fromWarehouseId) {
        const wh = await prisma.warehouse.findUnique({ where: { id: fromWarehouseId }, select: { id: true } });
        if (!wh) return badRequest("invalid_warehouse", { field: "fromWarehouseId" });
      }
      if (toWarehouseId) {
        const wh = await prisma.warehouse.findUnique({ where: { id: toWarehouseId }, select: { id: true } });
        if (!wh) return badRequest("invalid_warehouse", { field: "toWarehouseId" });
      }
      if (clientId) {
        const cl = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
        if (!cl) return badRequest("invalid_client");
      }
      // OUT 도 clientId 강제 (납품처).
      if (txnType === "OUT" && !clientId) {
        return badRequest("invalid_input", { field: "clientId", reason: "required_for_OUT" });
      }

      // OUT 일반 케이스: S/N 이 InventoryItem 마스터에 존재해야 출고 가능 (CONSUMABLE_OUT 예외)
      if (txnType === "OUT" && reason !== "CONSUMABLE_OUT" && sn) {
        const masterItem = await prisma.inventoryItem.findUnique({
          where: { serialNumber: sn },
          select: { id: true, warehouseId: true },
        });
        if (!masterItem) {
          return badRequest("invalid_input", { field: "serialNumber", reason: "sn_not_in_inventory" });
        }
        // 출고 창고와 마스터가 위치한 창고가 일치해야 함
        if (fromWarehouseId && masterItem.warehouseId !== fromWarehouseId) {
          return badRequest("invalid_input", { field: "serialNumber", reason: "sn_warehouse_mismatch" });
        }
      }

      // 정합성: targetEquipmentSN 이 활성 IT 계약 장비라면 targetContractId 자동매핑
      // (소모품/부품 비용을 IT 계약별로 집계하기 위함 — AS dispatch parts 와 동일 정책)
      let resolvedTargetContractId = targetContractId ?? null;
      if (!resolvedTargetContractId && targetEquipmentSN) {
        const eq = await prisma.itContractEquipment.findFirst({
          where: { serialNumber: targetEquipmentSN, removedAt: null },
          select: { itContractId: true },
        });
        if (eq) resolvedTargetContractId = eq.itContractId;
      }
      // TRANSFER 의 경우 clientId 컬럼에 fromClientId 를 사용하고, note 에 toClientId 표시
      // (DB 스키마는 단일 clientId 만 보유 — 향후 fromClientId/toClientId 컬럼 추가 가능)
      const txnClientId = txnType === "TRANSFER" ? fromClientId : clientId;
      const transferNote = txnType === "TRANSFER" && toClientId
        ? `${trimNonEmpty(p.note) ?? ""}${trimNonEmpty(p.note) ? " · " : ""}→ client:${toClientId}`
        : trimNonEmpty(p.note);

      const created = await prisma.$transaction(async (tx) => {
        // Phase 1 4축 분류 — body 에 referenceModule/subKind 가 있으면 그대로, 없으면 legacy reason 으로부터 파생
        const refModuleFromBody = trimNonEmpty(p.referenceModule);
        const subKindFromBody = trimNonEmpty(p.subKind);
        const refModuleDerived = refModuleFromBody ?? deriveRefModule(reason);
        const subKindDerived = subKindFromBody ?? deriveSubKind(reason);

        const txn = await tx.inventoryTransaction.create({
          data: {
            companyCode: session.companyCode,
            itemId,
            fromWarehouseId: fromWarehouseId ?? null,
            toWarehouseId: toWarehouseId ?? null,
            clientId: txnClientId ?? null,
            serialNumber: sn,
            txnType,
            reason,
            referenceModule: refModuleDerived,
            subKind: subKindDerived,
            quantity,
            scannedBarcode: trimNonEmpty(p.scannedBarcode),
            note: transferNote,
            targetEquipmentSN: targetEquipmentSN ?? null,
            targetContractId: resolvedTargetContractId,
            performedAt: new Date(),
          },
        });

        // S/N 단위 InventoryItem 마스터 자동 관리
        if (txnType === "IN" && toWarehouseId && sn) {
          // IN: 항상 마스터 등록 (외부/자사 구분은 ownerType 으로)
          const isExternalIn = EXTERNAL_IN_REASONS.includes(reason);
          await ensureInventoryItemOnReceipt(tx, {
            itemId,
            serialNumber: sn,
            warehouseId: toWarehouseId,
            companyCode: session.companyCode,
            ownerType: isExternalIn ? "EXTERNAL_CLIENT" : "COMPANY",
            ownerClientId: isExternalIn ? (clientId ?? null) : null,
            inboundReason: reason,
          });
        } else if (txnType === "OUT" && sn && reason !== "CONSUMABLE_OUT") {
          // OUT: 마스터는 보존하지만 outbound 표시를 위해 lastStatusChange 만 갱신.
          // 외부 자산 반환은 ownerType 검증.
          if (EXTERNAL_OUT_REASONS.includes(reason)) {
            const owned = await tx.inventoryItem.findUnique({
              where: { serialNumber: sn },
              select: { ownerType: true },
            });
            if (owned && owned.ownerType !== "EXTERNAL_CLIENT") {
              throw new Error("not_external_owned");
            }
          }
        }
        // TRANSFER (External ↔ External 패스스루): InventoryItem 마스터 변경 없음.
        // 우리는 거래의 양 끝점이 모두 외부이므로 자사 재고에 영향이 없음.
        return txn;
      });

      return ok({ transaction: created }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      return serverError(err);
    }
  });
}
