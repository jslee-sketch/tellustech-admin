import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isRecordNotFoundError,
  isUniqueConstraintError,
  notFound,
  ok,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string; eqId: string }> };

function parseDateOrUndefined(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  const s = trimNonEmpty(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseDecimalOrUndefined(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n.toFixed(2);
}

function parseIntOrUndefined(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return undefined;
  return n;
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id: contractId, eqId } = await context.params;
    const existing = await prisma.itContractEquipment.findUnique({ where: { id: eqId } });
    if (!existing || existing.itContractId !== contractId) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const data: Record<string, unknown> = {};

      if (p.serialNumber !== undefined) data.serialNumber = requireString(p.serialNumber, "serialNumber");
      if (p.modelName !== undefined) data.modelName = trimNonEmpty(p.modelName);
      if (p.manufacturer !== undefined) data.manufacturer = trimNonEmpty(p.manufacturer);
      if (p.installedAt !== undefined) data.installedAt = parseDateOrUndefined(p.installedAt);
      if (p.removedAt !== undefined) data.removedAt = parseDateOrUndefined(p.removedAt);
      if (p.monthlyBaseFee !== undefined) data.monthlyBaseFee = parseDecimalOrUndefined(p.monthlyBaseFee);
      if (p.bwIncludedPages !== undefined) data.bwIncludedPages = parseIntOrUndefined(p.bwIncludedPages);
      if (p.bwOverageRate !== undefined) data.bwOverageRate = parseDecimalOrUndefined(p.bwOverageRate);
      if (p.colorIncludedPages !== undefined) data.colorIncludedPages = parseIntOrUndefined(p.colorIncludedPages);
      if (p.colorOverageRate !== undefined) data.colorOverageRate = parseDecimalOrUndefined(p.colorOverageRate);
      if (p.note !== undefined) data.note = trimNonEmpty(p.note);
      // 소모품 적정율 — 고객별 실제 상밀도 (1~100, 기본 5)
      if (p.actualCoverage !== undefined) {
        if (p.actualCoverage === null || p.actualCoverage === "") {
          data.actualCoverage = null;
        } else {
          const n = Number(p.actualCoverage);
          if (!Number.isInteger(n) || n < 1 || n > 100) return badRequest("invalid_input", { field: "actualCoverage" });
          data.actualCoverage = n;
        }
      }

      if (Object.keys(data).length === 0) return ok({ equipment: existing });

      const updated = await prisma.itContractEquipment.update({ where: { id: eqId }, data });
      return ok({ equipment: updated });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) {
        return conflict("duplicate_sn", { message: "이 계약에 이미 등록된 S/N 입니다." });
      }
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}

export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id: contractId, eqId } = await context.params;
    const existing = await prisma.itContractEquipment.findUnique({ where: { id: eqId } });
    if (!existing || existing.itContractId !== contractId) return notFound();

    try {
      await prisma.itContractEquipment.delete({ where: { id: eqId } });
      return ok({ ok: true });
    } catch (err) {
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
