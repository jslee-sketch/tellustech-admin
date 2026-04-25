import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, notFound, ok, optionalEnum, serverError, trimNonEmpty } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import type { Language } from "@/generated/prisma/client";

const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/inventory/items/[id]/remarks
export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const item = await prisma.inventoryItem.findUnique({ where: { id }, select: { id: true } });
    if (!item) return notFound();
    const remarks = await prisma.inventoryRemark.findMany({
      where: { inventoryItemId: id },
      orderBy: { date: "desc" },
    });
    return ok({ remarks });
  });
}

// POST /api/inventory/items/[id]/remarks
//  body: { contentVi?/contentEn?/contentKo?, originalLang }
//  Claude 자동번역으로 누락 언어 채움
export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const item = await prisma.inventoryItem.findUnique({ where: { id }, select: { id: true } });
    if (!item) return notFound();

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;

    try {
      const vi = trimNonEmpty(p.contentVi);
      const en = trimNonEmpty(p.contentEn);
      const ko = trimNonEmpty(p.contentKo);
      if (!vi && !en && !ko) return badRequest("invalid_input", { field: "content", reason: "required_at_least_one" });
      const originalLang = optionalEnum(p.originalLang, LANGS) ?? (vi ? "VI" : ko ? "KO" : "EN");

      const filled = await fillTranslations({
        vi: vi ?? null, en: en ?? null, ko: ko ?? null, originalLang,
      });

      const created = await prisma.inventoryRemark.create({
        data: {
          inventoryItemId: id,
          contentVi: filled.vi,
          contentEn: filled.en,
          contentKo: filled.ko,
          originalLang,
          date: new Date(),
        },
      });
      return ok({ remark: created }, { status: 201 });
    } catch (err) {
      return serverError(err);
    }
  });
}
