import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { companyScope, ok, trimNonEmpty } from "@/lib/api-utils";
import type { Prisma } from "@/generated/prisma/client";

// GET /api/inventory/sn/search?q=&itemId=&inStock=
// SerialCombobox 자동완성용 — InventoryItem(S/N 단위 재고 마스터) 부분일치 검색.
// 회사 스코프 자동 적용. 기본은 NORMAL/RENTED/REPAIR 등 모든 상태 포함, inStock=1 이면 NORMAL 만.

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const itemId = trimNonEmpty(url.searchParams.get("itemId"));
    const inStock = url.searchParams.get("inStock") === "1";

    if (!q) return ok({ items: [] });

    const where: Prisma.InventoryItemWhereInput = {
      ...companyScope(session),
      serialNumber: { contains: q, mode: "insensitive" },
      ...(itemId ? { itemId } : {}),
      ...(inStock ? { status: "NORMAL" } : {}),
    };

    const rows = await prisma.inventoryItem.findMany({
      where,
      orderBy: { serialNumber: "asc" },
      take: 30,
      select: {
        id: true,
        serialNumber: true,
        status: true,
        item: { select: { id: true, itemCode: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });

    const items = rows.map((r) => ({
      id: r.id,
      serialNumber: r.serialNumber,
      status: r.status,
      itemId: r.item.id,
      itemCode: r.item.itemCode,
      itemName: r.item.name,
      warehouseCode: r.warehouse.code,
      warehouseName: r.warehouse.name,
    }));

    return ok({ items });
  });
}
