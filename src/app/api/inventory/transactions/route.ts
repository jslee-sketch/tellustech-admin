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
      if (txnType === "IN" && !toWarehouseId) {
        return badRequest("invalid_input", { field: "toWarehouseId", reason: "required_for_IN" });
      }
      if (txnType === "OUT" && !fromWarehouseId) {
        return badRequest("invalid_input", { field: "fromWarehouseId", reason: "required_for_OUT" });
      }
      // TRANSFER: 출발/도착 각각 warehouseId 또는 clientId 중 하나 필수.
      // EXTERNAL 측은 거래처가 곧 출발/도착지이므로 warehouseId 가 null 이고 clientId 가 있어야 함.
      const clientIdForGuard = trimNonEmpty(p.clientId);
      if (txnType === "TRANSFER") {
        const fromOk = !!fromWarehouseId || !!clientIdForGuard;
        const toOk   = !!toWarehouseId   || !!clientIdForGuard;
        if (!fromOk || !toOk) {
          return badRequest("invalid_input", { field: "transferEndpoints", reason: "from_and_to_required" });
        }
      }
      // 소모품출고 시 대상장비 S/N 필수
      if (reason === "CONSUMABLE_OUT" && !targetEquipmentSN) {
        return badRequest("invalid_input", { field: "targetEquipmentSN", reason: "required_for_consumable" });
      }
      // 외부 자산 입고 (수리/데모/교정/렌탈입고) — 소유주 거래처 필수, S/N 필수
      if (EXTERNAL_IN_REASONS.includes(reason)) {
        if (!clientId) return badRequest("invalid_input", { field: "clientId", reason: "owner_required_for_external_in" });
        if (!trimNonEmpty(p.serialNumber)) return badRequest("invalid_input", { field: "serialNumber", reason: "required_for_external_in" });
      }
      // 외부 자산 반환 (수리/데모/교정/렌탈반출) — S/N 필수, 마스터에서 ownerType 검증은 후속 처리
      if (EXTERNAL_OUT_REASONS.includes(reason)) {
        if (!trimNonEmpty(p.serialNumber)) return badRequest("invalid_input", { field: "serialNumber", reason: "required_for_external_out" });
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
      // TRANSFER 의 한쪽이 창고 없이 거래처만 있다면 EXTERNAL 측 — clientId 강제됨 (위 가드).
      // OUT 도 clientId 강제 (납품처).
      if (txnType === "OUT" && !clientId) {
        return badRequest("invalid_input", { field: "clientId", reason: "required_for_OUT" });
      }

      const sn = trimNonEmpty(p.serialNumber);
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
      const created = await prisma.$transaction(async (tx) => {
        const txn = await tx.inventoryTransaction.create({
          data: {
            companyCode: session.companyCode,
            itemId,
            fromWarehouseId: fromWarehouseId ?? null,
            toWarehouseId: toWarehouseId ?? null,
            clientId: clientId ?? null,
            serialNumber: sn,
            txnType,
            reason,
            quantity,
            scannedBarcode: trimNonEmpty(p.scannedBarcode),
            note: trimNonEmpty(p.note),
            targetEquipmentSN: targetEquipmentSN ?? null,
            targetContractId: resolvedTargetContractId,
            performedAt: new Date(),
          },
        });

        // S/N 단위 InventoryItem 마스터 자동 관리
        if (sn) {
          if (txnType === "IN" && toWarehouseId) {
            // 외부 자산 입고는 ownerType=EXTERNAL_CLIENT, ownerClientId 로 출처 추적
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
          } else if (txnType === "TRANSFER" && toWarehouseId) {
            await tx.inventoryItem.update({
              where: { serialNumber: sn },
              data: { warehouseId: toWarehouseId },
            }).catch(() => undefined);
          } else if (txnType === "OUT" && EXTERNAL_OUT_REASONS.includes(reason)) {
            // 외부 자산 반환 — InventoryItem 에서 ownership 정리. 마스터는 보존(이력) 또는 archive.
            // 단순화: ownerType 을 그대로 두되 warehouseId 을 EXTERNAL 창고로 옮기지 않고 유지.
            // 실제 출고 흐름은 별도 회수 모듈에서 정밀 처리. 여기서는 검증만.
            const owned = await tx.inventoryItem.findUnique({
              where: { serialNumber: sn },
              select: { ownerType: true },
            });
            if (owned && owned.ownerType !== "EXTERNAL_CLIENT") {
              throw new Error("not_external_owned");
            }
          }
          // 일반 OUT (SALE, CONSUMABLE_OUT) 은 InventoryItem 마스터를 유지
        }
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
