import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, trimNonEmpty } from "@/lib/api-utils";

// GET /api/portal/items?q= — CLIENT 가 소모품 요청 시 검색용.
// 카테고리 = CONSUMABLE / PART 위주, 상위 50건.
export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const u = new URL(request.url);
    const q = trimNonEmpty(u.searchParams.get("q"));
    const items = await prisma.item.findMany({
      where: q ? { OR: [
        { itemCode: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ]} : {},
      orderBy: { itemCode: "asc" },
      take: 50,
      select: { id: true, itemCode: true, name: true, unit: true, itemType: true },
    });
    return ok({ items });
  });
}
