import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// 소프트 삭제된 행 복구. ADMIN/MANAGER 전용.
// POST /api/admin/restore/[model]/[id] → deletedAt = null

const RESTORABLE = new Set([
  "Client", "Item", "Warehouse", "Employee", "Department", "License", "Project",
  "Sales", "Purchase", "ItContract", "TmRental", "AsTicket", "AsDispatch",
  "Expense", "Payroll", "Incentive", "LeaveRecord", "OnboardingCard",
  "OffboardingCard", "Incident", "Evaluation", "CalendarEvent", "Schedule",
  "Calibration", "PayableReceivable",
]);

type RouteContext = { params: Promise<{ model: string; id: string }> };

export async function POST(_r: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return badRequest("forbidden");
    const { model, id } = await context.params;
    if (!RESTORABLE.has(model)) return badRequest("invalid_model");
    const key = model.charAt(0).toLowerCase() + model.slice(1);
    const delegate = (prisma as unknown as Record<string, { update: (a: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> }>)[key];
    if (!delegate?.update) return badRequest("no_delegate");
    try {
      await delegate.update({ where: { id }, data: { deletedAt: null } });
      return ok({ ok: true, restored: true });
    } catch (err) { return serverError(err); }
  });
}
