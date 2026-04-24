import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { isRecordNotFoundError, notFound, ok, serverError } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const t = await prisma.inventoryTransaction.findUnique({
      where: { id },
      include: {
        item: { select: { itemCode: true, name: true } },
        fromWarehouse: { select: { code: true, name: true, warehouseType: true } },
        toWarehouse: { select: { code: true, name: true, warehouseType: true } },
        client: { select: { clientCode: true, companyNameVi: true } },
      },
    });
    if (!t) return notFound();
    return ok({ transaction: t });
  });
}

export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    try {
      await prisma.inventoryTransaction.delete({ where: { id } });
      return ok({ ok: true });
    } catch (err) {
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
