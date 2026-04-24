import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { notFound, ok, trimNonEmpty } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/rental/it-contracts/{id}/consumables?sn=장비S/N
// 해당 IT계약 장비에 출고된 소모품 이력 조회 (targetEquipmentSN 매칭)
export async function GET(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const url = new URL(request.url);
    const equipSN = trimNonEmpty(url.searchParams.get("sn"));

    const contract = await prisma.itContract.findUnique({
      where: { id },
      include: { equipment: { select: { id: true, serialNumber: true, itemId: true } } },
    });
    if (!contract) return notFound();

    // 특정 S/N 필터 또는 전체 장비 S/N 중
    const equipmentSNs = equipSN
      ? contract.equipment.filter((e) => e.serialNumber === equipSN).map((e) => e.serialNumber)
      : contract.equipment.map((e) => e.serialNumber);

    const consumables = await prisma.inventoryTransaction.findMany({
      where: {
        companyCode: session.companyCode,
        reason: "CONSUMABLE_OUT",
        targetEquipmentSN: { in: equipmentSNs },
      },
      orderBy: { performedAt: "desc" },
      include: {
        item: { select: { itemCode: true, name: true } },
      },
    });

    return ok({
      contractNumber: contract.contractNumber,
      consumables: consumables.map((c) => ({
        id: c.id,
        performedAt: c.performedAt,
        equipmentSN: c.targetEquipmentSN,
        itemCode: c.item?.itemCode,
        itemName: c.item?.name,
        consumableSN: c.serialNumber,
        note: c.note,
      })),
    });
  });
}
