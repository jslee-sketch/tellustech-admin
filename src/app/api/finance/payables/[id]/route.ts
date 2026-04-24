import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, handleFieldError, isRecordNotFoundError, notFound, ok, optionalEnum, serverError, trimNonEmpty } from "@/lib/api-utils";
import type { PayableReceivableStatus } from "@/generated/prisma/client";

const STATUSES: readonly PayableReceivableStatus[] = ["OPEN", "PARTIAL", "PAID", "WRITTEN_OFF"] as const;

type RouteContext = { params: Promise<{ id: string }> };

function parseDecimalOrUndefined(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n.toFixed(2);
}

function parseDateOrUndefined(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  const s = trimNonEmpty(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const pr = await prisma.payableReceivable.findUnique({
      where: { id },
      include: {
        sales: { select: { salesNumber: true, client: { select: { clientCode: true, companyNameVi: true } } } },
        purchase: { select: { purchaseNumber: true, supplier: { select: { clientCode: true, companyNameVi: true } } } },
        expense: { select: { expenseCode: true } },
        delayReasons: { orderBy: { recordedAt: "desc" } },
      },
    });
    if (!pr) return notFound();
    return ok({ pr });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const existing = await prisma.payableReceivable.findUnique({ where: { id } });
    if (!existing) return notFound();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const data: Record<string, unknown> = {};
      if (p.paidAmount !== undefined) {
        const v = parseDecimalOrUndefined(p.paidAmount);
        if (v === undefined) return badRequest("invalid_input", { field: "paidAmount" });
        data.paidAmount = v;
        // status 자동 전환: full → PAID, partial → PARTIAL, zero → OPEN (사용자 명시 status 가 없을 때)
        if (p.status === undefined) {
          const paid = Number(v ?? 0);
          const total = Number(existing.amount);
          data.status = paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "OPEN";
        }
      }
      if (p.status !== undefined) {
        const s = optionalEnum(p.status, STATUSES);
        if (!s) return badRequest("invalid_input", { field: "status" });
        data.status = s;
      }
      if (p.dueDate !== undefined) data.dueDate = parseDateOrUndefined(p.dueDate);
      if (Object.keys(data).length === 0) return ok({ pr: existing });
      const updated = await prisma.payableReceivable.update({ where: { id }, data });
      return ok({ pr: updated });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
