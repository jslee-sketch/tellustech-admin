import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest, conflict, handleFieldError, isUniqueConstraintError, ok,
  optionalEnum, requireEnum, requireString, serverError, trimNonEmpty,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { fillTranslations } from "@/lib/translate";
import type { IncidentType, Language } from "@/generated/prisma/client";

const TYPES: readonly IncidentType[] = ["PRAISE", "IMPROVEMENT"] as const;
const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const type = optionalEnum(url.searchParams.get("type"), TYPES);
    const subjectId = trimNonEmpty(url.searchParams.get("subject"));
    const where = {
      companyCode: session.companyCode,
      ...(type ? { type } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(q ? {
        OR: [
          { incidentCode: { contains: q, mode: "insensitive" as const } },
          { contentVi: { contains: q, mode: "insensitive" as const } },
          { contentKo: { contains: q, mode: "insensitive" as const } },
          { contentEn: { contains: q, mode: "insensitive" as const } },
        ],
      } : {}),
    };
    const rows = await prisma.incident.findMany({
      where, orderBy: { createdAt: "desc" }, take: 500,
      include: {
        author: { select: { employeeCode: true, nameVi: true } },
        subject: { select: { employeeCode: true, nameVi: true } },
      },
    });
    return ok({ incidents: rows });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const subjectId = requireString(p.subjectId, "subjectId");
      const type = requireEnum(p.type, TYPES, "type");

      // 작성자 = 현재 사용자의 empCode 로 역조회
      if (!session.empCode) return badRequest("author_not_employee", undefined);
      const author = await prisma.employee.findUnique({
        where: { companyCode_employeeCode: { companyCode: session.companyCode, employeeCode: session.empCode } },
        select: { id: true },
      });
      if (!author) return badRequest("author_not_found");

      const subject = await prisma.employee.findUnique({ where: { id: subjectId }, select: { companyCode: true } });
      if (!subject || subject.companyCode !== session.companyCode) return badRequest("invalid_subject");

      // 50자 이상 검증 — 최소 하나의 언어 필드가 50자 이상이어야 함
      const contentVi = trimNonEmpty(p.contentVi);
      const contentEn = trimNonEmpty(p.contentEn);
      const contentKo = trimNonEmpty(p.contentKo);
      const longest = Math.max(contentVi?.length ?? 0, contentEn?.length ?? 0, contentKo?.length ?? 0);
      if (longest < 50) return badRequest("too_short", { message: "최소 한 언어로 50자 이상 서술해 주세요." });

      const originalLang = optionalEnum(p.originalLang, LANGS) ??
        (contentVi ? "VI" : contentKo ? "KO" : "EN");

      // Claude 자동 번역 — 누락된 언어 채움 (API 키 없으면 그대로)
      const filled = await fillTranslations({
        vi: contentVi ?? null, en: contentEn ?? null, ko: contentKo ?? null, originalLang,
      });

      const created = await withUniqueRetry(
        async () => {
          const incidentCode = await generateDatedCode({
            prefix: "INC",
            lookupLast: async (fp) => {
              const last = await prisma.incident.findFirst({
                where: { deletedAt: undefined, incidentCode: { startsWith: fp } },
                orderBy: { incidentCode: "desc" },
                select: { incidentCode: true },
              });
              return last?.incidentCode ?? null;
            },
          });
          return prisma.incident.create({
            data: {
              companyCode: session.companyCode,
              incidentCode,
              authorId: author.id,
              subjectId,
              type,
              contentVi: filled.vi, contentEn: filled.en, contentKo: filled.ko, originalLang,
              visibilityManagerOnly: Boolean(p.visibilityManagerOnly ?? true),
            },
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
      );
      return ok({ incident: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      return serverError(err);
    }
  });
}
