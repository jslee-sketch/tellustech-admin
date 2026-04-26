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
  "SALE", "CONSUMABLE_OUT",
  "CALIBRATION", "REPAIR", "RENTAL", "DEMO",
] as const;

// 유형-사유 매핑 (잘못된 조합 차단)
const REASON_BY_TYPE: Record<InventoryTxnType, readonly InventoryReason[]> = {
  IN: ["PURCHASE", "RETURN_IN", "OTHER_IN"],
  OUT: ["SALE", "CONSUMABLE_OUT"],
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
            // S/N 입고 — 없으면 생성(QR 자동발급), 있으면 창고만 변경
            await ensureInventoryItemOnReceipt(tx, {
              itemId,
              serialNumber: sn,
              warehouseId: toWarehouseId,
              companyCode: session.companyCode,
            });
          } else if (txnType === "TRANSFER" && toWarehouseId) {
            await tx.inventoryItem.update({
              where: { serialNumber: sn },
              data: { warehouseId: toWarehouseId },
            }).catch(() => undefined);
          }
          // OUT 시엔 InventoryItem 마스터를 유지하되 (외부로 나간 후 추적 가능)
          // 단순화를 위해 상태 변경은 별도 API로
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
