import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import bcrypt from "bcryptjs";

// PATCH /api/portal/account/password — 본인 비밀번호 변경
// body: { currentPassword, newPassword }
export async function PATCH(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const cur = String(p.currentPassword ?? "");
    const next = String(p.newPassword ?? "");
    if (!cur || !next) return badRequest("invalid_input");
    if (next.length < 4) return badRequest("password_too_short", { hint: "최소 4자 이상" });
    if (next === cur) return badRequest("same_as_current");

    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (!user) return badRequest("not_found");
    if (!bcrypt.compareSync(cur, user.passwordHash)) return badRequest("wrong_current_password");

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: bcrypt.hashSync(next, 10), mustChangePassword: false },
      });
      return ok({ ok: true });
    } catch (e) { return serverError(e); }
  });
}
