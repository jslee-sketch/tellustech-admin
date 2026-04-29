import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { notFound, ok, serverError } from "@/lib/api-utils";

// DELETE /api/items/[id]/bom/[childId] — 하위 부품 분리 (자식 삭제 X, BOM 관계만 끊음)
export async function DELETE(_r: Request, ctx: { params: Promise<{ id: string; childId: string }> }) {
  return withSessionContext(async () => {
    const { id: parentId, childId } = await ctx.params;
    try {
      const child = await prisma.item.findUnique({ where: { id: childId }, select: { parentItemId: true } });
      if (!child || child.parentItemId !== parentId) return notFound();
      await prisma.item.update({
        where: { id: childId },
        data: { parentItemId: null, bomQuantity: 1, bomLevel: 0, bomNote: null },
      });
      return ok({ ok: true });
    } catch (err) {
      return serverError(err);
    }
  });
}
