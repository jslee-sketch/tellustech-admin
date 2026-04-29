import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, trimNonEmpty } from "@/lib/api-utils";

// GET /api/portal/my-supplies?productItemId=
//   본인 거래처의 활성 IT/TM 장비 → 호환 소모품/부품.
//   productItemId 지정 시: 그 itemId 의 호환 소모품만 (소속 검증 포함).
//   미지정 시: 전체 (장비별로 그룹 정보 함께 반환).
export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const url = new URL(request.url);
    const requested = trimNonEmpty(url.searchParams.get("productItemId"));
    const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
    if (!user?.clientAccount) return badRequest("not_linked");
    const clientId = user.clientAccount.id;

    // 활성 장비 — IT + TM. 그룹 표시용 정보 포함.
    const [itEq, tmItems] = await Promise.all([
      prisma.itContractEquipment.findMany({
        where: { itContract: { clientId }, removedAt: null },
        select: { itemId: true, serialNumber: true, item: { select: { itemCode: true, name: true } } },
      }),
      prisma.tmRentalItem.findMany({
        where: { tmRental: { clientId }, endDate: { gte: new Date() } },
        select: { itemId: true, item: { select: { itemCode: true, name: true } } },
      }),
    ]);
    const myProductIds = new Set<string>([...itEq.map((x) => x.itemId), ...tmItems.map((x) => x.itemId)]);

    if (requested) {
      // 요청된 itemId 가 본인 장비여야 함 (소속 검증).
      if (!myProductIds.has(requested)) return badRequest("not_your_equipment");
      const compats = await prisma.itemCompatibility.findMany({
        where: { productItemId: requested },
        include: { consumable: { select: { id: true, itemCode: true, name: true, unit: true, description: true, itemType: true, colorChannel: true } } },
      });
      return ok({ supplies: compats.map((c) => c.consumable), products: [] });
    }

    // 전체 — 본인 장비별로 호환 그룹핑.
    if (myProductIds.size === 0) return ok({ supplies: [], products: [] });
    const compats = await prisma.itemCompatibility.findMany({
      where: { productItemId: { in: Array.from(myProductIds) } },
      include: {
        product: { select: { id: true, itemCode: true, name: true } },
        consumable: { select: { id: true, itemCode: true, name: true, unit: true, description: true, itemType: true, colorChannel: true } },
      },
    });
    // 평면(중복 제거) — 기존 동작 보존.
    const flat = new Map<string, typeof compats[number]["consumable"]>();
    for (const c of compats) flat.set(c.consumableItemId, c.consumable);

    // 장비별 호환 소모품 목록 — UX 그룹핑용.
    const productMap = new Map<string, { product: typeof compats[number]["product"]; consumables: string[] }>();
    for (const c of compats) {
      const cur = productMap.get(c.product.id) ?? { product: c.product, consumables: [] };
      cur.consumables.push(c.consumableItemId);
      productMap.set(c.product.id, cur);
    }

    return ok({
      supplies: Array.from(flat.values()),
      products: Array.from(productMap.values()).map((g) => ({
        id: g.product.id,
        itemCode: g.product.itemCode,
        name: g.product.name,
        compatibleConsumableIds: g.consumables,
      })),
    });
  });
}
