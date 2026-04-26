import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  notFound,
  ok,
  optionalEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { computeBillingAmount, deriveUsage, sumPriceChangeDelta } from "@/lib/billing-calc";
import type { BillingMethod } from "@/generated/prisma/client";

// IT 월별 사용량 컨펌
// POST body: { serialNumber, billingMonth: "YYYY-MM", counterBw, counterColor,
//             billingMethod, photoUrl?, customerSignature?, yieldVerified? }
// 서버가 이전 달 카운터와 delta 하여 사용량·과금을 자동 계산해 computedAmount 저장.

const METHODS: readonly BillingMethod[] = ["SNMP", "MANUAL", "PHOTO"] as const;

type RouteContext = { params: Promise<{ id: string }> };

function parseMonth(value: unknown): Date | null {
  const s = trimNonEmpty(value);
  if (!s) return null;
  // "YYYY-MM" 또는 "YYYY-MM-DD" 입력 수용. UTC 월 첫째 날로 정규화.
  const match = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

function parseIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

export async function GET(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const contract = await prisma.itContract.findUnique({ where: { id }, select: { id: true } });
    if (!contract) return notFound();

    const url = new URL(request.url);
    const monthParam = trimNonEmpty(url.searchParams.get("month"));

    const where = {
      itContractId: id,
      ...(monthParam ? (() => {
        const m = parseMonth(monthParam);
        return m ? { billingMonth: m } : {};
      })() : {}),
    };

    const billings = await prisma.itMonthlyBilling.findMany({
      where,
      orderBy: [{ billingMonth: "desc" }, { serialNumber: "asc" }],
      take: 500,
    });
    return ok({ billings });
  });
}

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const contract = await prisma.itContract.findUnique({ where: { id }, select: { id: true } });
    if (!contract) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const serialNumber = requireString(p.serialNumber, "serialNumber");
      const billingMonth = parseMonth(p.billingMonth);
      if (!billingMonth) return badRequest("invalid_input", { field: "billingMonth" });

      const equipment = await prisma.itContractEquipment.findUnique({
        where: { itContractId_serialNumber: { itContractId: id, serialNumber } },
      });
      if (!equipment) return badRequest("invalid_equipment", { message: "해당 S/N 이 계약 장비 목록에 없습니다." });

      const counterBw = parseIntOrNull(p.counterBw);
      const counterColor = parseIntOrNull(p.counterColor);
      const billingMethod = optionalEnum(p.billingMethod, METHODS) ?? "MANUAL";

      // delta 기반 사용량 → 과금액 자동 계산
      const { bwUsage, colorUsage } = await deriveUsage(id, serialNumber, billingMonth, counterBw, counterColor);
      const calc = computeBillingAmount({
        monthlyBaseFee: Number(equipment.monthlyBaseFee ?? 0),
        bwIncludedPages: equipment.bwIncludedPages ?? 0,
        bwOverageRate: Number(equipment.bwOverageRate ?? 0),
        colorIncludedPages: equipment.colorIncludedPages ?? 0,
        colorOverageRate: Number(equipment.colorOverageRate ?? 0),
        bwUsage,
        colorUsage,
      });
      // PRICE_CHANGE Amendment 의 monthlyDelta 합산. 다중 S/N 행이 있으면 첫 행에만 가산하지 않고
      // 각 S/N 별 빌링은 그 S/N 의 base + overage. 계약 전체 PRICE_CHANGE 는 첫 빌링에만 한 번 가산되도록
      // 단순 분할이 어려우므로 totalAmount 에 그대로 더해 노출(운영자가 인지 가능).
      const priceDelta = await sumPriceChangeDelta(id, billingMonth);
      const totalWithDelta = (Number(calc.total) + priceDelta).toFixed(2);

      const created = await prisma.itMonthlyBilling.create({
        data: {
          itContractId: id,
          serialNumber,
          billingMonth,
          counterBw,
          counterColor,
          billingMethod,
          photoUrl: trimNonEmpty(p.photoUrl),
          customerSignature: trimNonEmpty(p.customerSignature),
          yieldVerified: Boolean(p.yieldVerified),
          computedAmount: totalWithDelta,
        },
      });
      return ok({ billing: created, calc }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) {
        return conflict("duplicate_billing", { message: "이 S/N 의 같은 월 청구가 이미 존재합니다." });
      }
      return serverError(err);
    }
  });
}
