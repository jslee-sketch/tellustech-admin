import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok } from "@/lib/api-utils";

// GET /api/portal/account — 본인 계정 + mustChangePassword
export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, username: true, mustChangePassword: true, isActive: true, lastLoginAt: true, clientAccount: { select: { clientCode: true, companyNameVi: true, companyNameKo: true } } },
    });
    if (!user) return badRequest("not_found");
    return ok({ user });
  });
}
