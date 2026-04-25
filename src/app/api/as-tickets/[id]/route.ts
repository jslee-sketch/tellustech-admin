import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  handleFieldError,
  isForeignKeyError,
  isRecordNotFoundError,
  notFound,
  ok,
  optionalEnum,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import type { ASStatus, Language } from "@/generated/prisma/client";

const STATUSES: readonly ASStatus[] = ["RECEIVED", "IN_PROGRESS", "DISPATCHED", "COMPLETED", "CANCELED"] as const;
const LANGUAGES: readonly Language[] = ["VI", "EN", "KO"] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const ticket = await prisma.asTicket.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, clientCode: true, companyNameVi: true, receivableStatus: true, phone: true, address: true } },
        assignedTo: { select: { id: true, employeeCode: true, nameVi: true } },
        photos: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
        dispatches: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!ticket) return notFound();
    return ok({ ticket });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const existing = await prisma.asTicket.findUnique({ where: { id } });
    if (!existing) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const data: Record<string, unknown> = {};
      if (p.serialNumber !== undefined) data.serialNumber = trimNonEmpty(p.serialNumber);
      // 증상 변경 시 — 누락된 언어 자동 번역
      const symVi = p.symptomVi !== undefined ? trimNonEmpty(p.symptomVi) : undefined;
      const symEn = p.symptomEn !== undefined ? trimNonEmpty(p.symptomEn) : undefined;
      const symKo = p.symptomKo !== undefined ? trimNonEmpty(p.symptomKo) : undefined;
      let nextOrigLang: Language = existing.originalLang ?? "VI";
      if (p.originalLang !== undefined) {
        const l = optionalEnum(p.originalLang, LANGUAGES);
        if (!l) return badRequest("invalid_input", { field: "originalLang" });
        nextOrigLang = l;
        data.originalLang = l;
      }
      if (symVi !== undefined || symEn !== undefined || symKo !== undefined) {
        const filled = await fillTranslations({
          vi: symVi !== undefined ? symVi : existing.symptomVi,
          en: symEn !== undefined ? symEn : existing.symptomEn,
          ko: symKo !== undefined ? symKo : existing.symptomKo,
          originalLang: nextOrigLang,
        });
        data.symptomVi = filled.vi;
        data.symptomEn = filled.en;
        data.symptomKo = filled.ko;
      }
      if (p.status !== undefined) {
        const s = optionalEnum(p.status, STATUSES);
        if (!s) return badRequest("invalid_input", { field: "status" });
        data.status = s;
        if (s === "COMPLETED" && !existing.completedAt) {
          data.completedAt = new Date();
        }
        if (s !== "COMPLETED" && existing.completedAt) {
          data.completedAt = null;
        }
      }
      if (p.assignedToId !== undefined) {
        const eid = trimNonEmpty(p.assignedToId);
        if (eid) {
          const e = await prisma.employee.findUnique({ where: { id: eid } });
          if (!e) return badRequest("invalid_assignee");
          data.assignedToId = eid;
        } else {
          data.assignedToId = null;
        }
      }
      if (p.itemId !== undefined) {
        const iid = trimNonEmpty(p.itemId);
        if (iid) {
          const it = await prisma.item.findUnique({ where: { id: iid } });
          if (!it) return badRequest("invalid_item");
          data.itemId = iid;
        } else {
          data.itemId = null;
        }
      }

      if (Object.keys(data).length === 0) return ok({ ticket: existing });

      const updated = await prisma.asTicket.update({ where: { id }, data });
      return ok({ ticket: updated });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}

export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    try {
      await prisma.asTicket.delete({ where: { id } });
      return ok({ ok: true });
    } catch (err) {
      if (isForeignKeyError(err)) {
        return badRequest("has_dependent_rows", {
          message: "이 AS 에 연결된 출동 이력이 있어 삭제할 수 없습니다. 상태를 '취소'로 변경하세요.",
        });
      }
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
