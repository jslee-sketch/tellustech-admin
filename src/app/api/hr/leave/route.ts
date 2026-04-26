import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest, conflict, handleFieldError, isUniqueConstraintError, ok,
  optionalEnum, requireEnum, requireString, serverError, trimNonEmpty,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { fillTranslations } from "@/lib/translate";
import type { Language, LeaveStatus, LeaveType } from "@/generated/prisma/client";

const TYPES: readonly LeaveType[] = ["LT", "P", "KSX", "CT7", "DB", "TS", "KL", "X"] as const;
const STATUSES: readonly LeaveStatus[] = ["PENDING", "APPROVED", "REJECTED"] as const;
const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const status = optionalEnum(url.searchParams.get("status"), STATUSES);
    const employeeId = trimNonEmpty(url.searchParams.get("employee"));
    const rows = await prisma.leaveRecord.findMany({
      where: {
        companyCode: session.companyCode,
        ...(status ? { status } : {}),
        ...(employeeId ? { employeeId } : {}),
      },
      orderBy: { createdAt: "desc" }, take: 500,
      include: { employee: { select: { employeeCode: true, nameVi: true } } },
    });
    return ok({ leaves: rows });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const employeeId = requireString(p.employeeId, "employeeId");
      const leaveType = requireEnum(p.leaveType, TYPES, "leaveType");
      const startStr = requireString(p.startDate, "startDate");
      const endStr = requireString(p.endDate, "endDate");
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
        return badRequest("invalid_input", { field: "dates" });
      }
      const days = Math.max(0.5, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1));

      const reasonVi = trimNonEmpty(p.reasonVi);
      const reasonEn = trimNonEmpty(p.reasonEn);
      const reasonKo = trimNonEmpty(p.reasonKo);
      const reasonLegacy = trimNonEmpty(p.reason);
      const originalLang = optionalEnum(p.originalLang, LANGS) ??
        (reasonVi ? "VI" : reasonKo ? "KO" : reasonEn ? "EN" : null);
      const filled = (reasonVi || reasonEn || reasonKo) && originalLang
        ? await fillTranslations({ vi: reasonVi ?? null, en: reasonEn ?? null, ko: reasonKo ?? null, originalLang })
        : { vi: null, en: null, ko: null };

      const created = await withUniqueRetry(
        async () => {
          const leaveCode = await generateDatedCode({
            prefix: "LV",
            lookupLast: async (fp) => {
              const last = await prisma.leaveRecord.findFirst({
                where: { deletedAt: undefined, leaveCode: { startsWith: fp } },
                orderBy: { leaveCode: "desc" },
                select: { leaveCode: true },
              });
              return last?.leaveCode ?? null;
            },
          });
          return prisma.leaveRecord.create({
            data: {
              companyCode: session.companyCode,
              leaveCode,
              employeeId,
              leaveType,
              startDate, endDate,
              days: days.toFixed(2),
              reason: reasonLegacy ?? filled.ko ?? filled.vi ?? filled.en ?? null,
              reasonVi: filled.vi,
              reasonEn: filled.en,
              reasonKo: filled.ko,
              originalLang,
              status: "PENDING",
            },
          });
        },
        { isConflict: isUniqueConstraintError },
      );
      return ok({ leave: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      return serverError(err);
    }
  });
}
