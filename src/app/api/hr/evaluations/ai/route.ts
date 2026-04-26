import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, conflict, forbidden, isUniqueConstraintError, ok, requireString, serverError } from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { generateEvaluationReport, analyzeBiasRisk } from "@/lib/ai-evaluation";

// POST /api/hr/evaluations/ai
// body: { employeeId: "..." , persist?: boolean (default true) }
// — 해당 직원의 AI 종합 평가 실행. 결과는 Evaluation 테이블에 저장(EVAL-YYMMDD-### 코드 자동 발급).
// 권한: ADMIN, MANAGER, HR 만
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (!["ADMIN", "MANAGER", "HR"].includes(session.role)) return forbidden();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;

    try {
      const employeeId = requireString(p.employeeId, "employeeId");
      const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, companyCode: true } });
      if (!emp) return badRequest("invalid_employee");
      if (emp.companyCode !== session.companyCode) return forbidden();

      const persist = p.persist === false ? false : true;
      const report = await generateEvaluationReport(employeeId, session.companyCode);

      let evaluation = null;
      if (persist) {
        const b = report.finalScore.breakdown;
        evaluation = await withUniqueRetry(
          async () => {
            const evaluationCode = await generateDatedCode({
              prefix: "EVAL",
              lookupLast: async (fullPrefix) => {
                const last = await prisma.evaluation.findFirst({
                  where: { evaluationCode: { startsWith: fullPrefix } },
                  orderBy: { evaluationCode: "desc" },
                  select: { evaluationCode: true },
                });
                return last?.evaluationCode ?? null;
              },
            });
            return prisma.evaluation.create({
              data: {
                companyCode: session.companyCode,
                evaluationCode,
                subjectId: employeeId,
                period: report.generatedAt,
                scoreAsTat: b.asTat?.score?.toFixed(2),
                scoreDispatchEff: b.dispatch?.score?.toFixed(2),
                scoreSalesContrib: b.sales?.score?.toFixed(2),
                scoreErpInputSpeed: b.erpSpeed?.score?.toFixed(2),
                scoreErpDeadline: b.erpDeadline?.score?.toFixed(2),
                scoreErpMastery: b.erpMastery?.score?.toFixed(2),
                scoreAttendance: b.attendance?.score?.toFixed(2),
                scorePeer: b.peer?.score?.toFixed(2),
                scoreIncident: b.incident?.score?.toFixed(2),
                reasonsJson: {
                  incident: report.incidentAnalysis,
                  erpMetrics: report.erpMetrics,
                  peerScore: report.peerScore,
                  biasWarnings: report.biasWarnings,
                  breakdown: report.finalScore.breakdown,
                },
                totalScore: report.finalScore.total.toFixed(2),
                totalReason: report.incidentAnalysis.patternSummary || null,
                grade: report.finalScore.grade,
              },
            });
          },
          { isConflict: isUniqueConstraintError },
        );
      }

      return ok({ report, evaluation, apiKeyPresent: !!process.env.ANTHROPIC_API_KEY }, { status: persist ? 201 : 200 });
    } catch (err) {
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
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
