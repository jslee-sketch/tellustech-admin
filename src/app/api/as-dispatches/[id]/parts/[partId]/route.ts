import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { notFound, ok, serverError } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string; partId: string }> };

// DELETE /api/as-dispatches/[id]/parts/[partId]
// 부품 사용 취소 — 연결된 InventoryTransaction(출고)도 함께 삭제 (재고 복원)
export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { partId } = await context.params;
    const part = await prisma.asDispatchPart.findUnique({
      where: { id: partId },
      select: { id: true, inventoryTxnId: true },
    });
    if (!part) return notFound();
    try {
      await prisma.$transaction(async (tx) => {
        await tx.asDispatchPart.delete({ where: { id: partId } });
        if (part.inventoryTxnId) {
          await tx.inventoryTransaction.delete({ where: { id: part.inventoryTxnId } }).catch(() => undefined);
        }
      });
      return ok({ ok: true });
    } catch (err) {
      return serverError(err);
    }
  });
}
