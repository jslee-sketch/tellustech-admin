import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { forbidden, ok, serverError } from "@/lib/api-utils";

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const url = new URL(request.url);
    const where: any = {};
    const cid = url.searchParams.get("contractId"); if (cid) where.contractId = cid;
    const eq = url.searchParams.get("equipmentId"); if (eq) where.equipmentId = eq;
    try {
      const items = await prisma.snmpReading.findMany({
        where,
        orderBy: { collectedAt: "desc" },
        take: 500,
        include: { contract: { select: { contractNumber: true } } },
      });
      return ok({ items });
    } catch (e) { return serverError(e); }
  });
}
