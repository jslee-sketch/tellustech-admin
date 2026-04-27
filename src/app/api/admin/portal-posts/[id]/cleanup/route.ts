import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import type { Language } from "@/generated/prisma/client";

// POST /api/admin/portal-posts/[id]/cleanup
// AI 생성 게시글의 body 가 reasoning + ```json {...}``` 형태로 저장된 경우
// JSON 을 추출해 깨끗한 title/body 로 교체. VI/EN 도 KO 기준으로 재번역.
export async function POST(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    const post = await prisma.portalPost.findUnique({ where: { id } });
    if (!post) return notFound();

    const all = [post.bodyKo ?? "", post.bodyVi ?? "", post.bodyEn ?? "", post.titleKo ?? "", post.titleVi ?? "", post.titleEn ?? ""].join("\n");

    // markdown 코드블록 또는 첫 { ... 마지막 } 추출
    const tryParse = (txt: string): { title?: string; body?: string; sources?: string[] } | null => {
      const md = txt.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const cands: string[] = [];
      if (md) cands.push(md[1]);
      const o = txt.indexOf("{"), c = txt.lastIndexOf("}");
      if (o !== -1 && c > o) cands.push(txt.slice(o, c + 1));
      for (const cand of cands) {
        try { return JSON.parse(cand); } catch { /* try next */ }
      }
      return null;
    };

    const parsed = tryParse(all);
    if (!parsed?.title || !parsed?.body) return badRequest("no_json_found");

    const titleKo = String(parsed.title).trim();
    let bodyKo = String(parsed.body).trim();
    const sources = Array.isArray(parsed.sources)
      ? parsed.sources.filter((s) => typeof s === "string" && s.startsWith("http"))
      : [];

    // footer 부착 (출처 + disclaimer)
    if (sources.length > 0) {
      bodyKo += "\n\n---\n출처:\n" + sources.map((u) => `- ${u}`).join("\n");
    }
    if (!bodyKo.includes("AI 자동 생성")) {
      bodyKo += "\n\n※ AI 자동 생성 초안 — 발행 전 사실 검증 필요";
    }

    const titleFilled = await fillTranslations({ vi: null, en: null, ko: titleKo, originalLang: "KO" as Language });
    const bodyFilled = await fillTranslations({ vi: null, en: null, ko: bodyKo, originalLang: "KO" as Language });

    try {
      const updated = await prisma.portalPost.update({
        where: { id },
        data: {
          titleKo: titleFilled.ko, titleVi: titleFilled.vi, titleEn: titleFilled.en,
          bodyKo: bodyFilled.ko, bodyVi: bodyFilled.vi, bodyEn: bodyFilled.en,
          originalLang: "KO" as Language,
        },
      });
      return ok({ post: updated });
    } catch (e) { return serverError(e); }
  });
}
