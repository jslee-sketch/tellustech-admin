import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  forbidden,
  handleFieldError,
  isRecordNotFoundError,
  notFound,
  ok,
  optionalEnum,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import type { BacklogStatus, Currency, WeeklySalesType } from "@/generated/prisma/client";

const SALES_TYPES: readonly WeeklySalesType[] = ["SALES", "PURCHASE"] as const;
const STATUSES: readonly BacklogStatus[] = ["OPEN", "CLOSE", "NG"] as const;
const CURRENCIES: readonly Currency[] = ["VND", "USD", "KRW", "JPY", "CNY"] as const;

type RouteContext = { params: Promise<{ id: string }> };

function parseDateOrNull(value: unknown): Date | null {
  const s = trimNonEmpty(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDecimalOrNull(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

export async function GET(_req: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const b = await prisma.weeklyBacklog.findUnique({
      where: { id },
      include: {
        client: { select: { clientCode: true, companyNameVi: true } },
        salesEmployee: { select: { employeeCode: true, nameVi: true } },
        histories: { orderBy: { date: "desc" } },
      },
    });
    if (!b || b.companyCode !== session.companyCode) return notFound();
    return ok({ backlog: b });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const existing = await prisma.weeklyBacklog.findUnique({ where: { id } });
    if (!existing || existing.companyCode !== session.companyCode) return notFound();

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;

    try {
      const data: Record<string, unknown> = {};
      if (p.salesType !== undefined) {
        const st = optionalEnum(p.salesType, SALES_TYPES);
        if (!st) return badRequest("invalid_input", { field: "salesType" });
        data.salesType = st;
      }
      if (p.status !== undefined) {
        const s = optionalEnum(p.status, STATUSES);
        if (!s) return badRequest("invalid_input", { field: "status" });
        data.status = s;
      }
      if (p.currency !== undefined) {
        const c = optionalEnum(p.currency, CURRENCIES);
        if (!c) return badRequest("invalid_input", { field: "currency" });
        data.currency = c;
      }
      if (p.salesEmployeeId !== undefined) data.salesEmployeeId = trimNonEmpty(p.salesEmployeeId);
      if (p.representativeItem !== undefined) data.representativeItem = trimNonEmpty(p.representativeItem);
      if (p.amount !== undefined) data.amount = parseDecimalOrNull(p.amount);
      if (p.fxRate !== undefined) {
        const n = Number(p.fxRate);
        data.fxRate = Number.isFinite(n) && n > 0 ? n.toFixed(6) : "1";
      }
      if (p.expectedCloseDate !== undefined) data.expectedCloseDate = parseDateOrNull(p.expectedCloseDate);

      const updated = await prisma.weeklyBacklog.update({ where: { id }, data });
      return ok({ backlog: updated });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}

export async function DELETE(_req: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    if (!["ADMIN", "MANAGER"].includes(session.role)) return forbidden();
    const { id } = await context.params;
    const b = await prisma.weeklyBacklog.findUnique({ where: { id } });
    if (!b || b.companyCode !== session.companyCode) return notFound();
    await prisma.weeklyBacklog.delete({ where: { id } });
    return ok({ ok: true });
  });
}
