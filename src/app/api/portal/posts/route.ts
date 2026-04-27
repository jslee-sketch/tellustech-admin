import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, optionalEnum, serverError, trimNonEmpty } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { grantPoints } from "@/lib/portal-points";
import type { Language, PostCategory } from "@/generated/prisma/client";

const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;
const CATEGORIES: readonly PostCategory[] = ["MARKETING", "COMPANY_NEWS", "KOREA_NEWS", "VIETNAM_NEWS", "INDUSTRY_NEWS", "TIP", "COMMUNITY"] as const;

// GET /api/portal/posts?category= — 발행된 게시글 (cat 옵션)
export async function GET(req: Request) {
  return withSessionContext(async () => {
    const url = new URL(req.url);
    const cat = url.searchParams.get("category");
    const where: any = { isPublished: true };
    if (cat && CATEGORIES.includes(cat as PostCategory)) where.category = cat;
    try {
      const items = await prisma.portalPost.findMany({ where, orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }], take: 50 });
      return ok({ items });
    } catch (e) { return serverError(e); }
  });
}

// POST /api/portal/posts — 고객 커뮤니티 글 작성 (+포인트)
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const titleKo = trimNonEmpty(p.titleKo);
    const titleVi = trimNonEmpty(p.titleVi);
    const titleEn = trimNonEmpty(p.titleEn);
    const bodyKo = trimNonEmpty(p.bodyKo);
    const bodyVi = trimNonEmpty(p.bodyVi);
    const bodyEn = trimNonEmpty(p.bodyEn);
    if (!(titleKo || titleVi || titleEn) || !(bodyKo || bodyVi || bodyEn)) return badRequest("invalid_input");
    const originalLang = (optionalEnum(p.originalLang, LANGS) ?? "KO") as Language;
    const titleFilled = await fillTranslations({ vi: titleVi ?? null, en: titleEn ?? null, ko: titleKo ?? null, originalLang });
    const bodyFilled = await fillTranslations({ vi: bodyVi ?? null, en: bodyEn ?? null, ko: bodyKo ?? null, originalLang });

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
            postCode,
            category: "COMMUNITY",
            titleKo: titleFilled.ko, titleVi: titleFilled.vi, titleEn: titleFilled.en,
            bodyKo: bodyFilled.ko, bodyVi: bodyFilled.vi, bodyEn: bodyFilled.en,
            originalLang,
            clientAuthorId: user.clientId!,
            companyCode: "TV",
            isPublished: true, publishedAt: new Date(),
          },
        })),
        { isConflict: () => true },
      );
      const granted = await grantPoints({ clientId: user.clientId!, reason: "POST_WRITE", linkedModel: "PortalPost", linkedId: created.id }).catch(() => null);
      return ok({ post: created, pointsEarned: granted?.pointsEarned ?? null }, { status: 201 });
    } catch (e) { return serverError(e); }
  });
}
