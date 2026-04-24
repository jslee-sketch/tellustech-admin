import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { notFound, ok, serverError } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id, fileId } = await context.params;
    try {
      await prisma.asTicket.update({
        where: { id },
        data: { photos: { disconnect: { id: fileId } } },
      });
      return ok({ ok: true });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Record to update not found")) return notFound();
      return serverError(err);
    }
  });
}
