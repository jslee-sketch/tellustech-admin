import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, trimNonEmpty } from "@/lib/api-utils";

// GET /api/yield-analysis/consumable-history?equipmentSN=&periodStart=&periodEnd=
// AsDispatchPart 기반 — 어떤 기사가, 언제, 어떤 소모품을, 몇 개 투입했는지.
export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const sn = trimNonEmpty(url.searchParams.get("equipmentSN"));
    const periodStart = trimNonEmpty(url.searchParams.get("periodStart"));
    const periodEnd = trimNonEmpty(url.searchParams.get("periodEnd"));
    if (!sn) return badRequest("invalid_input", { field: "equipmentSN", reason: "required" });

    const parts = await prisma.asDispatchPart.findMany({
      where: {
        targetEquipmentSN: sn,
        ...(periodStart || periodEnd
          ? {
              asDispatch: {
                completedAt: {
                  ...(periodStart ? { gte: new Date(periodStart) } : {}),
                  ...(periodEnd ? { lte: new Date(periodEnd) } : {}),
                },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        item: { select: { id: true, itemCode: true, name: true, expectedYield: true, yieldCoverageBase: true } },
        asDispatch: {
          select: {
            id: true,
            completedAt: true,
            dispatchEmployee: { select: { id: true, employeeCode: true, nameVi: true, nameEn: true, nameKo: true } },
          },
        },
      },
    });

    return ok({ parts });
  });
}
