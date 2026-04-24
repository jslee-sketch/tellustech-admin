import "server-only";
import { prisma } from "./prisma";
import type { CompanyCode } from "@/generated/prisma/client";

// S/N 재고확인 — STRICT/LOOSE 모드.
// STRICT (IT 렌탈 등): 자사 재고에 해당 S/N 이 현재 입고/이동완료 상태여야 함.
// LOOSE: 경고만 반환 (never throws).
//
// 새 구조 판정:
//   최신 트랜잭션이 OUT 이면 재고 없음.
//   최신 트랜잭션이 IN/TRANSFER 이고 toWarehouseId 가 있으면 그 창고에 있음.

export type StockCheckResult = {
  found: boolean;
  warehouseCode: string | null;
};

export async function checkSerialInStock(
  companyCode: CompanyCode,
  serialNumber: string,
): Promise<StockCheckResult> {
  const last = await prisma.inventoryTransaction.findFirst({
    where: { companyCode, serialNumber },
    orderBy: { performedAt: "desc" },
    include: { toWarehouse: { select: { code: true } } },
  });
  if (!last || last.txnType === "OUT" || !last.toWarehouseId) {
    return { found: false, warehouseCode: null };
  }
  return { found: true, warehouseCode: last.toWarehouse?.code ?? null };
}

export class StockCheckError extends Error {
  constructor(public serialNumber: string) {
    super(`serial_not_in_stock:${serialNumber}`);
  }
}

export async function requireStrictStock(
  companyCode: CompanyCode,
  serialNumber: string,
): Promise<void> {
  const r = await checkSerialInStock(companyCode, serialNumber);
  if (!r.found) throw new StockCheckError(serialNumber);
}
