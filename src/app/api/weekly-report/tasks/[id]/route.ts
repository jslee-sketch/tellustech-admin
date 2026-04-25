import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  forbidden,
  handleFieldError,
  isRecordNotFoundError,
  notFound,
  ok,
  optionalEnum,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import type { Language, WeeklyTaskStatus } from "@/generated/prisma/client";

const STATUSES: readonly WeeklyTaskStatus[] = ["IN_PROGRESS", "COMPLETED", "OVERDUE", "CANCELLED"] as const;
const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

type RouteContext = { params: Promise<{ id: string }> };

function parseDateOrNull(v: unknown): Date | null {
  const s = trimNonEmpty(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(_req: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const t = await prisma.weeklyTask.findUnique({
      where: { id },
      include: {
        writer: { select: { employeeCode: true, nameVi: true } },
        assignee: { select: { employeeCode: true, nameVi: true } },
      },
    });
    if (!t || t.companyCode !== session.companyCode) return notFound();
    return ok({ task: t });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const existing = await prisma.weeklyTask.findUnique({ where: { id } });
    if (!existing || existing.companyCode !== session.companyCode) return notFound();

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const data: Record<string, unknown> = {};
      if (p.title !== undefined) data.title = String(p.title);
      if (p.expectedEndDate !== undefined) data.expectedEndDate = parseDateOrNull(p.expectedEndDate);
      if (p.actualEndDate !== undefined) data.actualEndDate = parseDateOrNull(p.actualEndDate);
      if (p.status !== undefined) {
        const s = optionalEnum(p.status, STATUSES);
        if (!s) return badRequest("invalid_input", { field: "status" });
        data.status = s;
      }

      // 지시사항 업데이트 (3언어)
      if (p.instructionVi !== undefined || p.instructionEn !== undefined || p.instructionKo !== undefined) {
        const vi = trimNonEmpty(p.instructionVi);
        const en = trimNonEmpty(p.instructionEn);
        const ko = trimNonEmpty(p.instructionKo);
        const lang = optionalEnum(p.instructionLang, LANGS) ?? existing.instructionLang;
        const filled = (vi || en || ko)
          ? await fillTranslations({ vi: vi ?? null, en: en ?? null, ko: ko ?? null, originalLang: lang })
          : { vi: null, en: null, ko: null };
        data.instructionVi = filled.vi;
        data.instructionEn = filled.en;
        data.instructionKo = filled.ko;
        data.instructionLang = lang;
      }

      // 업무내용 업데이트 (누적 — 새 텍스트가 들어오면 기존 + 줄바꿈 + 새 내용)
      if (p.contentVi !== undefined || p.contentEn !== undefined || p.contentKo !== undefined) {
        const vi = trimNonEmpty(p.contentVi);
        const en = trimNonEmpty(p.contentEn);
        const ko = trimNonEmpty(p.contentKo);
        const lang = optionalEnum(p.contentLang, LANGS) ?? existing.contentLang;
        const filled = (vi || en || ko)
          ? await fillTranslations({ vi: vi ?? null, en: en ?? null, ko: ko ?? null, originalLang: lang })
          : { vi: null, en: null, ko: null };
        const ts = new Date().toISOString().slice(0, 16);
        const append = (prev: string | null, next: string | null) =>
          next ? (prev ? `${prev}\n[${ts}] ${next}` : `[${ts}] ${next}`) : prev;
        data.contentVi = append(existing.contentVi, filled.vi);
        data.contentEn = append(existing.contentEn, filled.en);
        data.contentKo = append(existing.contentKo, filled.ko);
        data.contentLang = lang;
      }

      const updated = await prisma.weeklyTask.update({ where: { id }, data });
      return ok({ task: updated });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}

export async function DELETE(_req: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    if (!["ADMIN", "MANAGER"].includes(session.role)) return forbidden();
    const { id } = await context.params;
    const t = await prisma.weeklyTask.findUnique({ where: { id } });
    if (!t || t.companyCode !== session.companyCode) return notFound();
    await prisma.weeklyTask.delete({ where: { id } });
    return ok({ ok: true });
  });
}
