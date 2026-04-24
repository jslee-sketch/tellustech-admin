import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  companyScope,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  requireEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { buildDepreciationSchedule } from "@/lib/depreciation";
import type { DepreciationMethod } from "@/generated/prisma/client";

const METHODS: readonly DepreciationMethod[] = ["STRAIGHT_LINE", "DECLINING_BALANCE"] as const;

// 자산 등록 = (S/N, itemId, acquisitionDate, cost, method, usefulLifeMonths) → N 개월 스케줄 생성
// 같은 (company, S/N, month) 는 유니크라 재등록 시 중복 에러.

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const serialNumber = trimNonEmpty(url.searchParams.get("sn"));
    const month = trimNonEmpty(url.searchParams.get("month"));

    const where = {
      ...companyScope(session),
      ...(serialNumber ? { serialNumber } : {}),
      ...(month
        ? (() => {
            const match = month.match(/^(\d{4})-(\d{2})/);
            if (!match) return {};
            const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
            return { month: d };
          })()
        : {}),
    };

    const rows = await prisma.assetDepreciation.findMany({
      where,
      orderBy: [{ serialNumber: "asc" }, { month: "asc" }],
      take: 2000,
      include: { item: { select: { itemCode: true, name: true } } },
    });
    return ok({ depreciations: rows });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const itemId = requireString(p.itemId, "itemId");
      const serialNumber = requireString(p.serialNumber, "serialNumber");
      const method = requireEnum(p.method, METHODS, "method");

      const acqStr = trimNonEmpty(p.acquisitionDate);
      if (!acqStr) return badRequest("invalid_input", { field: "acquisitionDate" });
      const acquisitionDate = new Date(acqStr);
      if (Number.isNaN(acquisitionDate.getTime())) return badRequest("invalid_input", { field: "acquisitionDate" });

      const cost = Number(p.acquisitionCost);
      if (!Number.isFinite(cost) || cost <= 0) return badRequest("invalid_input", { field: "acquisitionCost" });

      const life = Number(p.usefulLifeMonths);
      if (!Number.isInteger(life) || life <= 0 || life > 600) {
        return badRequest("invalid_input", { field: "usefulLifeMonths" });
      }

      const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
      if (!item) return badRequest("invalid_item");

      const schedule = buildDepreciationSchedule(acquisitionDate, cost, method, life);
      await prisma.assetDepreciation.createMany({
        data: schedule.map((row) => ({
          companyCode: session.companyCode,
          itemId,
          serialNumber,
          acquisitionDate,
          acquisitionCost: cost.toFixed(2),
          method,
          usefulLifeMonths: life,
          month: row.month,
          depreciationAmount: row.depreciationAmount,
          bookValue: row.bookValue,
        })),
      });

      return ok({ created: schedule.length, serialNumber }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) {
        return conflict("duplicate", { message: "이미 등록된 자산(S/N)의 스케줄이 존재합니다." });
      }
      return serverError(err);
    }
  });
}
