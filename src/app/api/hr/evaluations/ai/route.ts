import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, requireString, serverError } from "@/lib/api-utils";
import { generateEvaluationReport, analyzeBiasRisk, claudeDebug } from "@/lib/ai-evaluation";

// POST /api/hr/evaluations/ai
// body: { employeeId: "..." } — 해당 직원의 AI 종합 평가 실행
// 권한: ADMIN, MANAGER, HR 만
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (!["ADMIN", "MANAGER", "HR"].includes(session.role)) return forbidden();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;

    try {
      const employeeId = requireString(p.employeeId, "employeeId");
      // 존재 확인
      const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, companyCode: true } });
      if (!emp) return badRequest("invalid_employee");
      if (emp.companyCode !== session.companyCode) return forbidden();

      const report = await generateEvaluationReport(employeeId, session.companyCode);
      return ok({
        report,
        apiKeyPresent: !!process.env.ANTHROPIC_API_KEY,
        claudeDebug: { lastError: claudeDebug.lastError, lastStatus: claudeDebug.lastStatus },
      });
    } catch (err) {
      return serverError(err);
    }
  });
}

// GET /api/hr/evaluations/ai?reviewerId=...  — 평가자 편향 분석
export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    if (!["ADMIN", "MANAGER", "HR"].includes(session.role)) return forbidden();
    const url = new URL(request.url);
    const reviewerId = url.searchParams.get("reviewerId");
    if (!reviewerId) return badRequest("reviewerId_required");
    const bias = await analyzeBiasRisk(reviewerId, session.companyCode);
    return ok({ bias, apiKeyPresent: !!process.env.ANTHROPIC_API_KEY });
  });
}
