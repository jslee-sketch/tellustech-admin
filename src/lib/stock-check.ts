import "server-only";
import { prisma } from "./prisma";
import type { CompanyCode } from "@/generated/prisma/client";

// S/N 재고확인 — STRICT/LOOSE 모드.
// STRICT (IT 렌탈 등): 자사 재고에 해당 S/N 이 현재 "IN" 상태여야 함. 없으면 throw.
// LOOSE: 경고만 반환 (never throws).
//
// 현재 상태 판정:
//   해당 S/N 에 대한 session 회사의 최신 트랜잭션이 IN 이면 재고 있음, OUT 이면 없음, 이력 없으면 없음.

export type StockCheckResult = {
  found: boolean; // 재고에 존재
  warehouseCode: string | null;
};

export async function checkSerialInStock(
  companyCode: CompanyCode,
  serialNumber: string,
): Promise<StockCheckResult> {
  const last = await prisma.inventoryTransaction.findFirst({
    where: { companyCode, serialNumber },
    orderBy: { performedAt: "desc" },
    include: { warehouse: { select: { code: true } } },
  });
  if (!last || last.txnType !== "IN") {
    return { found: false, warehouseCode: null };
  }
  return { found: true, warehouseCode: last.warehouse.code };
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
