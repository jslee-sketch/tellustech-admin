import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  forbidden,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";

// 급여 명세 (Payroll) 기본 CRUD — Phase 4 베이스.
// netPay = baseSalary + allowances - deductions 자동 계산.
// month: YYYY-MM-01 강제(첫째 날 anchor).

function monthAnchor(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isInteger(y) || !Number.isInteger(mo) || mo < 1 || mo > 12) return null;
  return new Date(Date.UTC(y, mo - 1, 1));
}

function parseDecimalOrZero(v: unknown): string {
  if (v === null || v === undefined || v === "") return "0";
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return "0";
  return n.toFixed(2);
}

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const employeeId = trimNonEmpty(url.searchParams.get("employee"));
    const month = trimNonEmpty(url.searchParams.get("month")); // YYYY-MM
    const where = {
      companyCode: session.companyCode,
      ...(employeeId ? { employeeId } : {}),
      ...(month ? { month: monthAnchor(month) ?? undefined } : {}),
    };
    const rows = await prisma.payroll.findMany({
      where,
      orderBy: [{ month: "desc" }, { employeeId: "asc" }],
      take: 500,
      include: { employee: { select: { employeeCode: true, nameVi: true } } },
    });
    return ok({ payrolls: rows });
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

      const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, companyCode: true, salary: true } });
      if (!emp) return badRequest("invalid_employee");
      if (emp.companyCode !== session.companyCode) return forbidden();

      const baseSalary = parseDecimalOrZero(p.baseSalary ?? emp.salary ?? 0);
      const allowances = parseDecimalOrZero(p.allowances);
      const deductions = parseDecimalOrZero(p.deductions);
      const netPay = (Number(baseSalary) + Number(allowances) - Number(deductions)).toFixed(2);

      const created = await prisma.payroll.create({
        data: {
          companyCode: session.companyCode,
          employeeId,
          month,
          baseSalary,
          allowances,
          deductions,
          netPay,
        },
      });
      return ok({ payroll: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      if (isUniqueConstraintError(err)) return conflict("duplicate_month");
      return serverError(err);
    }
  });
}
