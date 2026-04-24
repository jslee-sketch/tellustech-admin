import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest, conflict, handleFieldError, isUniqueConstraintError, ok,
  requireString, serverError, trimNonEmpty,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";

// 정기 인사평가 CRUD — 관리자가 시작 → 평가자/피평가자 지정 → answersJson 제출.
// 5단계 값: 10/8/6/4/2, 100점 환산.

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const subjectId = trimNonEmpty(url.searchParams.get("subject"));
    const rows = await prisma.regularEvaluation.findMany({
      where: {
        companyCode: session.companyCode,
        ...(subjectId ? { subjectId } : {}),
      },
      orderBy: { createdAt: "desc" }, take: 500,
      include: {
        reviewer: { select: { employeeCode: true, nameVi: true } },
        subject: { select: { employeeCode: true, nameVi: true } },
      },
    });
    return ok({ evaluations: rows });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const reviewerId = requireString(p.reviewerId, "reviewerId");
      const subjectId = requireString(p.subjectId, "subjectId");
      const deadlineStr = requireString(p.deadline, "deadline");
      const deadline = new Date(deadlineStr);
      if (Number.isNaN(deadline.getTime())) return badRequest("invalid_input", { field: "deadline" });

      const answers = p.answersJson && typeof p.answersJson === "object" ? (p.answersJson as Record<string, number>) : {};
      const answerValues = Object.values(answers).filter((v) => typeof v === "number");
      // 100점 환산: (합계 / (질문수 * 10)) * 100
      const normalizedScore = answerValues.length > 0
        ? (answerValues.reduce((s, v) => s + v, 0) / (answerValues.length * 10)) * 100
        : 0;

      const created = await withUniqueRetry(
        async () => {
          const evaluationCode = await generateDatedCode({
            prefix: "EVAL",
            lookupLast: async (fp) => {
              const last = await prisma.regularEvaluation.findFirst({
                where: { evaluationCode: { startsWith: fp } },
                orderBy: { evaluationCode: "desc" },
                select: { evaluationCode: true },
              });
              return last?.evaluationCode ?? null;
            },
          });
          return prisma.regularEvaluation.create({
            data: {
              companyCode: session.companyCode,
              evaluationCode,
              reviewerId,
              subjectId,
              deadline,
              submittedAt: answerValues.length > 0 ? new Date() : null,
              answersJson: answers,
              normalizedScore: normalizedScore.toFixed(2),
            },
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
      );
      return ok({ evaluation: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      return serverError(err);
    }
  });
}
