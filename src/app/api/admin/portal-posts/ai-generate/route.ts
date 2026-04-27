import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import { prisma } from "@/lib/prisma";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import type { PostCategory, Language } from "@/generated/prisma/client";

const CATEGORIES: readonly PostCategory[] = ["MARKETING", "COMPANY_NEWS", "KOREA_NEWS", "VIETNAM_NEWS", "INDUSTRY_NEWS", "TIP", "COMMUNITY"] as const;

// 카테고리별 강제 가이드 — 톤/형식/허용 주제 명시
const CATEGORY_GUIDE: Record<PostCategory, { tone: string; mustBe: string; mustNot: string }> = {
  MARKETING: {
    tone: "프로모션·이벤트 안내. 친근하고 행동을 유도하는 톤. 혜택과 기간 강조.",
    mustBe: "텔러스테크의 할인/이벤트/신상품 출시 등 마케팅 메시지. 마지막에 행동 유도(CTA) 한 문장 포함.",
    mustNot: "단순 정보 전달, 사용 팁, 회사 일상, 뉴스 요약 금지.",
  },
  COMPANY_NEWS: {
    tone: "회사 소식·발표. 공식적이고 신뢰감 있는 톤.",
    mustBe: "텔러스테크의 인사·조직·신규 사무소·수상 등 회사 자체 소식.",
    mustNot: "외부 뉴스, 마케팅 프로모션, 사용 팁 금지.",
  },
  KOREA_NEWS: {
    tone: "한국 비즈니스/산업 동향 또는 한인 커뮤니티 소식. 정보 전달 톤.",
    mustBe: "한국 또는 베트남 거주 한인 관련 비즈니스/경제/산업 뉴스.",
    mustNot: "텔러스테크 자체 마케팅 또는 장비 사용 팁 금지.",
  },
  VIETNAM_NEWS: {
    tone: "베트남 현지 소식·법규·공휴일. 사실 기반 안내 톤.",
    mustBe: "베트남 정부 정책·법규·공휴일·산업·노동 환경 등 베트남 현지 정보.",
    mustNot: "한국 뉴스, 텔러스테크 마케팅, 장비 팁 금지.",
  },
  INDUSTRY_NEWS: {
    tone: "OA/계측기 업계 동향·신제품. 전문적이고 분석적인 톤.",
    mustBe: "프린터·복합기·계측기·산업장비 분야의 시장 동향, 신제품, 기술 트렌드.",
    mustNot: "텔러스테크 자체 마케팅, 단순 사용 팁(TIP은 별도) 금지.",
  },
  TIP: {
    tone: "장비 사용 팁·관리 노하우. 실용적이고 따뜻한 톤.",
    mustBe: "프린터/복합기/계측기 사용·관리·문제해결 팁. '~하는 N가지 방법' 같은 실용 가이드.",
    mustNot: "마케팅 프로모션, 외부 뉴스, 회사 발표 금지.",
  },
  COMMUNITY: {
    tone: "고객 커뮤니티 화제. 가벼운 톤.",
    mustBe: "고객 간 정보 공유 주제, 모임, 일상 화제.",
    mustNot: "공식 발표, 마케팅, 기술 팁 금지.",
  },
};

// Claude API 호출 — 한국어 제목 + 본문 + 출처 URL (web_search 활용)
async function generateNews(category: PostCategory, topic: string): Promise<{ titleKo: string; bodyKo: string; sources: string[] } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const guide = CATEGORY_GUIDE[category];
  // 카테고리·주제·금지사항을 강하게 enforce. 마지막에 footer/disclaimer.
  const prompt = `당신은 텔러스테크(Tellustech, 베트남 OA/계측기 렌탈·서비스 회사)의 고객 포탈 뉴스 에디터입니다.

【카테고리】${category}
【반드시 작성해야 할 것】${guide.mustBe}
【절대 작성하지 말 것】${guide.mustNot}
【톤】${guide.tone}
【주제】${topic}

⚠️ 위 카테고리와 주제에 정확히 부합하는 글만 작성. 카테고리와 다른 내용 금지. 주제와 무관한 내용 금지.

조건:
- 한국어 본문 300~500자
- 제목 30자 이내 (한 줄)
- 가능하면 web_search 도구로 실제 사실/데이터 확인 후 작성
- 사실 검증된 출처 URL이 있으면 sources 배열에 포함 (없으면 빈 배열)
- 마케팅 톤이어도 과장된 약속·허위 사실 금지

출력 형식 (JSON 외 다른 텍스트 금지):
{"title": "제목", "body": "본문 (개행 포함)", "sources": ["https://...", "..."]}`;

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
        max_tokens: 4096,
        // web_search 도구 활성화 — 모델이 필요 시 검색 후 출처 URL 포함
        tools: [{ type: "web_search_20250305" as any, name: "web_search", max_uses: 3 }],
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[ai-generate] API error", res.status, errBody);
      return null;
    }
    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    // 마지막 text 블록을 본문으로 (web_search 결과 블록 등은 건너뜀)
    const textBlocks = (data.content ?? []).filter((c) => c.type === "text" && typeof c.text === "string");
    const raw = textBlocks.map((c) => c.text!).join("\n").trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as { title?: string; body?: string; sources?: string[] };
      if (parsed.title && parsed.body) {
        const sources = Array.isArray(parsed.sources) ? parsed.sources.filter((s) => typeof s === "string" && s.startsWith("http")) : [];
        return { titleKo: parsed.title.trim(), bodyKo: parsed.body.trim(), sources };
      }
    } catch { /* fallthrough */ }
    const lines = cleaned.split(/\r?\n/);
    const title = lines[0]?.replace(/^[#\-*\s"]+|["#\-*\s]+$/g, "").trim() || topic;
    const body = lines.slice(1).join("\n").trim() || cleaned;
    return { titleKo: title, bodyKo: body, sources: [] };
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

    // 본문 끝에 출처 URL footer + AI 자동 생성 disclaimer 부착
    const sourceFooter = generated.sources.length > 0
      ? "\n\n---\n출처:\n" + generated.sources.map((u) => `- ${u}`).join("\n")
      : "";
    const disclaimerFooter = "\n\n※ AI 자동 생성 초안 — 발행 전 사실 검증 필요";
    const bodyKoWithFooter = generated.bodyKo + sourceFooter + disclaimerFooter;

    const titleFilled = await fillTranslations({ vi: null, en: null, ko: generated.titleKo, originalLang: "KO" });
    const bodyFilled = await fillTranslations({ vi: null, en: null, ko: bodyKoWithFooter, originalLang: "KO" });

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
