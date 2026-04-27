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

    // 강건 파서: brace-balanced 추출 + 다중 후보 시도
    function extractJsonObjects(txt: string): string[] {
      const out: string[] = [];
      // 1) 모든 markdown ```json … ``` 블록
      const mdRe = /```(?:json)?\s*([\s\S]*?)\s*```/g;
      let m: RegExpExecArray | null;
      while ((m = mdRe.exec(txt)) !== null) {
        const inner = m[1].trim();
        if (inner.startsWith("{")) out.push(inner);
      }
      // 2) brace-balanced 스캐너 — 모든 최상위 { ... } 후보 추출
      let depth = 0; let start = -1; let inStr = false; let esc = false;
      for (let i = 0; i < txt.length; i++) {
        const ch = txt[i];
        if (esc) { esc = false; continue; }
        if (ch === "\\") { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === "{") { if (depth === 0) start = i; depth++; }
        else if (ch === "}") { depth--; if (depth === 0 && start !== -1) { out.push(txt.slice(start, i + 1)); start = -1; } }
      }
      return out;
    }

    function tryParseAny(txt: string): { title?: string; body?: string; sources?: string[] } | null {
      for (const cand of extractJsonObjects(txt)) {
        try {
          const j = JSON.parse(cand);
          if (j && typeof j === "object" && (j.title || j.body)) return j;
        } catch { /* skip */ }
      }
      return null;
    }

    // 각 필드를 순서대로 시도 — KO 우선
    const fields = [post.bodyKo, post.bodyVi, post.bodyEn, post.titleKo, post.titleVi, post.titleEn];
    let parsed: { title?: string; body?: string; sources?: string[] } | null = null;
    for (const f of fields) {
      if (!f) continue;
      parsed = tryParseAny(f);
      if (parsed?.title && parsed?.body) break;
    }
    // 마지막 폴백: 모든 필드 합쳐서
    if (!parsed?.title || !parsed?.body) {
      parsed = tryParseAny(fields.filter(Boolean).join("\n"));
    }
    if (!parsed?.title || !parsed?.body) {
      return badRequest("no_json_found", { hint: "본문에서 유효한 JSON 객체를 찾지 못했습니다. 모달에서 직접 편집하세요." });
    }

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
