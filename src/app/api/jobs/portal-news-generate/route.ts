import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fillTranslations } from "@/lib/translate";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { getSession } from "@/lib/session";
import type { Language, PostCategory } from "@/generated/prisma/client";

// POST /api/jobs/portal-news-generate
// 매주 월요일 09:00 KST. Claude API 로 베트남 뉴스 1건 + 사용 팁 1건 자동 초안 생성.
// 모두 isPublished=false (관리자 검토 후 발행).
// 인증: Bearer CRON_SECRET (외부 cron) OR 로그인된 ADMIN 세션 (수동 트리거).

const TARGETS: Array<{ category: PostCategory; topicHint: string }> = [
  { category: "VIETNAM_NEWS", topicHint: "이번 주 베트남 비즈니스/산업/노동 환경 주요 동향 (한국 거주 기업 관점)" },
  { category: "TIP", topicHint: "프린터·복합기·계측기 사용/관리 팁 1주차 콘텐츠 (실용 가이드)" },
];

const CATEGORY_GUIDE: Record<PostCategory, { tone: string; mustBe: string; mustNot: string }> = {
  MARKETING: { tone: "프로모션·이벤트 안내. 친근한 톤. CTA 한 문장 포함.", mustBe: "텔러스테크 할인/이벤트/신상품.", mustNot: "단순 정보 전달, 사용 팁, 회사 일상." },
  COMPANY_NEWS: { tone: "공식적이고 신뢰감 있는 톤.", mustBe: "텔러스테크 인사·조직·신규 사무소·수상.", mustNot: "외부 뉴스, 마케팅, 사용 팁." },
  KOREA_NEWS: { tone: "정보 전달 톤.", mustBe: "한국·한인 비즈니스/경제/산업 뉴스.", mustNot: "텔러스테크 마케팅, 사용 팁." },
  VIETNAM_NEWS: { tone: "사실 기반 안내 톤.", mustBe: "베트남 정부 정책·법규·공휴일·산업·노동 환경.", mustNot: "한국 뉴스, 텔러스테크 마케팅, 사용 팁." },
  INDUSTRY_NEWS: { tone: "전문적이고 분석적인 톤.", mustBe: "OA/계측기 시장·신제품·기술 트렌드.", mustNot: "텔러스테크 마케팅, 단순 사용 팁." },
  TIP: { tone: "실용적이고 따뜻한 톤.", mustBe: "프린터/복합기/계측기 사용·관리·문제해결 팁. '~하는 N가지 방법'.", mustNot: "마케팅, 외부 뉴스, 회사 발표." },
  COMMUNITY: { tone: "가벼운 톤.", mustBe: "고객 간 정보 공유 주제.", mustNot: "공식 발표, 마케팅, 기술 팁." },
};

async function generateNews(category: PostCategory, topic: string): Promise<{ titleKo: string; bodyKo: string; sources: string[] } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const guide = CATEGORY_GUIDE[category];
  const prompt = `당신은 텔러스테크(Tellustech) 회사의 사내 콘텐츠 에디터입니다. 텔러스테크는 베트남에 있는 OA(프린터/복합기)·계측기 렌탈·서비스 회사이며, 이번 주 고객 포탈에 게시할 글을 자동 생성합니다. 회사의 존재나 마케팅 권한은 별도 확인 불필요.

【카테고리】${category}
【반드시 작성해야 할 것】${guide.mustBe}
【절대 작성하지 말 것】${guide.mustNot}
【톤】${guide.tone}
【주제】${topic}

위 카테고리·주제에 부합하는 한국어 글 1편을 즉시 작성. 카테고리/주제와 무관한 내용 금지.

web_search 도구는 외부 사실(베트남 공휴일/한국 경제 등) 확인이 필요할 때만 사용. 텔러스테크 자체 정보는 일반적인 표현만 사용.

⚠️ 출력은 반드시 단일 JSON 객체. 그 외 reasoning/설명/markdown 코드블록 금지.

JSON 스키마:
{"title": "제목 (30자 이내)", "body": "본문 한국어 300~500자, 개행은 \\n", "sources": ["https://외부사실출처URL", ...]}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500, // 4096 → 1500 (응답 시간 단축, 본문 300~500자엔 충분)
        system: "당신은 텔러스테크 회사의 사내 에디터입니다. 사용자(관리자)가 의뢰하는 사내 콘텐츠를 즉시 작성합니다. 출력은 항상 단일 JSON 객체만.",
        // web_search 제거 — Railway 30초 타임아웃 안에 못 끝나는 주범. 외부 사실 확인은 관리자 검토 단계에서.
        messages: [
          { role: "user", content: prompt },
          { role: "assistant", content: '{"title":"' },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string; url?: string }> };
    const blocks = data.content ?? [];
    const searchUrls: string[] = [];
    for (const b of blocks) if (b.url && typeof b.url === "string" && b.url.startsWith("http")) searchUrls.push(b.url);
    const rawText = blocks.filter((c) => c.type === "text" && typeof c.text === "string").map((c) => c.text!).join("\n");
    const allText = rawText.startsWith("{") || rawText.includes("```") ? rawText : '{"title":"' + rawText;

    const tryParseJson = (txt: string): { title?: string; body?: string; sources?: string[] } | null => {
      const md = txt.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const cands: string[] = [];
      if (md) cands.push(md[1]);
      const o = txt.indexOf("{"), c = txt.lastIndexOf("}");
      if (o !== -1 && c > o) cands.push(txt.slice(o, c + 1));
      for (const cand of cands) { try { return JSON.parse(cand); } catch { /* try next */ } }
      return null;
    };
    const parsed = tryParseJson(allText);
    if (parsed?.title && parsed?.body) {
      const modelSources = Array.isArray(parsed.sources) ? parsed.sources.filter((s) => typeof s === "string" && s.startsWith("http")) : [];
      const sources = [...new Set([...searchUrls, ...modelSources])];
      return { titleKo: String(parsed.title).trim(), bodyKo: String(parsed.body).trim(), sources };
    }
    return null;
  } catch (err) {
    console.error("[portal-news-generate] AI error:", err);
    return null;
  }
}

export async function POST(request: Request) {
  // 인증: Bearer CRON_SECRET (외부 cron) OR ADMIN 세션 (수동)
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  const bearerOk = expected && auth === `Bearer ${expected}`;
  let adminOk = false;
  if (!bearerOk) {
    try {
      const session = await getSession();
      adminOk = session.role === "ADMIN";
    } catch { /* 비로그인 */ }
  }
  if (!bearerOk && !adminOk) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 한 카테고리 1건 생성 (전체 흐름 캡슐화 — Promise.allSettled 로 병렬)
  async function generateOne(t: { category: PostCategory; topicHint: string }, sysUserId: string | null) {
    const generated = await generateNews(t.category, t.topicHint);
    if (!generated) return { category: t.category, status: "ai_unavailable" };

    const sourceFooter = generated.sources.length > 0
      ? "\n\n---\n출처:\n" + generated.sources.map((u) => `- ${u}`).join("\n")
      : "";
    const disclaimerFooter = "\n\n※ AI 자동 생성 초안 (주간 자동 발행) — 발행 전 사실 검증 필요";
    const bodyKoWithFooter = generated.bodyKo + sourceFooter + disclaimerFooter;

    // 번역 2건 병렬
    const [titleFilled, bodyFilled] = await Promise.all([
      fillTranslations({ vi: null, en: null, ko: generated.titleKo, originalLang: "KO" as Language }),
      fillTranslations({ vi: null, en: null, ko: bodyKoWithFooter, originalLang: "KO" as Language }),
    ]);

    try {
      const post = await withUniqueRetry(
        () => generateDatedCode({
          prefix: "POST", digits: 3,
          lookupLast: async (full) => {
            const last = await prisma.portalPost.findFirst({ where: { postCode: { startsWith: full } }, orderBy: { postCode: "desc" }, select: { postCode: true } });
            return last?.postCode ?? null;
          },
        }).then((postCode) => prisma.portalPost.create({
          data: {
            postCode,
            category: t.category,
            originalLang: "KO" as Language,
            titleKo: titleFilled.ko, titleVi: titleFilled.vi, titleEn: titleFilled.en,
            bodyKo: bodyFilled.ko, bodyVi: bodyFilled.vi, bodyEn: bodyFilled.en,
            isPublished: false,
            isAiGenerated: true,
            authorId: sysUserId,
            companyCode: "TV",
          },
        })),
        { isConflict: () => true },
      );
      return { category: t.category, status: "created", postCode: post.postCode, title: post.titleKo };
    } catch (e: any) {
      return { category: t.category, status: "db_error", error: e?.message };
    }
  }

  // 백그라운드 작업 — fire-and-forget. 30초 타임아웃 우회.
  // ?sync=1 쿼리로 동기 실행 (수동 테스트용)도 지원.
  const url = new URL(request.url);
  const sync = url.searchParams.get("sync") === "1";

  const runJob = async () => {
    try {
      const sysUser = await prisma.user.findFirst({
        where: { username: { in: ["system", "cron", "admin"] } },
        select: { id: true },
      });
      // Promise.allSettled — 부분 성공 허용 (1건만 되도 OK).
      const settled = await Promise.allSettled(TARGETS.map((t) => generateOne(t, sysUser?.id ?? null)));
      const results = settled.map((s, i) => s.status === "fulfilled" ? s.value : { category: TARGETS[i].category, status: "rejected", error: String(s.reason?.message ?? s.reason) });
      console.log("[portal-news-generate] async job complete:", JSON.stringify(results));
      return results;
    } catch (e: any) {
      console.error("[portal-news-generate] async job error:", e?.message ?? e);
      return [{ status: "fatal", error: String(e?.message ?? e) }];
    }
  };

  if (sync) {
    // 수동 테스트 — await 해서 결과 반환
    const results = await runJob();
    return NextResponse.json({ ok: true, mode: "sync", generated: results.length, results });
  }

  // 비동기 실행: 즉시 200 반환, 백그라운드에서 처리.
  // catch 로 unhandled rejection 방지.
  runJob().catch((e) => console.error("[portal-news-generate] background error:", e));
  return NextResponse.json({
    ok: true,
    mode: "async",
    scheduled: TARGETS.length,
    note: "Generation runs in background. Check Railway logs or /admin/portal-posts in 1-2 minutes.",
  }, { status: 202 });
}
