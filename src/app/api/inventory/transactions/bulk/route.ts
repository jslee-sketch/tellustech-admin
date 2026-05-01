import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest, handleFieldError, ok, requireEnum, serverError, trimNonEmpty,
} from "@/lib/api-utils";
import { ensureInventoryItemOnReceipt } from "@/lib/inventory-receipt";
import type { InventoryReason, InventoryTxnType } from "@/generated/prisma/client";

// Bulk 입출고 — 헤더(유형/사유/창고·거래처) 공유 + N 개 라인을 단일 트랜잭션으로 등록.
// 정책 (단건 POST 와 동일):
//   IN  → toWarehouseId 필수, 라인별 S/N 필수, 마스터 자동 생성
//   OUT → fromWarehouseId + clientId 필수, 라인별 S/N 필수 (CONSUMABLE_OUT 예외) +
//         InventoryItem 마스터에 존재 + 마스터의 warehouseId 가 fromWarehouseId 와 일치
//   TRANSFER → fromClientId + toClientId 필수, 자사 창고 사용 금지, S/N 선택, 마스터 변경 없음
// Body:
//   { txnType, reason, fromWarehouseId?, toWarehouseId?, clientId?, fromClientId?, toClientId?, note?,
//     items: [{ itemId, serialNumber?, quantity?, targetEquipmentSN?, targetContractId?, note? }, ...] }

const TXN_TYPES: readonly InventoryTxnType[] = ["IN", "OUT", "TRANSFER"] as const;
const REASONS: readonly InventoryReason[] = [
  "PURCHASE", "RETURN_IN", "OTHER_IN",
  "RENTAL_IN", "REPAIR_IN", "DEMO_IN", "CALIBRATION_IN",
  "SALE", "CONSUMABLE_OUT",
  "RENTAL_OUT", "REPAIR_OUT", "DEMO_OUT", "CALIBRATION_OUT",
  "CALIBRATION", "REPAIR", "RENTAL", "DEMO",
] as const;

const EXTERNAL_IN_REASONS: readonly InventoryReason[] = [
  "RENTAL_IN", "REPAIR_IN", "DEMO_IN", "CALIBRATION_IN",
] as const;
const EXTERNAL_OUT_REASONS: readonly InventoryReason[] = [
  "RENTAL_OUT", "REPAIR_OUT", "DEMO_OUT", "CALIBRATION_OUT",
] as const;

const REASON_BY_TYPE: Record<InventoryTxnType, readonly InventoryReason[]> = {
  IN: ["PURCHASE", "RETURN_IN", "OTHER_IN", "RENTAL_IN", "REPAIR_IN", "DEMO_IN", "CALIBRATION_IN"],
  OUT: ["SALE", "CONSUMABLE_OUT", "RENTAL_OUT", "REPAIR_OUT", "DEMO_OUT", "CALIBRATION_OUT"],
  TRANSFER: ["CALIBRATION", "REPAIR", "RENTAL", "DEMO"],
};

const MANUAL_FORBIDDEN: readonly InventoryReason[] = ["PURCHASE", "SALE", "RETURN_IN"];

const MAX_LINES = 1000; // 안전 가드 — 단일 요청 라인 수 상한

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
      const txnType = requireEnum(p.txnType, TXN_TYPES, "txnType");
      const reason = requireEnum(p.reason, REASONS, "reason");
      if (!REASON_BY_TYPE[txnType].includes(reason)) {
        return badRequest("invalid_input", { field: "reason", reason: `not_allowed_for_${txnType}` });
      }
      if (MANUAL_FORBIDDEN.includes(reason)) {
        return badRequest("invalid_input", { field: "reason", reason: "use_purchase_or_sales_module" });
      }

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
      if (EXTERNAL_IN_REASONS.includes(reason) && !clientId) {
        return badRequest("invalid_input", { field: "clientId", reason: "owner_required_for_external_in" });
      }

      // 창고 / 거래처 존재성 검증
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
        // S/N 필수성 — IN 항상, OUT 일반 (CONSUMABLE_OUT 예외)
        if (txnType === "IN" && !sn) {
          return badRequest("invalid_input", { field: `items[${i}].serialNumber`, reason: "required_for_IN" });
        }
        if (txnType === "OUT" && reason !== "CONSUMABLE_OUT" && !sn) {
          return badRequest("invalid_input", { field: `items[${i}].serialNumber`, reason: "required_for_OUT" });
        }
        // 소모품 출고 시 대상장비 S/N 필수
        const targetEquipmentSN = trimNonEmpty(r.targetEquipmentSN);
        if (reason === "CONSUMABLE_OUT" && !targetEquipmentSN) {
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

      // OUT 검증 — InventoryItem 마스터 존재 + 창고 일치 (CONSUMABLE_OUT 예외)
      if (txnType === "OUT" && reason !== "CONSUMABLE_OUT") {
        const masters = await prisma.inventoryItem.findMany({
          where: { serialNumber: { in: sns } },
          select: { serialNumber: true, warehouseId: true },
        });
        const byMasterSn = new Map(masters.map((m) => [m.serialNumber, m]));
        for (let i = 0; i < lines.length; i++) {
          const sn = lines[i].serialNumber;
          if (!sn) continue;
          const m = byMasterSn.get(sn);
          if (!m) return badRequest("invalid_input", { field: `items[${i}].serialNumber`, reason: "sn_not_in_inventory" });
          if (fromWarehouseId && m.warehouseId !== fromWarehouseId) {
            return badRequest("invalid_input", { field: `items[${i}].serialNumber`, reason: "sn_warehouse_mismatch" });
          }
        }
      }

      // 외부 자산 반환 검증 — ownerType=EXTERNAL_CLIENT
      if (EXTERNAL_OUT_REASONS.includes(reason)) {
        const masters = await prisma.inventoryItem.findMany({
          where: { serialNumber: { in: sns } },
          select: { serialNumber: true, ownerType: true },
        });
        for (const m of masters) {
          if (m.ownerType !== "EXTERNAL_CLIENT") {
            return badRequest("invalid_input", { field: "items", reason: "not_external_owned", sn: m.serialNumber });
          }
        }
      }

      // targetContractId 자동 매핑 (CONSUMABLE_OUT)
      const targetSns = Array.from(new Set(lines.map((l) => l.targetEquipmentSN).filter((s): s is string => !!s)));
      const eqMap = new Map<string, string>();
      if (targetSns.length > 0) {
        const eqs = await prisma.itContractEquipment.findMany({
          where: { serialNumber: { in: targetSns }, removedAt: null },
          select: { serialNumber: true, itContractId: true },
        });
        for (const eq of eqs) eqMap.set(eq.serialNumber, eq.itContractId);
      }

      // TRANSFER: 단일 clientId 컬럼에 from 사용, note 에 → toClientId 표시
      const txnSharedClientId = txnType === "TRANSFER" ? fromClientId : clientId;
      const transferTail = txnType === "TRANSFER" && toClientId ? ` → client:${toClientId}` : "";

      const created = await prisma.$transaction(async (tx) => {
        const txns = [];
        for (const line of lines) {
          const lineNoteFinal = [headerNote, line.note, transferTail].filter(Boolean).join(" · ");
          const resolvedTargetContractId = line.targetContractId
            ?? (line.targetEquipmentSN ? eqMap.get(line.targetEquipmentSN) ?? null : null);
          const txn = await tx.inventoryTransaction.create({
            data: {
              companyCode: session.companyCode,
              itemId: line.itemId,
              fromWarehouseId: fromWarehouseId ?? null,
              toWarehouseId: toWarehouseId ?? null,
              clientId: txnSharedClientId ?? null,
              serialNumber: line.serialNumber,
              txnType,
              reason,
              quantity: line.quantity,
              scannedBarcode: line.scannedBarcode,
              note: lineNoteFinal || null,
              targetEquipmentSN: line.targetEquipmentSN,
              targetContractId: resolvedTargetContractId,
              performedById: session.sub,
              performedAt: new Date(),
            },
          });
          if (txnType === "IN" && toWarehouseId && line.serialNumber) {
            const isExternalIn = EXTERNAL_IN_REASONS.includes(reason);
            await ensureInventoryItemOnReceipt(tx, {
              itemId: line.itemId,
              serialNumber: line.serialNumber,
              warehouseId: toWarehouseId,
              companyCode: session.companyCode,
              ownerType: isExternalIn ? "EXTERNAL_CLIENT" : "COMPANY",
              ownerClientId: isExternalIn ? (clientId ?? null) : null,
              inboundReason: reason,
            });
          }
          txns.push(txn);
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
