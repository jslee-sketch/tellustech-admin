import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  forbidden,
  handleFieldError,
  ok,
  optionalEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";

// 인센티브(Incentive) 기본 CRUD — 출처(source) IT/TM 만 허용.
// 자동 산정 로직(매출 → 인센티브)은 별도 cron 으로 추후 추가.

const SOURCES = ["TM", "IT"] as const;

function monthAnchor(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
}

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const employeeId = trimNonEmpty(url.searchParams.get("employee"));
    const month = trimNonEmpty(url.searchParams.get("month"));
    const where = {
      companyCode: session.companyCode,
      ...(employeeId ? { employeeId } : {}),
      ...(month ? { month: monthAnchor(month) ?? undefined } : {}),
    };
    const rows = await prisma.incentive.findMany({
      where,
      orderBy: [{ month: "desc" }, { employeeId: "asc" }],
      take: 500,
      include: { employee: { select: { employeeCode: true, nameVi: true } } },
    });
    return ok({ incentives: rows });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (!["ADMIN", "MANAGER", "HR"].includes(session.role)) return forbidden();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const employeeId = requireString(p.employeeId, "employeeId");
      const monthStr = requireString(p.month, "month");
      const month = monthAnchor(monthStr);
      if (!month) return badRequest("invalid_input", { field: "month" });
      const source = optionalEnum(p.source, SOURCES);
      if (!source) return badRequest("invalid_input", { field: "source" });
      const amountNum = Number(p.amount ?? 0);
      if (!Number.isFinite(amountNum) || amountNum < 0) return badRequest("invalid_input", { field: "amount" });

      const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { companyCode: true } });
      if (!emp) return badRequest("invalid_employee");
      if (emp.companyCode !== session.companyCode) return forbidden();

      const created = await prisma.incentive.create({
        data: {
          companyCode: session.companyCode,
          employeeId,
          month,
          source,
          amount: amountNum.toFixed(2),
          note: trimNonEmpty(p.note),
        },
      });
      return ok({ incentive: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      return serverError(err);
    }
  });
}
