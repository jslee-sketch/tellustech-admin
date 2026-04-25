import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { companyScope, ok, optionalEnum, trimNonEmpty } from "@/lib/api-utils";
import type { InventoryStatus } from "@/generated/prisma/client";

const STATUSES: readonly InventoryStatus[] = ["NORMAL", "NEEDS_REPAIR", "PARTS_USED", "IRREPARABLE"] as const;

// GET /api/inventory/items?warehouse=&item=&status=&q=
export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const warehouseId = trimNonEmpty(url.searchParams.get("warehouse"));
    const itemId = trimNonEmpty(url.searchParams.get("item"));
    const status = optionalEnum(url.searchParams.get("status"), STATUSES);
    const q = trimNonEmpty(url.searchParams.get("q"));

    const where = {
      ...companyScope(session),
      ...(warehouseId ? { warehouseId } : {}),
      ...(itemId ? { itemId } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { serialNumber: { contains: q, mode: "insensitive" as const } },
              { item: { name: { contains: q, mode: "insensitive" as const } } },
              { item: { itemCode: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: [{ warehouseId: "asc" }, { itemId: "asc" }, { serialNumber: "asc" }],
      include: {
        item: { select: { itemCode: true, name: true, itemType: true } },
        warehouse: { select: { code: true, name: true, warehouseType: true } },
        remarks: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true, contentVi: true, contentEn: true, contentKo: true },
        },
      },
      take: 1000,
    });

    return ok({ items });
  });
}
