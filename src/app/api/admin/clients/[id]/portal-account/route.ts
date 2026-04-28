import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";
import bcrypt from "bcryptjs";

// 거래처별 포탈 계정 관리 — 한 거래처 = 한 ID 강제 (User.clientId @unique)
// POST  : 신규 발급 (username + password)
// PATCH : 비밀번호 재설정 / 활성화 토글
// DELETE: 계정 삭제 (재발급용)

function genPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    const { id } = await ctx.params;
    const client = await prisma.client.findUnique({ where: { id }, include: { portalUser: true } });
    if (!client) return notFound();
    if (client.portalUser) return badRequest("already_exists", { hint: "이미 발급됨 — 재설정으로 비밀번호만 변경하세요." });

    let body: unknown = {};
    try { body = await request.json(); } catch { /* 빈 body 허용 */ }
    const p = body as Record<string, unknown>;
    const usernameInput = String(p.username ?? "").trim();
    const passwordInput = String(p.password ?? "").trim();
    // 기본 username = clientCode 의 소문자 + "_portal" (예: cl-000001_portal)
    const username = usernameInput || `${client.clientCode.toLowerCase()}_portal`;
    const password = passwordInput || genPassword();

    try {
      const user = await prisma.user.create({
        data: {
          username,
          passwordHash: bcrypt.hashSync(password, 10),
          clientId: id,
          allowedCompanies: [],
          role: "CLIENT",
          preferredLang: "KO",
          isActive: true,
        },
      });
      // 임시 비밀번호는 한 번만 응답에 포함 — 관리자가 고객에게 전달
      return ok({ user: { id: user.id, username: user.username, isActive: user.isActive }, temporaryPassword: passwordInput ? null : password }, { status: 201 });
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
    const p = body as Record<string, unknown>;
    const action = String(p.action ?? "");
    try {
      if (action === "reset_password") {
        const passwordInput = String(p.password ?? "").trim();
        const password = passwordInput || genPassword();
        await prisma.user.update({ where: { id: client.portalUser.id }, data: { passwordHash: bcrypt.hashSync(password, 10) } });
        return ok({ temporaryPassword: passwordInput ? null : password });
      }
      if (action === "toggle_active") {
        const updated = await prisma.user.update({ where: { id: client.portalUser.id }, data: { isActive: !client.portalUser.isActive } });
        return ok({ isActive: updated.isActive });
      }
      return badRequest("invalid_action");
    } catch (e) { return serverError(e); }
  });
}

export async function DELETE(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN") return forbidden();
    const { id } = await ctx.params;
    const client = await prisma.client.findUnique({ where: { id }, include: { portalUser: true } });
    if (!client?.portalUser) return notFound();
    try {
      // ChatRoomMember 등 FK 가 있는 경우 cascade 충돌 가능성 — 일단 isActive=false 권장.
      // 강제 삭제는 ADMIN 만.
      await prisma.user.delete({ where: { id: client.portalUser.id } });
      return ok({ ok: true });
    } catch (e) { return serverError(e); }
  });
}
