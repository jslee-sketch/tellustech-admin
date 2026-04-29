import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, conflict, notFound, ok, serverError, trimNonEmpty } from "@/lib/api-utils";

// POST /api/rental/it-contracts/[id]/terminate
// Body: { endDate, reason, status: "COMPLETED" | "CANCELED" }
// 동작:
//   1) endDate 변경, status COMPLETED/CANCELED, terminatedAt/Reason 기록
//   2) 모든 활성 장비 removedAt = endDate
//   3) 그 endDate 이후 월의 DRAFT(isDraft=true) 매출 자동 삭제 (cron 이 다시 안 만듦)
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
      const contract = await prisma.itContract.findUnique({ where: { id } });
      if (!contract) return notFound();
      if (contract.terminatedAt) return conflict("already_terminated");

      await prisma.$transaction(async (tx) => {
        await tx.itContract.update({
          where: { id },
          data: {
            endDate,
            status: status as "COMPLETED" | "CANCELED",
            terminatedAt: new Date(),
            terminatedById: session.sub,
            terminationReason: reason,
          },
        });
        // 모든 활성 장비 회수
        await tx.itContractEquipment.updateMany({
          where: { itContractId: id, removedAt: null },
          data: { removedAt: endDate },
        });
        // 종료일 이후 월의 DRAFT 매출 삭제
        await tx.sales.deleteMany({
          where: { itContractId: id, isDraft: true, billingMonth: { gt: endDate } },
        });
      });

      return ok({ ok: true });
    } catch (err) {
      return serverError(err);
    }
  });
}
