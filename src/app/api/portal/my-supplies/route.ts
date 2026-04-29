import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok } from "@/lib/api-utils";

// GET /api/portal/my-supplies
//   본인 거래처가 렌탈/IT 계약 중인 모든 장비의 itemId 들에 호환되는 소모품/부품 목록.
//   ItemCompatibility 매핑 기반.
export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
    if (!user?.clientAccount) return badRequest("not_linked");
    const clientId = user.clientAccount.id;

    // 활성 장비의 itemId 수집 — IT + TM
    const [itEq, tmItems] = await Promise.all([
      prisma.itContractEquipment.findMany({ where: { itContract: { clientId }, removedAt: null }, select: { itemId: true } }),
      prisma.tmRentalItem.findMany({ where: { tmRental: { clientId }, endDate: { gte: new Date() } }, select: { itemId: true } }),
    ]);
    const productIds = [...new Set([...itEq, ...tmItems].map(x => x.itemId))];
    if (productIds.length === 0) return ok({ supplies: [] });

    const compats = await prisma.itemCompatibility.findMany({
      where: { productItemId: { in: productIds } },
      include: { consumable: { select: { id: true, itemCode: true, name: true, unit: true, description: true, itemType: true } } },
    });
    // 중복 제거 (같은 소모품이 여러 본체에 호환)
    const uniqMap = new Map<string, typeof compats[number]["consumable"]>();
    for (const c of compats) uniqMap.set(c.consumableItemId, c.consumable);

    return ok({ supplies: Array.from(uniqMap.values()) });
  });
}
