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
import type { CalendarEventType, Language } from "@/generated/prisma/client";

const TYPES: readonly CalendarEventType[] = [
  "SCHEDULE_DEADLINE", "WEEKLY_REPORT", "CONTRACT_EXPIRY", "CERT_EXPIRY",
  "LICENSE_EXPIRY", "AR_DUE", "LEAVE", "AS_DISPATCH", "RENTAL_ORDER",
  "BIRTHDAY", "HOLIDAY_VN", "HOLIDAY_KR", "CUSTOM",
] as const;
const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing || existing.companyCode !== session.companyCode) return notFound();

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const data: Record<string, unknown> = {};
      if (p.title !== undefined) data.title = String(p.title);
      if (p.startDate !== undefined) {
        const s = trimNonEmpty(p.startDate);
        if (!s) return badRequest("invalid_input", { field: "startDate" });
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return badRequest("invalid_input", { field: "startDate" });
        data.startDate = d;
      }
      if (p.endDate !== undefined) {
        const s = trimNonEmpty(p.endDate);
        if (s) {
          const d = new Date(s);
          if (Number.isNaN(d.getTime())) return badRequest("invalid_input", { field: "endDate" });
          data.endDate = d;
        } else data.endDate = null;
      }
      if (p.allDay !== undefined) data.allDay = !!p.allDay;
      if (p.eventType !== undefined) {
        const t = optionalEnum(p.eventType, TYPES);
        if (!t) return badRequest("invalid_input", { field: "eventType" });
        data.eventType = t;
      }
      if (p.color !== undefined) data.color = trimNonEmpty(p.color);
      if (p.description !== undefined) data.description = trimNonEmpty(p.description);
      if (p.assigneeId !== undefined) data.assigneeId = trimNonEmpty(p.assigneeId);
      if (p.linkedUrl !== undefined) data.linkedUrl = trimNonEmpty(p.linkedUrl);

      // 다국어 갱신
      if (p.titleVi !== undefined || p.titleEn !== undefined || p.titleKo !== undefined) {
        const lang = optionalEnum(p.titleLang, LANGS) ?? "KO";
        const filled = await fillTranslations({
          vi: trimNonEmpty(p.titleVi) ?? null,
          en: trimNonEmpty(p.titleEn) ?? null,
          ko: trimNonEmpty(p.titleKo) ?? null,
          originalLang: lang,
        });
        data.titleVi = filled.vi; data.titleEn = filled.en; data.titleKo = filled.ko;
      }

      const updated = await prisma.calendarEvent.update({ where: { id }, data });
      return ok({ event: updated });
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
    const e = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!e || e.companyCode !== session.companyCode) return notFound();
    await prisma.calendarEvent.delete({ where: { id } });
    return ok({ ok: true });
  });
}
