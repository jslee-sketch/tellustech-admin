import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";

export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const items = await prisma.survey.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { responses: true } } } });
    return ok({ items });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const titleKo = String(p.titleKo ?? "").trim();
    const titleVi = String(p.titleVi ?? "").trim();
    const titleEn = String(p.titleEn ?? "").trim();
    const questions = Array.isArray(p.questions) ? p.questions : [];
    const startDate = p.startDate ? new Date(String(p.startDate)) : null;
    const endDate = p.endDate ? new Date(String(p.endDate)) : null;
    const rewardPoints = Math.max(0, Math.floor(Number(p.rewardPoints ?? 10000)));
    if (!titleKo && !titleVi && !titleEn) return badRequest("invalid_input");
    if (!startDate || !endDate) return badRequest("invalid_dates");

    try {
      const created = await withUniqueRetry(
        () => generateDatedCode({
          prefix: "SRV", digits: 3,
          lookupLast: async (full) => {
            const last = await prisma.survey.findFirst({ where: { surveyCode: { startsWith: full } }, orderBy: { surveyCode: "desc" }, select: { surveyCode: true } });
            return last?.surveyCode ?? null;
          },
        }).then((surveyCode) => prisma.survey.create({
          data: {
            surveyCode, titleKo: titleKo || null, titleVi: titleVi || null, titleEn: titleEn || null,
            questions, startDate, endDate, rewardPoints,
            isActive: true, companyCode: "TV",
          },
        })),
        { isConflict: () => true },
      );
      return ok({ survey: created }, { status: 201 });
    } catch (e) { return serverError(e); }
  });
}
