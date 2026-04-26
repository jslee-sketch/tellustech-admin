import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { notFound, ok } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const rental = await prisma.tmRental.findUnique({ where: { id }, select: { id: true } });
    if (!rental) return notFound();

    const amendments = await prisma.tmRentalAmendment.findMany({
      where: { rentalId: id },
      orderBy: { effectiveDate: "desc" },
      include: {
        items: true,
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });
    return ok({ amendments });
  });
}
