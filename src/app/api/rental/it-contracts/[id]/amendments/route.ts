import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { notFound, ok } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const contract = await prisma.itContract.findUnique({ where: { id }, select: { id: true } });
    if (!contract) return notFound();

    const amendments = await prisma.itContractAmendment.findMany({
      where: { contractId: id },
      orderBy: { effectiveDate: "desc" },
      include: {
        items: true,
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });
    return ok({ amendments });
  });
}
