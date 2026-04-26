import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, requireString, serverError } from "@/lib/api-utils";
import { hashPassword } from "@/lib/auth";

// POST /api/admin/client-user
//   body: { clientId, username, password }
//   ADMIN/MANAGER 전용. 거래처를 위한 CLIENT 역할 User 생성/upsert.
//   같은 clientId 기존 user 있으면 비밀번호만 갱신.

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return badRequest("forbidden");
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const clientId = requireString(p.clientId, "clientId");
      const username = requireString(p.username, "username");
      const password = requireString(p.password, "password");
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) return badRequest("invalid_client");

      const existing = await prisma.user.findFirst({ where: { clientId } });
      const passwordHash = hashPassword(password);

      if (existing) {
        const u = await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash, username, isActive: true },
        });
        return ok({ user: { id: u.id, username: u.username, role: u.role }, action: "updated" });
      }

      const created = await prisma.user.create({
        data: {
          username, passwordHash, role: "CLIENT",
          clientId, allowedCompanies: [], preferredLang: "VI", isActive: true,
        },
      });
      return ok({ user: { id: created.id, username: created.username, role: created.role }, action: "created" });
    } catch (err) { return serverError(err); }
  });
}
