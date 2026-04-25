import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, handleFieldError, notFound, ok, optionalEnum, serverError, trimNonEmpty } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import type { Language } from "@/generated/prisma/client";

const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const pr = await prisma.payableReceivable.findUnique({ where: { id }, select: { id: true } });
    if (!pr) return notFound();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const contentVi = trimNonEmpty(p.contentVi);
      const contentEn = trimNonEmpty(p.contentEn);
      const contentKo = trimNonEmpty(p.contentKo);
      if (!contentVi && !contentEn && !contentKo) {
        return badRequest("invalid_input", { field: "content", reason: "required_at_least_one" });
      }
      const originalLang = optionalEnum(p.originalLang, LANGS) ?? (contentVi ? "VI" : contentKo ? "KO" : "EN");
      const filled = await fillTranslations({
        vi: contentVi ?? null, en: contentEn ?? null, ko: contentKo ?? null, originalLang,
      });
      const created = await prisma.delayReason.create({
        data: { payableReceivableId: id, contentVi: filled.vi, contentEn: filled.en, contentKo: filled.ko, originalLang },
      });
      return ok({ delayReason: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      return serverError(err);
    }
  });
}
