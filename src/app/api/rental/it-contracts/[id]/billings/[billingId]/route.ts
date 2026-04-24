import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  handleFieldError,
  isRecordNotFoundError,
  notFound,
  ok,
  optionalEnum,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { computeBillingAmount, deriveUsage } from "@/lib/billing-calc";
import type { BillingMethod } from "@/generated/prisma/client";

const METHODS: readonly BillingMethod[] = ["SNMP", "MANUAL", "PHOTO"] as const;

type RouteContext = { params: Promise<{ id: string; billingId: string }> };

function parseIntOrUndefined(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return undefined;
  return n;
}

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id, billingId } = await context.params;
    const billing = await prisma.itMonthlyBilling.findUnique({ where: { id: billingId } });
    if (!billing || billing.itContractId !== id) return notFound();
    return ok({ billing });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id, billingId } = await context.params;
    const existing = await prisma.itMonthlyBilling.findUnique({ where: { id: billingId } });
    if (!existing || existing.itContractId !== id) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const data: Record<string, unknown> = {};
      if (p.billingMethod !== undefined) {
        const m = optionalEnum(p.billingMethod, METHODS);
        if (!m) return badRequest("invalid_input", { field: "billingMethod" });
        data.billingMethod = m;
      }
      if (p.photoUrl !== undefined) data.photoUrl = trimNonEmpty(p.photoUrl);
      if (p.customerSignature !== undefined) data.customerSignature = trimNonEmpty(p.customerSignature);
      if (p.yieldVerified !== undefined) data.yieldVerified = Boolean(p.yieldVerified);

      let counterBw: number | null = existing.counterBw;
      let counterColor: number | null = existing.counterColor;
      let recalc = false;

      if (p.counterBw !== undefined) {
        const v = parseIntOrUndefined(p.counterBw);
        if (v === undefined) return badRequest("invalid_input", { field: "counterBw" });
        counterBw = v;
        data.counterBw = v;
        recalc = true;
      }
      if (p.counterColor !== undefined) {
        const v = parseIntOrUndefined(p.counterColor);
        if (v === undefined) return badRequest("invalid_input", { field: "counterColor" });
        counterColor = v;
        data.counterColor = v;
        recalc = true;
      }

      // 카운터 변경되면 과금액 재산정
      if (recalc) {
        const equipment = await prisma.itContractEquipment.findUnique({
          where: {
            itContractId_serialNumber: {
              itContractId: id,
              serialNumber: existing.serialNumber,
            },
          },
        });
        if (equipment) {
          const { bwUsage, colorUsage } = await deriveUsage(
            id,
            existing.serialNumber,
            existing.billingMonth,
            counterBw,
            counterColor,
            billingId,
          );
          const calc = computeBillingAmount({
            monthlyBaseFee: Number(equipment.monthlyBaseFee ?? 0),
            bwIncludedPages: equipment.bwIncludedPages ?? 0,
            bwOverageRate: Number(equipment.bwOverageRate ?? 0),
            colorIncludedPages: equipment.colorIncludedPages ?? 0,
            colorOverageRate: Number(equipment.colorOverageRate ?? 0),
            bwUsage,
            colorUsage,
          });
          data.computedAmount = calc.total;
        }
      }

      if (Object.keys(data).length === 0) return ok({ billing: existing });
      const updated = await prisma.itMonthlyBilling.update({ where: { id: billingId }, data });
      return ok({ billing: updated });
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
    const { id, billingId } = await context.params;
    const existing = await prisma.itMonthlyBilling.findUnique({ where: { id: billingId } });
    if (!existing || existing.itContractId !== id) return notFound();
    try {
      await prisma.itMonthlyBilling.delete({ where: { id: billingId } });
      return ok({ ok: true });
    } catch (err) {
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
