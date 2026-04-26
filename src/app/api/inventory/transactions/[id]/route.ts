import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, isRecordNotFoundError, notFound, ok, serverError, trimNonEmpty } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const t = await prisma.inventoryTransaction.findUnique({
      where: { id },
      include: {
        item: { select: { itemCode: true, name: true } },
        fromWarehouse: { select: { code: true, name: true, warehouseType: true } },
        toWarehouse: { select: { code: true, name: true, warehouseType: true } },
        client: { select: { clientCode: true, companyNameVi: true } },
      },
    });
    if (!t) return notFound();
    return ok({ transaction: t });
  });
}

// PATCH — 정정용. note / targetEquipmentSN / targetContractId 만 수정 허용.
// 수량/창고/유형/사유는 후행 정정 불가 (감사 무결성). 잘못 입력시 DELETE 후 재등록.
export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const existing = await prisma.inventoryTransaction.findUnique({ where: { id } });
    if (!existing) return notFound();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (p.note !== undefined) data.note = trimNonEmpty(p.note);
    if (p.targetEquipmentSN !== undefined) data.targetEquipmentSN = trimNonEmpty(p.targetEquipmentSN);
    if (p.targetContractId !== undefined) data.targetContractId = trimNonEmpty(p.targetContractId);
    if (Object.keys(data).length === 0) return ok({ transaction: existing });
    try {
      const updated = await prisma.inventoryTransaction.update({ where: { id }, data });
      return ok({ transaction: updated });
    } catch (err) {
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}

export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    try {
      await prisma.inventoryTransaction.delete({ where: { id } });
      return ok({ ok: true });
    } catch (err) {
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
