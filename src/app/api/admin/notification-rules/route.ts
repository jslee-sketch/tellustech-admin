import { withSessionContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-utils";

export async function GET() {
  return withSessionContext(async () => {
    try {
      const rules = await prisma.notificationRule.findMany({ orderBy: { eventType: "asc" } });
      return ok({ rules });
    } catch (e) { return serverError(e); }
  });
}

export async function PUT(request: Request) {
  return withSessionContext(async (session) => {
    try {
      if (session.role !== "ADMIN") return badRequest("admin_only");
      const body = (await request.json()) as { id?: string; channelEmail?: boolean; channelZalo?: boolean; channelChat?: boolean; isActive?: boolean; templateKo?: string; templateVi?: string; templateEn?: string };
      if (!body.id) return badRequest("invalid_id");
      const data: Record<string, unknown> = {};
      if (body.channelEmail !== undefined) data.channelEmail = !!body.channelEmail;
      if (body.channelZalo !== undefined) data.channelZalo = !!body.channelZalo;
      if (body.channelChat !== undefined) data.channelChat = !!body.channelChat;
      if (body.isActive !== undefined) data.isActive = !!body.isActive;
      if (typeof body.templateKo === "string") data.templateKo = body.templateKo;
      if (typeof body.templateVi === "string") data.templateVi = body.templateVi;
      if (typeof body.templateEn === "string") data.templateEn = body.templateEn;
      const updated = await prisma.notificationRule.update({ where: { id: body.id }, data });
      return ok({ rule: updated });
    } catch (e) { return serverError(e); }
  });
}
