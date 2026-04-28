import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";
import bcrypt from "bcryptjs";

const DEFAULT_PASSWORD = "1234";

// 거래처 포탈 계정 — 관리자가 거래처 단위로 관리.
// POST  : (없으면) 신규 발급. ID=clientCode, PW=1234. 이미 있으면 already_exists.
// PATCH : 비밀번호를 1234 로 리셋 / 활성화 토글.

export async function POST(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    const { id } = await ctx.params;
    const client = await prisma.client.findUnique({ where: { id }, include: { portalUser: true } });
    if (!client) return notFound();
    if (client.portalUser) return badRequest("already_exists");
    try {
      const user = await prisma.user.create({
        data: {
          username: client.clientCode,
          passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
          clientId: id,
          allowedCompanies: [],
          role: "CLIENT",
          preferredLang: "KO",
          isActive: true,
          mustChangePassword: true,
        },
      });
      return ok({ user: { id: user.id, username: user.username, isActive: user.isActive } }, { status: 201 });
    } catch (e) { return serverError(e); }
  });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    const { id } = await ctx.params;
    const client = await prisma.client.findUnique({ where: { id }, include: { portalUser: true } });
    if (!client?.portalUser) return notFound();
    let body: unknown = {};
    try { body = await request.json(); } catch { /* */ }
    const action = String((body as any)?.action ?? "");
    try {
      if (action === "reset_password") {
        await prisma.user.update({ where: { id: client.portalUser.id }, data: { passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10), mustChangePassword: true } });
        return ok({ resetTo: DEFAULT_PASSWORD });
      }
      if (action === "toggle_active") {
        const updated = await prisma.user.update({ where: { id: client.portalUser.id }, data: { isActive: !client.portalUser.isActive } });
        return ok({ isActive: updated.isActive });
      }
      return badRequest("invalid_action");
    } catch (e) { return serverError(e); }
  });
}
