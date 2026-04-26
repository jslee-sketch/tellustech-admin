import "server-only";
import type {
  AdjustmentItemAction,
  AdjustmentType,
  CompanyCode,
} from "@/generated/prisma/client";
import type { TxClient } from "./prisma";
import { generateDatedCode } from "./code-generator";
import { ensureInventoryItemOnReceipt } from "./inventory-receipt";
import { prisma } from "./prisma";

// 사후조정 헬퍼 — 매출/매입 발생 후의 반품·교환·금액조정.
// 핵심 정책:
//  1) 모든 매입/매출은 S/N 단위. items 행 1개 = 1 S/N → InventoryTransaction.quantity 는 항상 1.
//  2) 가격 변경(PRICE_ADJUST)은 회계 PR/sales/purchase totalAmount 만 영향, 재고 무영향.
//  3) RETURN: 매출은 IN/RETURN_IN 으로 재고 복귀, 매입은 OUT/OTHER 로 출고.
//  4) EXCHANGE_OUT(매출 신규 출고) / EXCHANGE_IN(매입 신규 입고).
//  5) 모든 처리는 한 트랜잭션 내부.

export type SalesAdjustmentItemInput = {
  action: AdjustmentItemAction;
  serialNumber: string;
  itemId: string;
  originalSalesItemId?: string | null;
  unitPrice: string; // Decimal(15,2) — 양수 그대로 저장
};

export type CreateSalesAdjustmentParams = {
  companyCode: CompanyCode;
  originalSalesId: string;
  type: AdjustmentType;
  reason?: string | null;
  reasonVi?: string | null;
  reasonEn?: string | null;
  reasonKo?: string | null;
  warehouseId?: string | null;
  performedById: string;
  // PRICE_ADJUST 의 경우 items 비우고 priceDelta 만 사용 (양수=가산, 음수=차감)
  priceDelta?: string | null;
  items: SalesAdjustmentItemInput[];
};

export type PurchaseAdjustmentItemInput = SalesAdjustmentItemInput & {
  originalPurchaseItemId?: string | null;
};

export type CreatePurchaseAdjustmentParams = {
  companyCode: CompanyCode;
  originalPurchaseId: string;
  type: AdjustmentType;
  reason?: string | null;
  reasonVi?: string | null;
  reasonEn?: string | null;
  reasonKo?: string | null;
  warehouseId?: string | null;
  performedById: string;
  priceDelta?: string | null;
  items: PurchaseAdjustmentItemInput[];
};

function toFixed2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

async function nextAdjustCode(
  prefix: string,
  lookup: (full: string) => Promise<string | null>,
): Promise<string> {
  return generateDatedCode({ prefix, lookupLast: lookup });
}

/** 매출 사후조정 — RETURN / EXCHANGE_FULL · PARTIAL / PRICE_ADJUST */
export async function createSalesAdjustment(
  tx: TxClient,
  params: CreateSalesAdjustmentParams,
): Promise<{ id: string; adjustCode: string }> {
  const sales = await tx.sales.findUnique({
    where: { id: params.originalSalesId },
    select: { id: true, clientId: true, fxRate: true, salesNumber: true, warehouseId: true },
  });
  if (!sales) throw new Error("original_sales_not_found");

  // 회계 영향 계산
  let refundAmount = 0;
  let newAmount = 0;
  for (const it of params.items) {
    const price = Number(it.unitPrice);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`invalid_unit_price:${it.serialNumber}`);
    }
    if (it.action === "RETURN") refundAmount += price;
    else if (it.action === "EXCHANGE_OUT") newAmount += price;
  }
  // PRICE_ADJUST 만 별도 처리 — items 가 비어있고 priceDelta 가 있다면 그것이 곧 net
  if (params.type === "PRICE_ADJUST" && params.priceDelta) {
    const delta = Number(params.priceDelta);
    if (!Number.isFinite(delta)) throw new Error("invalid_price_delta");
    if (delta >= 0) newAmount = delta;
    else refundAmount = -delta;
  }
  const netAmount = newAmount - refundAmount;

  const adjustCode = await nextAdjustCode("ADJ-S", async (full) => {
    const last = await tx.salesAdjustment.findFirst({
      where: { adjustCode: { startsWith: full } },
      orderBy: { adjustCode: "desc" },
      select: { adjustCode: true },
    });
    return last?.adjustCode ?? null;
  });

  const adjustment = await tx.salesAdjustment.create({
    data: {
      adjustCode,
      companyCode: params.companyCode,
      originalSalesId: sales.id,
      type: params.type,
      reason: params.reason ?? null,
      reasonVi: params.reasonVi ?? null,
      reasonEn: params.reasonEn ?? null,
      reasonKo: params.reasonKo ?? null,
      warehouseId: params.warehouseId ?? null,
      performedById: params.performedById,
      refundAmount: toFixed2(refundAmount),
      newAmount: toFixed2(newAmount),
      netAmount: toFixed2(netAmount),
    },
  });

  // 라인 저장
  if (params.items.length > 0) {
    await tx.salesAdjustmentItem.createMany({
      data: params.items.map((it) => ({
        adjustmentId: adjustment.id,
        action: it.action,
        serialNumber: it.serialNumber,
        itemId: it.itemId,
        originalSalesItemId: it.originalSalesItemId ?? null,
        unitPrice: toFixed2(Number(it.unitPrice)),
      })),
    });
  }

  // 재고 트랜잭션 — PRICE_ADJUST 는 무영향
  if (params.type !== "PRICE_ADJUST" && params.warehouseId) {
    for (const it of params.items) {
      // S/N 검증 — RETURN 은 이미 OUT 된 S/N 이어야 자연스러우나, 외부 구매처 혼합 가능 → 경고만 (LOOSE)
      if (it.action === "RETURN") {
        // 매출 반품 → 자사 창고로 IN
        await tx.inventoryTransaction.create({
          data: {
            companyCode: params.companyCode,
            itemId: it.itemId,
            fromWarehouseId: null,
            toWarehouseId: params.warehouseId,
            clientId: sales.clientId,
            serialNumber: it.serialNumber,
            txnType: "IN",
            reason: "RETURN_IN",
            quantity: 1,
            note: `[자동] 매출조정 ${adjustCode} (RETURN ${sales.salesNumber})`,
            performedById: params.performedById,
          },
        });
        await ensureInventoryItemOnReceipt(tx, {
          itemId: it.itemId,
          serialNumber: it.serialNumber,
          warehouseId: params.warehouseId,
          companyCode: params.companyCode,
        });
      } else if (it.action === "EXCHANGE_OUT") {
        // 새 출고 — 이중 출고 차단(LOOSE 정책 — 외부 S/N 혼용 가능, 경고만)
        const lastTxn = await tx.inventoryTransaction.findFirst({
          where: { serialNumber: it.serialNumber },
          orderBy: { performedAt: "desc" },
          select: { txnType: true },
        });
        if (lastTxn?.txnType === "OUT") {
          // 경고: 이미 OUT 된 S/N 재출고 — 진행 (LOOSE)
        }
        await tx.inventoryTransaction.create({
          data: {
            companyCode: params.companyCode,
            itemId: it.itemId,
            fromWarehouseId: params.warehouseId,
            toWarehouseId: null,
            clientId: sales.clientId,
            serialNumber: it.serialNumber,
            txnType: "OUT",
            reason: "SALE",
            quantity: 1,
            note: `[자동] 매출조정 ${adjustCode} (EXCHANGE_OUT ${sales.salesNumber})`,
            performedById: params.performedById,
          },
        });
      }
    }
  }

  // PR netAmount 가감 — 매출의 PayableReceivable 1건의 amount 에 반영 (있으면)
  if (netAmount !== 0) {
    const pr = await tx.payableReceivable.findFirst({
      where: { salesId: sales.id, kind: "RECEIVABLE" },
      orderBy: { createdAt: "asc" },
    });
    if (pr) {
      const newAmt = Number(pr.amount) + netAmount * Number(sales.fxRate ?? 1);
      await tx.payableReceivable.update({
        where: { id: pr.id },
        data: { amount: toFixed2(newAmt) },
      });
    }
    // sales.totalAmount 도 동기화
    const newTotal = await tx.salesItem.aggregate({
      where: { salesId: sales.id },
      _sum: { amount: true },
    });
    const baseTotal = Number(newTotal._sum.amount ?? 0);
    // 모든 조정의 net 합산
    const adjAgg = await tx.salesAdjustment.aggregate({
      where: { originalSalesId: sales.id },
      _sum: { netAmount: true },
    });
    const adjustedTotal = baseTotal + Number(adjAgg._sum.netAmount ?? 0);
    await tx.sales.update({
      where: { id: sales.id },
      data: { totalAmount: toFixed2(adjustedTotal) },
    });
  }

  return { id: adjustment.id, adjustCode };
}

/** 매입 사후조정 — 방향만 매출과 반대 */
export async function createPurchaseAdjustment(
  tx: TxClient,
  params: CreatePurchaseAdjustmentParams,
): Promise<{ id: string; adjustCode: string }> {
  const purchase = await tx.purchase.findUnique({
    where: { id: params.originalPurchaseId },
    select: { id: true, supplierId: true, fxRate: true, purchaseNumber: true },
  });
  if (!purchase) throw new Error("original_purchase_not_found");

  let refundAmount = 0;
  let newAmount = 0;
  for (const it of params.items) {
    const price = Number(it.unitPrice);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`invalid_unit_price:${it.serialNumber}`);
    }
    if (it.action === "RETURN") refundAmount += price;
    else if (it.action === "EXCHANGE_IN") newAmount += price;
  }
  if (params.type === "PRICE_ADJUST" && params.priceDelta) {
    const delta = Number(params.priceDelta);
    if (!Number.isFinite(delta)) throw new Error("invalid_price_delta");
    if (delta >= 0) newAmount = delta;
    else refundAmount = -delta;
  }
  const netAmount = newAmount - refundAmount;

  const adjustCode = await nextAdjustCode("ADJ-P", async (full) => {
    const last = await tx.purchaseAdjustment.findFirst({
      where: { adjustCode: { startsWith: full } },
      orderBy: { adjustCode: "desc" },
      select: { adjustCode: true },
    });
    return last?.adjustCode ?? null;
  });

  const adjustment = await tx.purchaseAdjustment.create({
    data: {
      adjustCode,
      companyCode: params.companyCode,
      originalPurchaseId: purchase.id,
      type: params.type,
      reason: params.reason ?? null,
      reasonVi: params.reasonVi ?? null,
      reasonEn: params.reasonEn ?? null,
      reasonKo: params.reasonKo ?? null,
      warehouseId: params.warehouseId ?? null,
      performedById: params.performedById,
      refundAmount: toFixed2(refundAmount),
      newAmount: toFixed2(newAmount),
      netAmount: toFixed2(netAmount),
    },
  });

  if (params.items.length > 0) {
    await tx.purchaseAdjustmentItem.createMany({
      data: params.items.map((it) => ({
        adjustmentId: adjustment.id,
        action: it.action,
        serialNumber: it.serialNumber,
        itemId: it.itemId,
        originalPurchaseItemId: it.originalPurchaseItemId ?? null,
        unitPrice: toFixed2(Number(it.unitPrice)),
      })),
    });
  }

  if (params.type !== "PRICE_ADJUST" && params.warehouseId) {
    for (const it of params.items) {
      if (it.action === "RETURN") {
        // 매입 반품 → 자사 창고에서 OUT (외부 supplier 로 회수)
        await tx.inventoryTransaction.create({
          data: {
            companyCode: params.companyCode,
            itemId: it.itemId,
            fromWarehouseId: params.warehouseId,
            toWarehouseId: null,
            clientId: purchase.supplierId,
            serialNumber: it.serialNumber,
            txnType: "OUT",
            reason: "SALE", // 사유 enum 에 PURCHASE_RETURN 없음 — 가장 가까운 SALE 로 표시 + note 로 구분
            quantity: 1,
            note: `[자동] 매입조정 ${adjustCode} (RETURN ${purchase.purchaseNumber})`,
            performedById: params.performedById,
          },
        });
      } else if (it.action === "EXCHANGE_IN") {
        // 새 입고 (교환 받은 신품)
        await tx.inventoryTransaction.create({
          data: {
            companyCode: params.companyCode,
            itemId: it.itemId,
            fromWarehouseId: null,
            toWarehouseId: params.warehouseId,
            clientId: purchase.supplierId,
            serialNumber: it.serialNumber,
            txnType: "IN",
            reason: "PURCHASE",
            quantity: 1,
            note: `[자동] 매입조정 ${adjustCode} (EXCHANGE_IN ${purchase.purchaseNumber})`,
            performedById: params.performedById,
          },
        });
        await ensureInventoryItemOnReceipt(tx, {
          itemId: it.itemId,
          serialNumber: it.serialNumber,
          warehouseId: params.warehouseId,
          companyCode: params.companyCode,
        });
      }
    }
  }

  if (netAmount !== 0) {
    const pr = await tx.payableReceivable.findFirst({
      where: { purchaseId: purchase.id, kind: "PAYABLE" },
      orderBy: { createdAt: "asc" },
    });
    if (pr) {
      const newAmt = Number(pr.amount) + netAmount * Number(purchase.fxRate ?? 1);
      await tx.payableReceivable.update({
        where: { id: pr.id },
        data: { amount: toFixed2(newAmt) },
      });
    }
    const newTotal = await tx.purchaseItem.aggregate({
      where: { purchaseId: purchase.id },
      _sum: { amount: true },
    });
    const baseTotal = Number(newTotal._sum.amount ?? 0);
    const adjAgg = await tx.purchaseAdjustment.aggregate({
      where: { originalPurchaseId: purchase.id },
      _sum: { netAmount: true },
    });
    const adjustedTotal = baseTotal + Number(adjAgg._sum.netAmount ?? 0);
    await tx.purchase.update({
      where: { id: purchase.id },
      data: { totalAmount: toFixed2(adjustedTotal) },
    });
  }

  return { id: adjustment.id, adjustCode };
}

/** 외부에서 트랜잭션 없이 호출하는 thin wrapper. 내부에서 prisma.$transaction. */
export async function runSalesAdjustment(
  params: CreateSalesAdjustmentParams,
): Promise<{ id: string; adjustCode: string }> {
  return prisma.$transaction((tx) => createSalesAdjustment(tx, params));
}

export async function runPurchaseAdjustment(
  params: CreatePurchaseAdjustmentParams,
): Promise<{ id: string; adjustCode: string }> {
  return prisma.$transaction((tx) => createPurchaseAdjustment(tx, params));
}
