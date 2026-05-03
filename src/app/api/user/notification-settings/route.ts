// 직원 개인 알림 설정 — 본인의 Employee 행을 수정.
import { withSessionContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-utils";

export async function GET() {
  return withSessionContext(async (session) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.sub },
        include: { employee: { select: { id: true, personalEmail: true, zaloId: true, notifyEmail: true, notifyZalo: true, notifyChat: true } } },
      });
      if (!user?.employee) return badRequest("not_employee");
      return ok({ settings: user.employee });
    } catch (e) { return serverError(e); }
  });
}

export async function PUT(request: Request) {
  return withSessionContext(async (session) => {
    try {
      const body = (await request.json()) as { personalEmail?: string; zaloId?: string; notifyEmail?: boolean; notifyZalo?: boolean; notifyChat?: boolean };
      const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { employeeId: true } });
      if (!user?.employeeId) return badRequest("not_employee");
      const data: Record<string, unknown> = {};
      if (body.personalEmail !== undefined) data.personalEmail = body.personalEmail || null;
      if (body.zaloId !== undefined) data.zaloId = body.zaloId || null;
      if (body.notifyEmail !== undefined) data.notifyEmail = !!body.notifyEmail;
      if (body.notifyZalo !== undefined) data.notifyZalo = !!body.notifyZalo;
      if (body.notifyChat !== undefined) data.notifyChat = !!body.notifyChat;
      const emp = await prisma.employee.update({ where: { id: user.employeeId }, data });
      return ok({ settings: { id: emp.id, personalEmail: emp.personalEmail, zaloId: emp.zaloId, notifyEmail: emp.notifyEmail, notifyZalo: emp.notifyZalo, notifyChat: emp.notifyChat } });
    } catch (e) { return serverError(e); }
  });
}
