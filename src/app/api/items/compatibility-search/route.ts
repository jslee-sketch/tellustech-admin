import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, trimNonEmpty } from "@/lib/api-utils";

// GET /api/items/compatibility-search?q=&direction=product_to_parts|parts_to_product
// q: 품목명/코드/설명 부분일치
// direction: product_to_parts(장비→소모품) 또는 parts_to_product(소모품→장비)
export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const direction = trimNonEmpty(url.searchParams.get("direction")) ?? "product_to_parts";
    if (!q) return ok({ results: [] });
    if (direction !== "product_to_parts" && direction !== "parts_to_product") {
      return badRequest("invalid_input", { field: "direction" });
    }

    const matched = await prisma.item.findMany({
      where: {
        deletedAt: null,
        itemType: direction === "product_to_parts"
          ? "PRODUCT"
          : { in: ["CONSUMABLE", "PART"] },
        OR: [
          { itemCode: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { itemCode: "asc" },
      take: 20,
      select: { id: true, itemCode: true, name: true, itemType: true, description: true, colorChannel: true },
    });

    const results = await Promise.all(
      matched.map(async (m) => {
        const compatRows = direction === "product_to_parts"
          ? await prisma.itemCompatibility.findMany({
              where: { productItemId: m.id },
              include: { consumable: { select: { id: true, itemCode: true, name: true, itemType: true, description: true, colorChannel: true, unit: true } } },
            })
          : await prisma.itemCompatibility.findMany({
              where: { consumableItemId: m.id },
              include: { product: { select: { id: true, itemCode: true, name: true, itemType: true, description: true } } },
            });
        const compatible = compatRows.map((r) => direction === "product_to_parts" ? (r as { consumable: unknown }).consumable : (r as { product: unknown }).product);
        return { searched: m, compatible };
      }),
    );

    return ok({ results });
  });
}
