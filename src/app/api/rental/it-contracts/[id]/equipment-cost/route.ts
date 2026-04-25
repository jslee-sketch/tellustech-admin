import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { notFound, ok } from "@/lib/api-utils";
import { getEquipmentTotalCost } from "@/lib/cost-tracker";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/rental/it-contracts/[id]/equipment-cost
// IT 계약의 각 장비 S/N별 누적 비용 (매입가 + 부품비 + 교통비 + 소모품비)
export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const contract = await prisma.itContract.findUnique({
      where: { id },
      include: { equipment: { select: { serialNumber: true, itemId: true } } },
    });
    if (!contract) return notFound();

    const equipment = await Promise.all(
      contract.equipment
        .filter((e): e is { serialNumber: string; itemId: string } => !!e.serialNumber)
        .map((e) => getEquipmentTotalCost(e.serialNumber)),
    );
    const filtered = equipment.filter((c): c is NonNullable<typeof c> => !!c);
    const contractTotal = filtered.reduce((s, e) => s + e.totalCost, 0);

    return ok({ equipment: filtered, contractTotal });
  });
}
