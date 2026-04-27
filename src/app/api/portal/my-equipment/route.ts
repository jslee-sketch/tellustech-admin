import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok } from "@/lib/api-utils";

// GET /api/portal/my-equipment
//   본인 거래처(client) 의 활성 IT 계약 + TM 렌탈 장비 SN 목록.
//   AS 요청 / 사용량 컨펌 폼의 SN drop-down 데이터.
//   변경 (REPLACE/REMOVE/ADD amendment) 도 항상 최신 반영 — removedAt=null 만.
export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { clientAccount: true },
    });
    if (!user?.clientAccount) return badRequest("not_linked");
    const clientId = user.clientAccount.id;

    const [itEq, tmItems] = await Promise.all([
      prisma.itContractEquipment.findMany({
        where: { itContract: { clientId }, removedAt: null },
        include: {
          itContract: { select: { contractNumber: true } },
          item:       { select: { id: true, itemCode: true, name: true, itemType: true } },
        },
        orderBy: { installedAt: "desc" },
      }),
      prisma.tmRentalItem.findMany({
        where: { tmRental: { clientId }, endDate: { gte: new Date() } },
        include: {
          tmRental: { select: { rentalCode: true } },
          item:     { select: { id: true, itemCode: true, name: true, itemType: true } },
        },
        orderBy: { startDate: "desc" },
      }),
    ]);

    const equipment = [
      ...itEq.map(e => ({
        sn: e.serialNumber,
        itemId: e.itemId,
        itemCode: e.item.itemCode,
        itemName: e.item.name,
        contractCode: e.itContract.contractNumber,
        contractKind: "IT" as const,
      })),
      ...tmItems.map(t => ({
        sn: t.serialNumber,
        itemId: t.itemId,
        itemCode: t.item.itemCode,
        itemName: t.item.name,
        contractCode: t.tmRental.rentalCode,
        contractKind: "TM" as const,
      })),
    ];
    return ok({ equipment });
  });
}
