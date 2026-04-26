import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  optionalEnum,
  requireEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import type { BacklogStatus, Currency, WeeklySalesType } from "@/generated/prisma/client";

const SALES_TYPES: readonly WeeklySalesType[] = ["SALES", "PURCHASE"] as const;
const STATUSES: readonly BacklogStatus[] = ["OPEN", "CLOSE", "NG"] as const;
const CURRENCIES: readonly Currency[] = ["VND", "USD", "KRW", "JPY", "CNY"] as const;

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

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const status = optionalEnum(url.searchParams.get("status"), STATUSES);
    const fromStr = trimNonEmpty(url.searchParams.get("from"));
    const toStr = trimNonEmpty(url.searchParams.get("to"));

    const where = {
      companyCode: session.companyCode,
      ...(status ? { status } : {}),
      ...(fromStr || toStr
        ? {
            registeredAt: {
              ...(fromStr ? { gte: new Date(fromStr) } : {}),
              ...(toStr ? { lte: new Date(new Date(toStr).setHours(23, 59, 59, 999)) } : {}),
            },
          }
        : {}),
    };

    const backlogs = await prisma.weeklyBacklog.findMany({
      where,
      orderBy: { registeredAt: "desc" },
      take: 500,
      include: {
        client: { select: { clientCode: true, companyNameVi: true } },
        salesEmployee: { select: { employeeCode: true, nameVi: true } },
        histories: { orderBy: { date: "desc" }, take: 5 },
      },
    });
    return ok({ backlogs });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const clientId = requireString(p.clientId, "clientId");
      const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
      if (!client) return badRequest("invalid_client");

      const salesType = requireEnum(p.salesType, SALES_TYPES, "salesType");

      const salesEmployeeId = trimNonEmpty(p.salesEmployeeId);
      if (salesEmployeeId) {
        const e = await prisma.employee.findUnique({ where: { id: salesEmployeeId }, select: { companyCode: true } });
        if (!e) return badRequest("invalid_sales_employee");
      }

      const status = optionalEnum(p.status, STATUSES) ?? "OPEN";
      const currency = optionalEnum(p.currency, CURRENCIES) ?? "VND";
      const fxRateNum = Number(p.fxRate ?? 1);
      const fxRate = Number.isFinite(fxRateNum) && fxRateNum > 0 ? fxRateNum.toFixed(6) : "1";

      const created = await withUniqueRetry(
        async () => {
          const backlogCode = await generateDatedCode({
            prefix: "BL",
            lookupLast: async (fp) => {
              const last = await prisma.weeklyBacklog.findFirst({
                where: { backlogCode: { startsWith: fp } },
                orderBy: { backlogCode: "desc" },
                select: { backlogCode: true },
              });
              return last?.backlogCode ?? null;
            },
          });
          return prisma.weeklyBacklog.create({
            data: {
              companyCode: session.companyCode,
              backlogCode,
              salesType,
              clientId,
              salesEmployeeId: salesEmployeeId ?? null,
              representativeItem: trimNonEmpty(p.representativeItem),
              amount: parseDecimalOrNull(p.amount),
              currency,
              fxRate,
              status,
              expectedCloseDate: parseDateOrNull(p.expectedCloseDate),
            },
          });
        },
        { isConflict: isUniqueConstraintError },
      );
      return ok({ backlog: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
