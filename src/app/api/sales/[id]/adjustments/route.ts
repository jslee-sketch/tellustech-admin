import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { notFound, ok } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/sales/[id]/adjustments — 사후조정 이력
export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const sales = await prisma.sales.findUnique({ where: { id }, select: { id: true } });
    if (!sales) return notFound();

    const adjustments = await prisma.salesAdjustment.findMany({
      where: { originalSalesId: id },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });
    return ok({ adjustments });
  });
}
