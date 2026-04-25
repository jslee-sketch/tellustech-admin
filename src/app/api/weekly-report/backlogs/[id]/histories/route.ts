import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  notFound,
  ok,
  optionalEnum,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import type { Language } from "@/generated/prisma/client";

const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const backlog = await prisma.weeklyBacklog.findUnique({ where: { id }, select: { companyCode: true } });
    if (!backlog || backlog.companyCode !== session.companyCode) return notFound();
    const histories = await prisma.weeklyBacklogHistory.findMany({
      where: { backlogId: id },
      orderBy: { date: "desc" },
      take: 100,
    });
    return ok({ histories });
  });
}

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const backlog = await prisma.weeklyBacklog.findUnique({ where: { id }, select: { companyCode: true } });
    if (!backlog || backlog.companyCode !== session.companyCode) return notFound();

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const vi = trimNonEmpty(p.contentVi);
      const en = trimNonEmpty(p.contentEn);
      const ko = trimNonEmpty(p.contentKo);
      if (!vi && !en && !ko) {
        return badRequest("invalid_input", { field: "content", reason: "required_at_least_one" });
      }
      const originalLang = optionalEnum(p.originalLang, LANGS) ??
        (vi ? "VI" : en ? "EN" : "KO");
      const filled = await fillTranslations({ vi: vi ?? null, en: en ?? null, ko: ko ?? null, originalLang });

      const writerId = trimNonEmpty(p.writtenById);

      const created = await prisma.weeklyBacklogHistory.create({
        data: {
          backlogId: id,
          contentVi: filled.vi,
          contentEn: filled.en,
          contentKo: filled.ko,
          originalLang,
          writtenById: writerId ?? null,
        },
      });
      return ok({ history: created }, { status: 201 });
    } catch (err) {
      return serverError(err);
    }
  });
}
