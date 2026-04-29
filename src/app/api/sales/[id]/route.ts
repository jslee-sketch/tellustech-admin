import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isForeignKeyError,
  isRecordNotFoundError,
  notFound,
  ok,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { canEdit } from "@/lib/record-policy";

// GET / PATCH / DELETE 단건
// DELETE: PayableReceivable 먼저 삭제 후 Sales 삭제(트랜잭션).
//         SalesItem 은 onDelete: Cascade 로 자동 제거.

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
    const sales = await prisma.sales.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, clientCode: true, companyNameVi: true, paymentTerms: true, receivableStatus: true } },
        project: { select: { id: true, projectCode: true, name: true } },
        items: { orderBy: { createdAt: "asc" } },
        receivables: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!sales) return notFound();
    return ok({ sales });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const existing = await prisma.sales.findUnique({ where: { id } });
    if (!existing) return notFound();
    const verdict = canEdit(existing);
    if (!verdict.allowed) return conflict(verdict.reason);
    // 재경 CFM 후엔 일반 PATCH 차단 (ADMIN 이 finance-confirm DELETE 후 재수정).
    if (existing.financeConfirmedAt) return conflict("finance_confirmed");

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

      // clientId 변경은 지원하지 않음 (전표 재발급이 바람직) — Phase 2 범위 밖.

      if (Object.keys(data).length === 0) return ok({ sales: existing });

      const updated = await prisma.sales.update({ where: { id }, data });
      return ok({ sales: updated });
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
        await tx.payableReceivable.deleteMany({ where: { salesId: id } });
        await tx.sales.delete({ where: { id } });
      });
      return ok({ ok: true });
    } catch (err) {
      if (isForeignKeyError(err)) {
        return badRequest("has_dependent_rows", {
          message: "이 매출에 연결된 다른 이력이 있어 삭제할 수 없습니다.",
        });
      }
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
