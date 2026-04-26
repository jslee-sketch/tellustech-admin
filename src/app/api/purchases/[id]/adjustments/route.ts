import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { notFound, ok } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const purchase = await prisma.purchase.findUnique({ where: { id }, select: { id: true } });
    if (!purchase) return notFound();

    const adjustments = await prisma.purchaseAdjustment.findMany({
      where: { originalPurchaseId: id },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });
    return ok({ adjustments });
  });
}
