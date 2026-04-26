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
      if (txnType === "TRANSFER" && (!fromWarehouseId || !toWarehouseId)) {
        return badRequest("invalid_input", { field: "warehouses", reason: "both_required_for_TRANSFER" });
      }
      // 소모품출고 시 대상장비 S/N 필수
      if (reason === "CONSUMABLE_OUT" && !targetEquipmentSN) {
        return badRequest("invalid_input", { field: "targetEquipmentSN", reason: "required_for_consumable" });
      }

      // 존재성 검증
      const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
      if (!item) return badRequest("invalid_item");

      let fromIsExternal = false;
      let toIsExternal = false;
      if (fromWarehouseId) {
        const wh = await prisma.warehouse.findUnique({ where: { id: fromWarehouseId }, select: { id: true, warehouseType: true } });
        if (!wh) return badRequest("invalid_warehouse", { field: "fromWarehouseId" });
        fromIsExternal = wh.warehouseType === "EXTERNAL";
      }
      if (toWarehouseId) {
        const wh = await prisma.warehouse.findUnique({ where: { id: toWarehouseId }, select: { id: true, warehouseType: true } });
        if (!wh) return badRequest("invalid_warehouse", { field: "toWarehouseId" });
        toIsExternal = wh.warehouseType === "EXTERNAL";
      }
      if (clientId) {
        const cl = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
        if (!cl) return badRequest("invalid_client");
      }
      // EXTERNAL 창고 관여 시 client 필수 — "이 외부 창고가 누구의 보관처인지" 추적
      if ((fromIsExternal || toIsExternal) && !clientId) {
        return badRequest("invalid_input", { field: "clientId", reason: "required_for_external_warehouse" });
      }

      const sn = trimNonEmpty(p.serialNumber);
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
            targetContractId: targetContractId ?? null,
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
