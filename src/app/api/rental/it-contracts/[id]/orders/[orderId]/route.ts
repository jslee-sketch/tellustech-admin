import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isRecordNotFoundError,
  notFound,
  ok,
  serverError,
} from "@/lib/api-utils";

// PATCH / DELETE 개별 렌탈 오더
// - editable=false 인 오더는 수정/삭제 불가 (관리자 전용 플로우는 후속)
// - amount, canceled 업데이트 가능

type RouteContext = { params: Promise<{ id: string; orderId: string }> };

function parseDecimalOrUndefined(value: unknown, min = 0): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) return undefined;
  return n.toFixed(2);
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id: contractId, orderId } = await context.params;
    const existing = await prisma.rentalOrder.findUnique({ where: { id: orderId } });
    if (!existing || existing.itContractId !== contractId) return notFound();
    if (!existing.editable) {
      return conflict("not_editable", { message: "이 오더는 잠겨 있어 수정할 수 없습니다." });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const data: Record<string, unknown> = {};
      if (p.amount !== undefined) {
        const v = parseDecimalOrUndefined(p.amount);
        if (v === undefined || v === null) return badRequest("invalid_input", { field: "amount" });
        data.amount = v;
      }
      if (p.canceled !== undefined) data.canceled = Boolean(p.canceled);
      if (p.editable !== undefined) data.editable = Boolean(p.editable);

      if (Object.keys(data).length === 0) return ok({ order: existing });

      const updated = await prisma.rentalOrder.update({ where: { id: orderId }, data });
      return ok({ order: updated });
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
    const { id: contractId, orderId } = await context.params;
    const existing = await prisma.rentalOrder.findUnique({ where: { id: orderId } });
    if (!existing || existing.itContractId !== contractId) return notFound();
    if (!existing.editable) {
      return conflict("not_editable", { message: "이 오더는 잠겨 있어 삭제할 수 없습니다." });
    }
    try {
      await prisma.rentalOrder.delete({ where: { id: orderId } });
      return ok({ ok: true });
    } catch (err) {
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
