import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError, trimNonEmpty } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import type { PostCategory, Language } from "@/generated/prisma/client";

const CATEGORIES: readonly PostCategory[] = ["MARKETING", "COMPANY_NEWS", "KOREA_NEWS", "VIETNAM_NEWS", "INDUSTRY_NEWS", "TIP", "COMMUNITY"] as const;

// GET /api/admin/portal-posts/[id] — 상세 (편집 모달용)
export async function GET(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    const post = await prisma.portalPost.findUnique({ where: { id } });
    if (!post) return notFound();
    return ok({ post });
  });
}

// PATCH — 본문/제목/카테고리/발행/고정/포인트 모두 수정 가능.
// titleKo/bodyKo 가 변경되면 VI/EN 재번역 (originalLang=KO 가정).
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    const existing = await prisma.portalPost.findUnique({ where: { id } });
    if (!existing) return notFound();

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    // 카테고리
    if (p.category !== undefined) {
      if (!CATEGORIES.includes(p.category as PostCategory)) return badRequest("invalid_category");
      data.category = p.category;
    }

    // 제목·본문 — 사용자가 임의 언어로 수정한 경우 그 언어를 originalLang 으로 재번역
    const titleKo = trimNonEmpty(p.titleKo);
    const titleVi = trimNonEmpty(p.titleVi);
    const titleEn = trimNonEmpty(p.titleEn);
    const titleProvided = p.titleKo !== undefined || p.titleVi !== undefined || p.titleEn !== undefined;

    const bodyKo = trimNonEmpty(p.bodyKo);
    const bodyVi = trimNonEmpty(p.bodyVi);
    const bodyEn = trimNonEmpty(p.bodyEn);
    const bodyProvided = p.bodyKo !== undefined || p.bodyVi !== undefined || p.bodyEn !== undefined;

    if (titleProvided) {
      const originalLang: Language = titleKo ? "KO" : titleVi ? "VI" : titleEn ? "EN" : "KO";
      const filled = await fillTranslations({ vi: titleVi ?? null, en: titleEn ?? null, ko: titleKo ?? null, originalLang });
      data.titleKo = filled.ko; data.titleVi = filled.vi; data.titleEn = filled.en;
    }
    if (bodyProvided) {
      const originalLang: Language = bodyKo ? "KO" : bodyVi ? "VI" : bodyEn ? "EN" : "KO";
      const filled = await fillTranslations({ vi: bodyVi ?? null, en: bodyEn ?? null, ko: bodyKo ?? null, originalLang });
      data.bodyKo = filled.ko; data.bodyVi = filled.vi; data.bodyEn = filled.en;
    }

    if (typeof p.isPublished === "boolean") {
      data.isPublished = p.isPublished;
      if (p.isPublished && !existing.publishedAt) data.publishedAt = new Date();
    }
    if (typeof p.isPinned === "boolean") data.isPinned = p.isPinned;
    if (typeof p.bonusPoints === "number") data.bonusPoints = Math.max(0, Math.floor(p.bonusPoints));

    if (Object.keys(data).length === 0) return ok({ post: existing });

    try {
      const post = await prisma.portalPost.update({ where: { id }, data });
      return ok({ post });
    } catch (e) { return serverError(e); }
  });
}

export async function DELETE(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    try {
      // PortalPostView FK cascade 처리 — 먼저 views 삭제 후 post 삭제
      await prisma.portalPostView.deleteMany({ where: { postId: id } });
      await prisma.portalPost.delete({ where: { id } });
      return ok({ ok: true });
    } catch (e) { return serverError(e); }
  });
}
