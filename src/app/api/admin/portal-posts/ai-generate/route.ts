import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import { prisma } from "@/lib/prisma";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import type { PostCategory, Language } from "@/generated/prisma/client";

const CATEGORIES: readonly PostCategory[] = ["MARKETING", "COMPANY_NEWS", "KOREA_NEWS", "VIETNAM_NEWS", "INDUSTRY_NEWS", "TIP", "COMMUNITY"] as const;

// 카테고리별 톤 가이드
const CATEGORY_TONE: Record<PostCategory, string> = {
  MARKETING:    "프로모션·이벤트 안내. 친근하고 행동을 유도하는 톤. 혜택 강조.",
  COMPANY_NEWS: "회사 소식·발표. 공식적이고 신뢰감 있는 톤.",
  KOREA_NEWS:   "한국 비즈니스/산업 동향 또는 한인 커뮤니티 소식. 정보 전달 톤.",
  VIETNAM_NEWS: "베트남 현지 소식·법규·공휴일. 사실 기반 안내 톤.",
  INDUSTRY_NEWS:"OA/계측기 업계 동향·신제품. 전문적이고 분석적인 톤.",
  TIP:          "장비 사용 팁·관리 노하우. 실용적이고 따뜻한 톤.",
  COMMUNITY:    "고객 커뮤니티 화제. 가벼운 톤.",
};

// Claude API 호출 — 한국어 제목 + 본문 동시 생성
async function generateNews(category: PostCategory, topic: string): Promise<{ titleKo: string; bodyKo: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const tone = CATEGORY_TONE[category] ?? "";
  const prompt = `당신은 텔러스테크(Tellustech, 베트남 OA/계측기 렌탈·서비스 회사)의 고객 포탈 뉴스 에디터입니다.
다음 카테고리·주제로 한국어 뉴스 기사 1편을 작성하세요.

카테고리: ${category}
톤 가이드: ${tone}
주제: ${topic}

조건:
- 길이 300~500자
- 첫 줄은 제목 (한 줄, 30자 이내), 그 다음 빈 줄, 본문
- 사실 추정이 필요하면 "관리자 검토 후 보강 필요" 라고 명시
- 마케팅 톤이라도 과장된 약속 금지

출력 형식 (JSON 외 다른 텍스트 금지):
{"title": "제목", "body": "본문 (개행 포함)"}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error("[ai-generate] API error", res.status);
      return null;
    }
    const data = (await res.json()) as { content?: { text?: string }[] };
    const raw = data.content?.[0]?.text?.trim() ?? "";
    // JSON 파싱 — 모델이 ```json … ``` 으로 감쌀 수 있어 라인 정리
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as { title?: string; body?: string };
      if (parsed.title && parsed.body) return { titleKo: parsed.title.trim(), bodyKo: parsed.body.trim() };
    } catch { /* fallthrough */ }
    // 폴백: 첫 줄 = 제목, 나머지 = 본문
    const lines = cleaned.split(/\r?\n/);
    const title = lines[0]?.replace(/^[#\-*\s"]+|["#\-*\s]+$/g, "").trim() || topic;
    const body = lines.slice(1).join("\n").trim() || cleaned;
    return { titleKo: title, bodyKo: body };
  } catch (err) {
    console.error("[ai-generate] failed:", err);
    return null;
  }
}

// POST /api/admin/portal-posts/ai-generate
// body: { category, topic }
// → Claude API → 한국어 제목·본문 생성 → fillTranslations 로 VI/EN 번역 → isPublished=false
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const category = p.category as PostCategory;
    const topic = String(p.topic ?? "").trim();
    if (!CATEGORIES.includes(category) || !topic) return badRequest("invalid_input");

    const generated = await generateNews(category, topic);
    if (!generated) return badRequest("ai_unavailable", { hint: "ANTHROPIC_API_KEY 미설정 또는 API 호출 실패" });

    const titleFilled = await fillTranslations({ vi: null, en: null, ko: generated.titleKo, originalLang: "KO" });
    const bodyFilled = await fillTranslations({ vi: null, en: null, ko: generated.bodyKo, originalLang: "KO" });

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
            bodyKo: bodyFilled.ko, bodyVi: bodyFilled.vi, bodyEn: bodyFilled.en,
            isPublished: false, // 검토 후 발행
            isAiGenerated: true,
            authorId: session.sub,
            companyCode: "TV",
          },
        })),
        { isConflict: () => true },
      );
      return ok({ post: created, generated }, { status: 201 });
    } catch (e) { return serverError(e); }
  });
}
