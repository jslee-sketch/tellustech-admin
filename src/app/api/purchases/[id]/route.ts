import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  handleFieldError,
  isForeignKeyError,
  isRecordNotFoundError,
  notFound,
  ok,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

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
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, clientCode: true, companyNameVi: true, paymentTerms: true } },
        project: { select: { id: true, projectCode: true, name: true } },
        items: { orderBy: { createdAt: "asc" } },
        payables: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!purchase) return notFound();
    return ok({ purchase });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const existing = await prisma.purchase.findUnique({ where: { id } });
    if (!existing) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const data: Record<string, unknown> = {};
      if (p.salesEmployeeId !== undefined) {
        const eid = trimNonEmpty(p.salesEmployeeId);
        if (eid) {
          const e = await prisma.employee.findUnique({ where: { id: eid } });
          if (!e) return badRequest("invalid_sales_employee");
          data.salesEmployeeId = eid;
        } else {
          data.salesEmployeeId = null;
        }
      }
      if (p.projectId !== undefined) {
        const pid = trimNonEmpty(p.projectId);
        if (pid) {
          const pr = await prisma.project.findUnique({ where: { id: pid } });
          if (!pr) return badRequest("invalid_project");
          data.projectId = pid;
        } else {
          data.projectId = null;
        }
      }
      if (p.usagePeriodStart !== undefined) data.usagePeriodStart = parseDateOrUndefined(p.usagePeriodStart);
      if (p.usagePeriodEnd !== undefined) data.usagePeriodEnd = parseDateOrUndefined(p.usagePeriodEnd);
      if (p.note !== undefined) data.note = trimNonEmpty(p.note);
      if (p.warehouseInboundDone !== undefined) data.warehouseInboundDone = Boolean(p.warehouseInboundDone);

      if (Object.keys(data).length === 0) return ok({ purchase: existing });

      const updated = await prisma.purchase.update({ where: { id }, data });
      return ok({ purchase: updated });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}

export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.payableReceivable.deleteMany({ where: { purchaseId: id } });
        await tx.purchase.delete({ where: { id } });
      });
      return ok({ ok: true });
    } catch (err) {
      if (isForeignKeyError(err)) {
        return badRequest("has_dependent_rows", {
          message: "이 매입에 연결된 다른 이력이 있어 삭제할 수 없습니다.",
        });
      }
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
