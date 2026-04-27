import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { forbidden, ok, serverError } from "@/lib/api-utils";

export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    try {
      const items = await prisma.portalFeedback.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { client: { select: { clientCode: true, companyNameVi: true } }, targetEmployee: { select: { employeeCode: true, nameVi: true } } },
      });
      return ok({ items });
    } catch (e) { return serverError(e); }
  });
}
