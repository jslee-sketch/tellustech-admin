import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, serverError, trimNonEmpty } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import type { Language, PostCategory } from "@/generated/prisma/client";

const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;
const CATEGORIES: readonly PostCategory[] = ["MARKETING", "COMPANY_NEWS", "KOREA_NEWS", "VIETNAM_NEWS", "INDUSTRY_NEWS", "TIP", "COMMUNITY"] as const;

export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const items = await prisma.portalPost.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return ok({ items });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const category = p.category as PostCategory;
    if (!CATEGORIES.includes(category)) return badRequest("invalid_category");
    const titleKo = trimNonEmpty(p.titleKo);
    const titleVi = trimNonEmpty(p.titleVi);
    const titleEn = trimNonEmpty(p.titleEn);
    const bodyKo = trimNonEmpty(p.bodyKo);
    const bodyVi = trimNonEmpty(p.bodyVi);
    const bodyEn = trimNonEmpty(p.bodyEn);
    if (!(titleKo || titleVi || titleEn)) return badRequest("invalid_input");
    const originalLang = (titleKo ? "KO" : titleVi ? "VI" : "EN") as Language;
    const titleFilled = await fillTranslations({ vi: titleVi ?? null, en: titleEn ?? null, ko: titleKo ?? null, originalLang });
    const bodyFilled = (bodyKo || bodyVi || bodyEn) ? await fillTranslations({ vi: bodyVi ?? null, en: bodyEn ?? null, ko: bodyKo ?? null, originalLang }) : { vi: null, en: null, ko: null };
    const isPublished = Boolean(p.isPublished ?? false);
    const bonusPoints = Math.max(0, Math.floor(Number(p.bonusPoints ?? 0)));

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
            postCode, category, originalLang,
            titleKo: titleFilled.ko, titleVi: titleFilled.vi, titleEn: titleFilled.en,
            bodyKo: bodyFilled.ko, bodyVi: bodyFilled.vi, bodyEn: bodyFilled.en,
            isPublished, publishedAt: isPublished ? new Date() : null,
            bonusPoints, isPinned: Boolean(p.isPinned ?? false),
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
