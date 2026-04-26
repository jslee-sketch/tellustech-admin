import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  optionalEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { fillTranslations } from "@/lib/translate";
import type { Language, WeeklyTaskStatus } from "@/generated/prisma/client";

const STATUSES: readonly WeeklyTaskStatus[] = ["IN_PROGRESS", "COMPLETED", "OVERDUE", "CANCELLED"] as const;
const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

function parseDateOrNull(v: unknown): Date | null {
  const s = trimNonEmpty(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const status = optionalEnum(url.searchParams.get("status"), STATUSES);
    const assigneeId = trimNonEmpty(url.searchParams.get("assignee"));
    const fromStr = trimNonEmpty(url.searchParams.get("from"));
    const toStr = trimNonEmpty(url.searchParams.get("to"));

    const where = {
      companyCode: session.companyCode,
      ...(status ? { status } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(fromStr || toStr
        ? {
            registeredAt: {
              ...(fromStr ? { gte: new Date(fromStr) } : {}),
              ...(toStr ? { lte: new Date(new Date(toStr).setHours(23, 59, 59, 999)) } : {}),
            },
          }
        : {}),
    };
    const tasks = await prisma.weeklyTask.findMany({
      where,
      orderBy: { registeredAt: "desc" },
      take: 500,
      include: {
        writer: { select: { employeeCode: true, nameVi: true } },
        assignee: { select: { employeeCode: true, nameVi: true } },
      },
    });
    return ok({ tasks });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const writerId = requireString(p.writerId, "writerId");
      const assigneeId = requireString(p.assigneeId, "assigneeId");
      const title = requireString(p.title, "title");
      const writer = await prisma.employee.findUnique({ where: { id: writerId }, select: { companyCode: true } });
      if (!writer || writer.companyCode !== session.companyCode) return badRequest("invalid_writer");
      const assignee = await prisma.employee.findUnique({ where: { id: assigneeId }, select: { companyCode: true } });
      if (!assignee || assignee.companyCode !== session.companyCode) return badRequest("invalid_assignee");

      const iVi = trimNonEmpty(p.instructionVi);
      const iEn = trimNonEmpty(p.instructionEn);
      const iKo = trimNonEmpty(p.instructionKo);
      const iLang = optionalEnum(p.instructionLang, LANGS) ?? (iKo ? "KO" : iVi ? "VI" : iEn ? "EN" : "KO");
      const iFilled = (iVi || iEn || iKo)
        ? await fillTranslations({ vi: iVi ?? null, en: iEn ?? null, ko: iKo ?? null, originalLang: iLang })
        : { vi: null, en: null, ko: null };

      const cVi = trimNonEmpty(p.contentVi);
      const cEn = trimNonEmpty(p.contentEn);
      const cKo = trimNonEmpty(p.contentKo);
      const cLang = optionalEnum(p.contentLang, LANGS) ?? (cKo ? "KO" : cVi ? "VI" : cEn ? "EN" : "KO");
      const cFilled = (cVi || cEn || cKo)
        ? await fillTranslations({ vi: cVi ?? null, en: cEn ?? null, ko: cKo ?? null, originalLang: cLang })
        : { vi: null, en: null, ko: null };

      const status = optionalEnum(p.status, STATUSES) ?? "IN_PROGRESS";

      const created = await withUniqueRetry(
        async () => {
          const taskCode = await generateDatedCode({
            prefix: "WT",
            lookupLast: async (fp) => {
              const last = await prisma.weeklyTask.findFirst({
                where: { taskCode: { startsWith: fp } },
                orderBy: { taskCode: "desc" },
                select: { taskCode: true },
              });
              return last?.taskCode ?? null;
            },
          });
          return prisma.weeklyTask.create({
            data: {
              companyCode: session.companyCode,
              taskCode,
              writerId,
              assigneeId,
              title,
              instructionVi: iFilled.vi,
              instructionEn: iFilled.en,
              instructionKo: iFilled.ko,
              instructionLang: iLang,
              contentVi: cFilled.vi,
              contentEn: cFilled.en,
              contentKo: cFilled.ko,
              contentLang: cLang,
              expectedEndDate: parseDateOrNull(p.expectedEndDate),
              actualEndDate: parseDateOrNull(p.actualEndDate),
              status,
            },
          });
        },
        { isConflict: isUniqueConstraintError },
      );
      return ok({ task: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
