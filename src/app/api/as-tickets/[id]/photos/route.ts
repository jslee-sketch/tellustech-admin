import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, notFound, ok, requireString, serverError } from "@/lib/api-utils";

// 이미 업로드된 파일(`/api/files`)을 AS 티켓에 M2M 연결/해제.

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const ticket = await prisma.asTicket.findUnique({ where: { id }, select: { id: true } });
    if (!ticket) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;
    try {
      const fileId = requireString(p.fileId, "fileId");
      const file = await prisma.file.findUnique({ where: { id: fileId }, select: { id: true } });
      if (!file) return badRequest("invalid_file");
      await prisma.asTicket.update({
        where: { id },
        data: { photos: { connect: { id: fileId } } },
      });
      return ok({ ok: true, fileId });
    } catch (err) {
      return serverError(err);
    }
  });
}
