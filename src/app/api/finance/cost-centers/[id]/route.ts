import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, notFound, ok, serverError, trimNonEmpty } from "@/lib/api-utils";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  return withSessionContext(async () => {
    const { id } = await ctx.params;
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const existing = await prisma.costCenter.findUnique({ where: { id } });
      if (!existing) return notFound();
      const updated = await prisma.costCenter.update({
        where: { id },
        data: {
          name: trimNonEmpty(p.name) ?? existing.name,
          isActive: typeof p.isActive === "boolean" ? p.isActive : existing.isActive,
          projectType: trimNonEmpty(p.projectType) ?? existing.projectType,
        },
      });
      return ok({ center: updated });
    } catch (err) { return serverError(err); }
  });
}

export async function DELETE(_r: Request, ctx: Ctx) {
  return withSessionContext(async () => {
    const { id } = await ctx.params;
    try {
      await prisma.costCenter.update({ where: { id }, data: { deletedAt: new Date() } });
      return ok({ deleted: true });
    } catch (err) { return serverError(err); }
  });
}
