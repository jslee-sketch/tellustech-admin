import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, optionalEnum, serverError, trimNonEmpty } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { grantPoints } from "@/lib/portal-points";
import type { Language, FeedbackKind, PointReason } from "@/generated/prisma/client";

const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;
const KINDS: readonly FeedbackKind[] = ["PRAISE", "IMPROVE", "SUGGEST"] as const;

const REASON_BY_KIND: Record<FeedbackKind, PointReason> = {
  PRAISE: "FEEDBACK_PRAISE",
  IMPROVE: "FEEDBACK_IMPROVE",
  SUGGEST: "FEEDBACK_SUGGEST",
};

export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");
    const items = await prisma.portalFeedback.findMany({
      where: { clientId: user.clientId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { targetEmployee: { select: { employeeCode: true, nameVi: true, nameKo: true } } },
    });
    return ok({ items });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const kind = optionalEnum(p.kind, KINDS);
    if (!kind) return badRequest("invalid_input", { field: "kind" });
    const vi = trimNonEmpty(p.contentVi);
    const en = trimNonEmpty(p.contentEn);
    const ko = trimNonEmpty(p.contentKo);
    if (!(vi || en || ko)) return badRequest("invalid_input", { field: "content" });
    const originalLang = (optionalEnum(p.originalLang, LANGS) ?? "KO") as Language;
    const filled = await fillTranslations({ vi: vi ?? null, en: en ?? null, ko: ko ?? null, originalLang });
    const targetEmployeeId = trimNonEmpty(p.targetEmployeeId) ?? null;

    try {
      const created = await withUniqueRetry(
        () => generateDatedCode({
          prefix: "FB", digits: 3,
          lookupLast: async (full) => {
            const last = await prisma.portalFeedback.findFirst({ where: { feedbackCode: { startsWith: full } }, orderBy: { feedbackCode: "desc" }, select: { feedbackCode: true } });
            return last?.feedbackCode ?? null;
          },
        }).then((feedbackCode) => prisma.portalFeedback.create({
          data: {
            feedbackCode,
            clientId: user.clientId!,
            kind,
            contentVi: filled.vi, contentEn: filled.en, contentKo: filled.ko,
            originalLang,
            targetEmployeeId,
            status: "RECEIVED",
          },
        })),
        { isConflict: () => true },
      );
      const granted = await grantPoints({ clientId: user.clientId!, reason: REASON_BY_KIND[kind], linkedModel: "PortalFeedback", linkedId: created.id }).catch(() => null);
      return ok({ feedback: created, pointsEarned: granted?.pointsEarned ?? null, pointBalance: granted?.balance ?? null }, { status: 201 });
    } catch (e) { return serverError(e); }
  });
}
