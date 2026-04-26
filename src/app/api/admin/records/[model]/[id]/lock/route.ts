import { withSessionContext } from "@/lib/session";
import { badRequest, conflict, ok, requireString, serverError } from "@/lib/api-utils";
import { lockOne, unlockOne } from "@/lib/api/crud";

// 공통 잠금/해제 라우트.
// POST /api/admin/records/[model]/[id]/lock     body: { reason: string }
// DELETE /api/admin/records/[model]/[id]/lock    → unlock
//
// model 파라미터는 Prisma 모델명(PascalCase). 화이트리스트 검증 — 미허용 모델은 거절.

const LOCKABLE = new Set([
  "Sales", "Purchase", "ItContract", "TmRental", "AsTicket", "AsDispatch",
  "Expense", "Payroll", "Incentive", "LeaveRecord", "Incident", "Evaluation",
  "PayableReceivable", "CalendarEvent", "Schedule", "Calibration",
  "OnboardingCard", "OffboardingCard",
  "Employee", // 퇴사 후 잠금
]);

type RouteContext = { params: Promise<{ model: string; id: string }> };

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") {
      return badRequest("forbidden");
    }
    const { model, id } = await context.params;
    if (!LOCKABLE.has(model)) return badRequest("invalid_model");
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const reason = requireString(p.reason, "reason");
      const result = await lockOne(model, id, reason);
      if (!result.ok) return conflict(result.reason);
      return ok({ ok: true, locked: true });
    } catch (err) {
      return serverError(err);
    }
  });
}

export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") {
      return badRequest("forbidden");
    }
    const { model, id } = await context.params;
    if (!LOCKABLE.has(model)) return badRequest("invalid_model");
    try {
      const result = await unlockOne(model, id);
      if (!result.ok) return conflict(result.reason);
      return ok({ ok: true, locked: false });
    } catch (err) {
      return serverError(err);
    }
  });
}
