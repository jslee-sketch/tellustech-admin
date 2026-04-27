import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { forbidden, ok, serverError } from "@/lib/api-utils";

export async function GET(req: Request) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const where: any = {};
    if (status) where.status = status;
    try {
      const items = await prisma.quoteRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          client: { select: { clientCode: true, companyNameVi: true } },
          assignedTo: { select: { employeeCode: true, nameVi: true } },
        },
      });
      return ok({ items });
    } catch (e) { return serverError(e); }
  });
}
