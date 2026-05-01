import type { CompanyCode, InventoryReason, AssetOwnerType } from "@/generated/prisma/client";
import type { TxClient } from "@/lib/prisma";
import { encodeQr } from "@/lib/qr-label";

// S/N 입고 시 InventoryItem 마스터를 보장하고 qrData(PNG data URL)를 채움.
// 이미 존재하면 창고만 갱신하고 qrData/소유주는 유지.
//
// ownership 옵션:
//   ownerType=COMPANY (default) → 자사 자산 (매입)
//   ownerType=EXTERNAL_CLIENT + ownerClientId → 타사 자산 (수리/데모/교정/렌탈입고).
// inboundReason 은 입고 사유를 보존해 추후 출고/반환 시 매칭에 사용.
export async function ensureInventoryItemOnReceipt(
  tx: TxClient,
  params: {
    itemId: string;
    serialNumber: string;
    warehouseId: string;
    companyCode: CompanyCode;
    ownerType?: AssetOwnerType;
    ownerClientId?: string | null;
    inboundReason?: InventoryReason;
  },
): Promise<void> {
  const {
    itemId, serialNumber, warehouseId, companyCode,
    ownerType, ownerClientId, inboundReason,
  } = params;

  const exists = await tx.inventoryItem.findUnique({ where: { serialNumber } });
  if (exists) {
    // 이미 마스터 존재 — 창고만 변경, 소유주 정보는 보존 (재입고 시 owner 가 바뀔 수 있다면 별도 정책 필요)
    await tx.inventoryItem
      .update({ where: { serialNumber }, data: { warehouseId } })
      .catch(() => undefined);
    return;
  }

  const item = await tx.item.findUnique({
    where: { id: itemId },
    select: { itemCode: true, name: true },
  });

  const qrData = await encodeQr({
    itemCode: item?.itemCode ?? "",
    serialNumber,
    itemName: item?.name,
  });

  await tx.inventoryItem
    .create({
      data: {
        itemId,
        serialNumber,
        warehouseId,
        companyCode,
        status: "NORMAL",
        acquiredAt: new Date(),
        qrData,
        ownerType: ownerType ?? "COMPANY",
        ownerClientId: ownerClientId ?? null,
        inboundReason: inboundReason ?? null,
        inboundAt: new Date(),
        currentLocationClientId: null,
        currentLocationSinceAt: new Date(),
      },
    })
    .catch(() => undefined);
}
