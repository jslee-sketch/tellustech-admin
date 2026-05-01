import "server-only";
import type {
  AmendmentItemAction,
  AmendmentSource,
  AmendmentType,
} from "@/generated/prisma/client";
import type { TxClient } from "./prisma";
import { generateDatedCode } from "./code-generator";
import { ensureInventoryItemOnReceipt } from "./inventory-receipt";
import { deriveCompanyFromContractNumber } from "./rental-orders";
import { prisma } from "./prisma";

// 계약변경(Amendment) 헬퍼.
// 차후 정책: 발생한 매출/오더는 그대로, 다음 청구 시점부터 active equipment 기준으로 합산.
//  - REMOVE_EQUIPMENT: ItContractEquipment.removedAt 세팅 (또는 TmRentalItem.endDate 단축).
//  - ADD_EQUIPMENT  : 새 행 추가 (installedAt = effectiveDate).
//  - REPLACE_*      : REPLACE_OUT(기존 removedAt) + REPLACE_IN(신규 installedAt).
//  - PRICE_CHANGE   : amendment.monthlyDelta 만 저장 (billing-calc 가 합산).
//  - TERMINATE      : 전체 active equipment removedAt = effectiveDate, contract.status="EXPIRED".
// 회사코드 — IT 는 contractNumber prefix 로, TM 은 별도 함수 인자.

export type ItAmendmentItemInput = {
  action: AmendmentItemAction;
  serialNumber: string;
  itemId: string;
  originalEquipmentId?: string | null;
  monthlyBaseFee?: string | null;
  bwIncludedPages?: number | null;
  bwOverageRate?: string | null;
  colorIncludedPages?: number | null;
  colorOverageRate?: string | null;
  manufacturer?: string | null;
};

export type CreateItAmendmentParams = {
  contractId: string;
  type: AmendmentType;
  source?: AmendmentSource;
  triggeredByTxnId?: string | null;
  effectiveDate: Date;
  reason?: string | null;
  reasonVi?: string | null;
  reasonEn?: string | null;
  reasonKo?: string | null;
  warehouseId?: string | null;
  monthlyDelta?: string | null;
  performedById: string;
  items: ItAmendmentItemInput[];
};

export type TmAmendmentItemInput = {
  action: AmendmentItemAction;
  serialNumber: string;
  itemId: string;
  originalItemId?: string | null;
  salesPrice?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
};

export type CreateTmAmendmentParams = {
  rentalId: string;
  type: AmendmentType;
  source?: AmendmentSource;
  triggeredByTxnId?: string | null;
  effectiveDate: Date;
  reason?: string | null;
  reasonVi?: string | null;
  reasonEn?: string | null;
  reasonKo?: string | null;
  warehouseId?: string | null;
  performedById: string;
  items: TmAmendmentItemInput[];
};

function decimalOrNull(v: string | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

export async function createItAmendment(
  tx: TxClient,
  params: CreateItAmendmentParams,
): Promise<{ id: string; amendmentCode: string }> {
  const contract = await tx.itContract.findUnique({
    where: { id: params.contractId },
    select: { id: true, contractNumber: true, clientId: true, startDate: true, endDate: true, status: true },
  });
  if (!contract) throw new Error("contract_not_found");
  const companyCode = deriveCompanyFromContractNumber(contract.contractNumber);

  const amendmentCode = await generateDatedCode({
    prefix: "AMD-IT",
    lookupLast: async (full) => {
      const last = await tx.itContractAmendment.findFirst({
        where: { amendmentCode: { startsWith: full } },
        orderBy: { amendmentCode: "desc" },
        select: { amendmentCode: true },
      });
      return last?.amendmentCode ?? null;
    },
  });

  const amendment = await tx.itContractAmendment.create({
    data: {
      amendmentCode,
      contractId: contract.id,
      type: params.type,
      source: params.source ?? "CONTRACT_DETAIL",
      triggeredByTxnId: params.triggeredByTxnId ?? null,
      effectiveDate: params.effectiveDate,
      reason: params.reason ?? null,
      reasonVi: params.reasonVi ?? null,
      reasonEn: params.reasonEn ?? null,
      reasonKo: params.reasonKo ?? null,
      warehouseId: params.warehouseId ?? null,
      monthlyDelta: decimalOrNull(params.monthlyDelta),
      performedById: params.performedById,
    },
  });

  if (params.items.length > 0) {
    await tx.itContractAmendmentItem.createMany({
      data: params.items.map((it) => ({
        amendmentId: amendment.id,
        action: it.action,
        serialNumber: it.serialNumber,
        itemId: it.itemId,
        originalEquipmentId: it.originalEquipmentId ?? null,
        monthlyBaseFee: decimalOrNull(it.monthlyBaseFee),
        bwIncludedPages: it.bwIncludedPages ?? null,
        bwOverageRate: decimalOrNull(it.bwOverageRate),
        colorIncludedPages: it.colorIncludedPages ?? null,
        colorOverageRate: decimalOrNull(it.colorOverageRate),
        manufacturer: it.manufacturer ?? null,
      })),
    });
  }

  // ItContractEquipment 행 효과 적용
  for (const it of params.items) {
    if (it.action === "REMOVE" || it.action === "REPLACE_OUT") {
      // removedAt 세팅 — originalEquipmentId 우선, 없으면 (contract,sn) 으로 lookup
      let eqId = it.originalEquipmentId ?? null;
      if (!eqId) {
        const eq = await tx.itContractEquipment.findUnique({
          where: { itContractId_serialNumber: { itContractId: contract.id, serialNumber: it.serialNumber } },
        });
        eqId = eq?.id ?? null;
      }
      if (eqId) {
        await tx.itContractEquipment.update({
          where: { id: eqId },
          data: { removedAt: params.effectiveDate },
        });
      }
      // 회수 창고 지정시 재고 IN/RENTAL/RETURN/COMPANY (자사 자산 회수)
      if (params.warehouseId) {
        await tx.inventoryTransaction.create({
          data: {
            companyCode,
            itemId: it.itemId,
            fromWarehouseId: null,
            toWarehouseId: params.warehouseId,
            clientId: contract.clientId,
            serialNumber: it.serialNumber,
            txnType: "IN",
            reason: "RENTAL_IN", // legacy 호환
            referenceModule: "RENTAL",
            subKind: "RETURN",
            quantity: 1,
            note: `[자동] IT계약 변경 ${amendmentCode} (${it.action} ${contract.contractNumber})`,
            performedById: params.performedById,
          },
        });
        await ensureInventoryItemOnReceipt(tx, {
          itemId: it.itemId,
          serialNumber: it.serialNumber,
          warehouseId: params.warehouseId,
          companyCode,
          ownerType: "COMPANY",
        });
        // 회수 시 마스터의 currentLocation 초기화
        await tx.inventoryItem.update({
          where: { serialNumber: it.serialNumber },
          data: {
            warehouseId: params.warehouseId,
            currentLocationClientId: null,
            currentLocationSinceAt: new Date(),
          },
        }).catch(() => undefined);
      }
    } else if (it.action === "ADD" || it.action === "REPLACE_IN") {
      // 신규 ItContractEquipment 추가 (같은 sn 이면 upsert 무방)
      await tx.itContractEquipment.upsert({
        where: { itContractId_serialNumber: { itContractId: contract.id, serialNumber: it.serialNumber } },
        update: {
          itemId: it.itemId,
          installedAt: params.effectiveDate,
          removedAt: null,
          monthlyBaseFee: decimalOrNull(it.monthlyBaseFee),
          bwIncludedPages: it.bwIncludedPages ?? null,
          bwOverageRate: decimalOrNull(it.bwOverageRate),
          colorIncludedPages: it.colorIncludedPages ?? null,
          colorOverageRate: decimalOrNull(it.colorOverageRate),
          manufacturer: it.manufacturer ?? null,
        },
        create: {
          itContractId: contract.id,
          itemId: it.itemId,
          serialNumber: it.serialNumber,
          installedAt: params.effectiveDate,
          monthlyBaseFee: decimalOrNull(it.monthlyBaseFee),
          bwIncludedPages: it.bwIncludedPages ?? null,
          bwOverageRate: decimalOrNull(it.bwOverageRate),
          colorIncludedPages: it.colorIncludedPages ?? null,
          colorOverageRate: decimalOrNull(it.colorOverageRate),
          manufacturer: it.manufacturer ?? null,
        },
      });
      // 자사 창고에서 출고 → 고객 (OUT/RENTAL/LEND/COMPANY)
      if (params.warehouseId) {
        await tx.inventoryTransaction.create({
          data: {
            companyCode,
            itemId: it.itemId,
            fromWarehouseId: params.warehouseId,
            toWarehouseId: null,
            clientId: contract.clientId,
            serialNumber: it.serialNumber,
            txnType: "OUT",
            reason: "RENTAL_OUT", // legacy 호환
            referenceModule: "RENTAL",
            subKind: "LEND",
            quantity: 1,
            note: `[자동] IT계약 변경 ${amendmentCode} (${it.action} ${contract.contractNumber})`,
            performedById: params.performedById,
          },
        });
        // 마스터 위치 갱신 — 고객 거래처로 이동 표시
        await tx.inventoryItem.update({
          where: { serialNumber: it.serialNumber },
          data: {
            currentLocationClientId: contract.clientId,
            currentLocationSinceAt: new Date(),
          },
        }).catch(() => undefined);
      }
    }
  }

  // TERMINATE: 전체 active equipment removedAt 세팅 + status=EXPIRED
  if (params.type === "TERMINATE") {
    await tx.itContractEquipment.updateMany({
      where: { itContractId: contract.id, removedAt: null },
      data: { removedAt: params.effectiveDate },
    });
    await tx.itContract.update({
      where: { id: contract.id },
      data: { status: "EXPIRED", endDate: params.effectiveDate },
    });
  }

  return { id: amendment.id, amendmentCode };
}

export async function createTmAmendment(
  tx: TxClient,
  params: CreateTmAmendmentParams,
): Promise<{ id: string; amendmentCode: string }> {
  const rental = await tx.tmRental.findUnique({
    where: { id: params.rentalId },
    select: { id: true, rentalCode: true, clientId: true, startDate: true, endDate: true },
  });
  if (!rental) throw new Error("rental_not_found");
  // TM 렌탈은 회사코드가 없음 — 거래처 마스터에 영향 없으니 계약번호 prefix 로는 유추 불가.
  // 정책: TmRental 도 IT 와 같이 'TM-' prefix → TV 로 매핑. 명시적 의도 없으면 TV 기본.
  // (실 운영 분리는 향후 TmRental 에 companyCode 추가 시 정정.)
  const companyCode: "TV" | "VR" = rental.rentalCode.startsWith("VR-TM") ? "VR" : "TV";

  const amendmentCode = await generateDatedCode({
    prefix: "AMD-TM",
    lookupLast: async (full) => {
      const last = await tx.tmRentalAmendment.findFirst({
        where: { amendmentCode: { startsWith: full } },
        orderBy: { amendmentCode: "desc" },
        select: { amendmentCode: true },
      });
      return last?.amendmentCode ?? null;
    },
  });

  const amendment = await tx.tmRentalAmendment.create({
    data: {
      amendmentCode,
      rentalId: rental.id,
      type: params.type,
      source: params.source ?? "CONTRACT_DETAIL",
      triggeredByTxnId: params.triggeredByTxnId ?? null,
      effectiveDate: params.effectiveDate,
      reason: params.reason ?? null,
      reasonVi: params.reasonVi ?? null,
      reasonEn: params.reasonEn ?? null,
      reasonKo: params.reasonKo ?? null,
      warehouseId: params.warehouseId ?? null,
      performedById: params.performedById,
    },
  });

  if (params.items.length > 0) {
    await tx.tmRentalAmendmentItem.createMany({
      data: params.items.map((it) => ({
        amendmentId: amendment.id,
        action: it.action,
        serialNumber: it.serialNumber,
        itemId: it.itemId,
        originalItemId: it.originalItemId ?? null,
        salesPrice: decimalOrNull(it.salesPrice),
        startDate: it.startDate ?? null,
        endDate: it.endDate ?? null,
      })),
    });
  }

  for (const it of params.items) {
    if (it.action === "REMOVE" || it.action === "REPLACE_OUT") {
      let lineId = it.originalItemId ?? null;
      if (!lineId) {
        const found = await tx.tmRentalItem.findFirst({
          where: { tmRentalId: rental.id, serialNumber: it.serialNumber },
          orderBy: { createdAt: "desc" },
        });
        lineId = found?.id ?? null;
      }
      if (lineId) {
        // 종료일 단축 — 효과적 제거
        await tx.tmRentalItem.update({
          where: { id: lineId },
          data: { endDate: params.effectiveDate },
        });
      }
      if (params.warehouseId) {
        await tx.inventoryTransaction.create({
          data: {
            companyCode,
            itemId: it.itemId,
            fromWarehouseId: null,
            toWarehouseId: params.warehouseId,
            clientId: rental.clientId,
            serialNumber: it.serialNumber,
            txnType: "TRANSFER",
            reason: "RENTAL",
            quantity: 1,
            note: `[자동] TM 렌탈 변경 ${amendmentCode} (${it.action} ${rental.rentalCode})`,
            performedById: params.performedById,
          },
        });
        await ensureInventoryItemOnReceipt(tx, {
          itemId: it.itemId,
          serialNumber: it.serialNumber,
          warehouseId: params.warehouseId,
          companyCode,
        });
      }
    } else if (it.action === "ADD" || it.action === "REPLACE_IN") {
      const salesPrice = decimalOrNull(it.salesPrice) ?? "0";
      await tx.tmRentalItem.create({
        data: {
          tmRentalId: rental.id,
          itemId: it.itemId,
          serialNumber: it.serialNumber,
          startDate: it.startDate ?? params.effectiveDate,
          endDate: it.endDate ?? rental.endDate,
          salesPrice,
        },
      });
      if (params.warehouseId) {
        await tx.inventoryTransaction.create({
          data: {
            companyCode,
            itemId: it.itemId,
            fromWarehouseId: params.warehouseId,
            toWarehouseId: null,
            clientId: rental.clientId,
            serialNumber: it.serialNumber,
            txnType: "TRANSFER",
            reason: "RENTAL",
            quantity: 1,
            note: `[자동] TM 렌탈 변경 ${amendmentCode} (${it.action} ${rental.rentalCode})`,
            performedById: params.performedById,
          },
        });
      }
    }
  }

  if (params.type === "TERMINATE") {
    await tx.tmRentalItem.updateMany({
      where: { tmRentalId: rental.id, endDate: { gt: params.effectiveDate } },
      data: { endDate: params.effectiveDate },
    });
    await tx.tmRental.update({
      where: { id: rental.id },
      data: { endDate: params.effectiveDate },
    });
  }

  return { id: amendment.id, amendmentCode };
}

export async function runItAmendment(
  params: CreateItAmendmentParams,
): Promise<{ id: string; amendmentCode: string }> {
  return prisma.$transaction((tx) => createItAmendment(tx, params));
}

export async function runTmAmendment(
  params: CreateTmAmendmentParams,
): Promise<{ id: string; amendmentCode: string }> {
  return prisma.$transaction((tx) => createTmAmendment(tx, params));
}
