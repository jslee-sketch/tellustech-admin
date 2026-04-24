import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { notFound, ok, serverError } from "@/lib/api-utils";
import { generateMissingOrders } from "@/lib/rental-orders";

// GET  /api/rental/it-contracts/[id]/orders — 해당 계약의 월별 오더 목록
// POST /api/rental/it-contracts/[id]/orders — 누락 월 자동 생성 (멱등)

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const contract = await prisma.itContract.findUnique({ where: { id }, select: { id: true } });
    if (!contract) return notFound();
    const orders = await prisma.rentalOrder.findMany({
      where: { itContractId: id },
      orderBy: { billingMonth: "asc" },
    });
    return ok({ orders });
  });
}

export async function POST(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    try {
      const result = await generateMissingOrders(id);
      return ok(result, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message === "contract_not_found") return notFound();
      return serverError(err);
    }
  });
}
