import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import { prisma } from "@/lib/prisma";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import type { PostCategory, Language } from "@/generated/prisma/client";

const CATEGORIES: readonly PostCategory[] = ["MARKETING", "COMPANY_NEWS", "KOREA_NEWS", "VIETNAM_NEWS", "INDUSTRY_NEWS", "TIP", "COMMUNITY"] as const;

// AI 뉴스 생성 — fillTranslations 가 Claude API 호출하므로 한국어 1언어만 작성한 뒤 번역.
// 실제 AI 본문 생성은 Phase C 운영 단계에서 별도 프롬프트로 확장 예정 (현재는 사용자 입력 + 번역).
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const category = p.category as PostCategory;
    const topic = String(p.topic ?? "").trim();
    if (!CATEGORIES.includes(category) || !topic) return badRequest("invalid_input");

    // Phase C 의 AI 본문 생성 — 일단 입력된 topic 을 한국어 제목/본문 시드로 사용 후 3언어 자동 번역.
    const titleKo = topic;
    const bodyKo = `[${category}] ${topic}\n\n관리자 검토 후 본문을 보강해주세요.`;
    const filled = await fillTranslations({ vi: null, en: null, ko: bodyKo, originalLang: "KO" });
    const titleFilled = await fillTranslations({ vi: null, en: null, ko: titleKo, originalLang: "KO" });

    try {
      const created = await withUniqueRetry(
        () => generateDatedCode({
          prefix: "POST", digits: 3,
          lookupLast: async (full) => {
            const last = await prisma.portalPost.findFirst({ where: { postCode: { startsWith: full } }, orderBy: { postCode: "desc" }, select: { postCode: true } });
            return last?.postCode ?? null;
          },
        }).then((postCode) => prisma.portalPost.create({
          data: {
            postCode, category, originalLang: "KO" as Language,
            titleKo: titleFilled.ko, titleVi: titleFilled.vi, titleEn: titleFilled.en,
            bodyKo: filled.ko, bodyVi: filled.vi, bodyEn: filled.en,
            isPublished: false, // 검토 후 발행
            isAiGenerated: true,
            authorId: session.sub,
            companyCode: "TV",
          },
        })),
        { isConflict: () => true },
      );
      return ok({ post: created }, { status: 201 });
    } catch (e) { return serverError(e); }
  });
}
