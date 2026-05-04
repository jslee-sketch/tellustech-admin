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
    options?: string | null;
  },
): Promise<void> {
  const {
    itemId, serialNumber, warehouseId, companyCode,
    ownerType, ownerClientId, inboundReason, options,
  } = params;

  const exists = await tx.inventoryItem.findUnique({ where: { serialNumber } });
  if (exists) {
    // 정책 B (S/N 1개 = 품목 1개) — itemId 변경 차단
    if (exists.itemId !== itemId) {
      throw new Error(`S/N ${serialNumber} 은 다른 품목(${exists.itemId})에 이미 등록됨 — 다른 S/N 사용 필요`);
    }
    // 정책 D — archived 상태이면 resurrect (잔량 0 후 재입고)
    const data: { warehouseId: string; archivedAt?: Date | null; ownerType?: AssetOwnerType; ownerClientId?: string | null; inboundReason?: InventoryReason; inboundAt?: Date; status?: "NORMAL"; currentLocationClientId?: string | null; currentLocationSinceAt?: Date } = { warehouseId };
    if (exists.archivedAt) {
      data.archivedAt = null;
      data.status = "NORMAL";
      data.inboundAt = new Date();
      data.currentLocationClientId = null;
      data.currentLocationSinceAt = new Date();
      // ownerType/ownerClientId 갱신 — 새 입고 사이클의 소유주로 변경
      if (ownerType) data.ownerType = ownerType;
      if (ownerClientId !== undefined) data.ownerClientId = ownerClientId;
      if (inboundReason) data.inboundReason = inboundReason;
    }
    await tx.inventoryItem.update({ where: { serialNumber }, data }).catch(() => undefined);
    return;
  }

  const item = await tx.item.findUnique({
    where: { id: itemId },
    select: { itemCode: true, name: true },
  });

  const qrData = await encodeQr({
    itemCode: item?.itemCode ?? "",
    serialNumber,
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
        options: options ?? null,
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
