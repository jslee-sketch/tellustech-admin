import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, conflict, notFound, ok, serverError, trimNonEmpty } from "@/lib/api-utils";

// POST /api/rental/tm-rentals/[id]/terminate
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await ctx.params;
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const endDateRaw = trimNonEmpty(p.endDate);
    const reason = trimNonEmpty(p.reason);
    const status = trimNonEmpty(p.status) ?? "COMPLETED";
    if (!endDateRaw) return badRequest("invalid_input", { field: "endDate", reason: "required" });
    if (!reason) return badRequest("invalid_input", { field: "reason", reason: "required" });
    if (status !== "COMPLETED" && status !== "CANCELED") {
      return badRequest("invalid_input", { field: "status", reason: "must_be_completed_or_canceled" });
    }
    const endDate = new Date(endDateRaw);
    if (Number.isNaN(endDate.getTime())) return badRequest("invalid_input", { field: "endDate", reason: "invalid" });

    try {
      const rental = await prisma.tmRental.findUnique({ where: { id } });
      if (!rental) return notFound();
      if (rental.terminatedAt) return conflict("already_terminated");

      await prisma.$transaction(async (tx) => {
        await tx.tmRental.update({
          where: { id },
          data: {
            endDate,
            status: status as "COMPLETED" | "CANCELED",
            terminatedAt: new Date(),
            terminatedById: session.sub,
            terminationReason: reason,
          },
        });
        // 모든 라인 endDate 단축 (기존 endDate 이 종료일 이후라면)
        await tx.tmRentalItem.updateMany({
          where: { tmRentalId: id, endDate: { gt: endDate } },
          data: { endDate },
        });
        // 종료일 이후 월의 DRAFT 매출 삭제
        await tx.sales.deleteMany({
          where: { tmRentalId: id, isDraft: true, billingMonth: { gt: endDate } },
        });
      });

      return ok({ ok: true });
    } catch (err) {
      return serverError(err);
    }
  });
}
