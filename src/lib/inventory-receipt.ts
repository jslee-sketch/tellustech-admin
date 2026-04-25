import type { CompanyCode } from "@/generated/prisma/client";
import type { TxClient } from "@/lib/prisma";
import { encodeQr } from "@/lib/qr-label";

// S/N 입고 시 InventoryItem 마스터를 보장하고 qrData(PNG data URL)를 채움.
// 이미 존재하면 창고만 갱신하고 qrData 는 건드리지 않음.
export async function ensureInventoryItemOnReceipt(
  tx: TxClient,
  params: {
    itemId: string;
    serialNumber: string;
    warehouseId: string;
    companyCode: CompanyCode;
  },
): Promise<void> {
  const { itemId, serialNumber, warehouseId, companyCode } = params;

  const exists = await tx.inventoryItem.findUnique({ where: { serialNumber } });
  if (exists) {
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
      },
    })
    .catch(() => undefined);
}
