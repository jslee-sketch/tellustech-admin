import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { forbidden, notFound, ok, serverError } from "@/lib/api-utils";
import bcrypt from "bcryptjs";

const DEFAULT_PASSWORD = "1234";

// POST /api/admin/users/[id]/reset-password
// ADMIN 만. 비밀번호를 '1234' 로 리셋 + mustChangePassword=true.
export async function POST(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN") return forbidden("admin_only");
    const { id } = await ctx.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound();
    try {
      await prisma.user.update({
        where: { id },
        data: { passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10), mustChangePassword: true },
      });
      return ok({ ok: true, resetTo: DEFAULT_PASSWORD });
    } catch (e) { return serverError(e); }
  });
}
