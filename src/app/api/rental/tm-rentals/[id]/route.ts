import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/record-policy";
import { withSessionContext } from "@/lib/session";
import { badRequest, handleFieldError, isForeignKeyError, isRecordNotFoundError, notFound, ok, serverError, trimNonEmpty, conflict } from "@/lib/api-utils";

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
    const rental = await prisma.tmRental.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            companyNameVi: true,
            paymentTerms: true,
            receivableStatus: true,
          },
        },
        items: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!rental) return notFound();
    return ok({ rental });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const existing = await prisma.tmRental.findUnique({ where: { id } });
    if (!existing) return notFound();

    const _v = canEdit(existing);
    if (!_v.allowed) return conflict(_v.reason);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const data: Record<string, unknown> = {};
      if (p.contractNumber !== undefined) data.contractNumber = trimNonEmpty(p.contractNumber);
      if (p.address !== undefined) data.address = trimNonEmpty(p.address);
      if (p.startDate !== undefined) {
        const d = parseDateOrUndefined(p.startDate);
        if (d === undefined || d === null) return badRequest("invalid_input", { field: "startDate" });
        data.startDate = d;
      }
      if (p.endDate !== undefined) {
        const d = parseDateOrUndefined(p.endDate);
        if (d === undefined || d === null) return badRequest("invalid_input", { field: "endDate" });
        data.endDate = d;
      }

      const mgrFields = [
        "contractMgrName",
        "contractMgrPhone",
        "contractMgrEmail",
        "technicalMgrName",
        "technicalMgrPhone",
        "technicalMgrEmail",
        "financeMgrName",
        "financeMgrPhone",
        "financeMgrEmail",
      ] as const;
      for (const k of mgrFields) {
        if (p[k] !== undefined) data[k] = trimNonEmpty(p[k]);
      }

      if (Object.keys(data).length === 0) return ok({ rental: existing });

      const updated = await prisma.tmRental.update({ where: { id }, data });
      return ok({ rental: updated });
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
      await prisma.tmRental.delete({ where: { id } }); // items cascade
      return ok({ ok: true });
    } catch (err) {
      if (isForeignKeyError(err)) {
        return badRequest("has_dependent_rows", {
          message: "이 TM 렌탈에 연결된 다른 이력이 있어 삭제할 수 없습니다.",
        });
      }
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
