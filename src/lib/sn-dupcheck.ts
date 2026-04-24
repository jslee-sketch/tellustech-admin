import "server-only";
import { prisma } from "./prisma";

// S/N 중복 검증 유틸.
// 같은 S/N 이 여러 활성 계약/라인에 중복되는 것을 감지.
// - 활성 IT 계약 장비 (removedAt null)
// - 종료일이 지나지 않은 TM 렌탈 라인
// - 최근 매출/매입 라인 (미지급/미수 미완료)
// 기존 레코드(exceptId) 는 제외.

export type DuplicateHit = {
  source: "IT" | "TM" | "SALES" | "PURCHASE";
  ref: string; // 계약번호 또는 전표번호
  detail?: string;
};

export async function findSerialDuplicates(
  serialNumber: string,
  opts: {
    excludeItContractEquipmentId?: string;
    excludeTmRentalItemId?: string;
    excludeSalesItemId?: string;
    excludePurchaseItemId?: string;
  } = {},
): Promise<DuplicateHit[]> {
  const sn = serialNumber.trim();
  if (!sn) return [];
  const now = new Date();
  const hits: DuplicateHit[] = [];

  // 활성 IT 계약 장비
  const itRows = await prisma.itContractEquipment.findMany({
    where: {
      serialNumber: sn,
      removedAt: null,
      ...(opts.excludeItContractEquipmentId ? { id: { not: opts.excludeItContractEquipmentId } } : {}),
    },
    include: { itContract: { select: { contractNumber: true, status: true } } },
  });
  for (const r of itRows) {
    if (r.itContract.status === "ACTIVE" || r.itContract.status === "DRAFT") {
      hits.push({ source: "IT", ref: r.itContract.contractNumber });
    }
  }

  // 진행 중 TM 렌탈 라인
  const tmRows = await prisma.tmRentalItem.findMany({
    where: {
      serialNumber: sn,
      endDate: { gte: now },
      ...(opts.excludeTmRentalItemId ? { id: { not: opts.excludeTmRentalItemId } } : {}),
    },
    include: { tmRental: { select: { rentalCode: true } } },
  });
  for (const r of tmRows) {
    hits.push({ source: "TM", ref: r.tmRental.rentalCode });
  }

  // 매출 라인 — 최근 미지급 제외 (엄격 중복은 관리자가 override)
  const salesRows = await prisma.salesItem.findMany({
    where: {
      serialNumber: sn,
      ...(opts.excludeSalesItemId ? { id: { not: opts.excludeSalesItemId } } : {}),
    },
    include: { sales: { select: { salesNumber: true } } },
    take: 5,
  });
  for (const r of salesRows) {
    hits.push({ source: "SALES", ref: r.sales.salesNumber });
  }

  // 매입 라인
  const purRows = await prisma.purchaseItem.findMany({
    where: {
      serialNumber: sn,
      ...(opts.excludePurchaseItemId ? { id: { not: opts.excludePurchaseItemId } } : {}),
    },
    include: { purchase: { select: { purchaseNumber: true } } },
    take: 5,
  });
  for (const r of purRows) {
    hits.push({ source: "PURCHASE", ref: r.purchase.purchaseNumber });
  }

  return hits;
}
