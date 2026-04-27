import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { forbidden, ok, serverError } from "@/lib/api-utils";

export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    try {
      const items = await prisma.portalBanner.findMany({ orderBy: { slot: "asc" } });
      return ok({ items });
    } catch (e) { return serverError(e); }
  });
}
