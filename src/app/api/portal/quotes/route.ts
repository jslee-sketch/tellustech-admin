import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, optionalEnum, serverError, trimNonEmpty } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { grantPoints } from "@/lib/portal-points";
import type { Language, QuoteType } from "@/generated/prisma/client";

const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;
const TYPES: readonly QuoteType[] = ["RENTAL_IT", "RENTAL_TM", "CALIBRATION", "REPAIR", "PURCHASE", "MAINTENANCE", "OTHER"] as const;

// GET /api/portal/quotes — 본인 견적 목록
export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");
    try {
      const items = await prisma.quoteRequest.findMany({
        where: { clientId: user.clientId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { assignedTo: { select: { employeeCode: true, nameVi: true, nameKo: true } } },
      });
      return ok({ items });
    } catch (e) { return serverError(e); }
  });
}

// POST /api/portal/quotes — 견적 요청 (+포인트)
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
    if (!user?.clientAccount) return badRequest("not_linked");

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const quoteType = optionalEnum(p.quoteType, TYPES);
    if (!quoteType) return badRequest("invalid_input", { field: "quoteType" });
    const titleVi = trimNonEmpty(p.titleVi);
    const titleEn = trimNonEmpty(p.titleEn);
    const titleKo = trimNonEmpty(p.titleKo);
    const descVi = trimNonEmpty(p.descriptionVi);
    const descEn = trimNonEmpty(p.descriptionEn);
    const descKo = trimNonEmpty(p.descriptionKo);
    if (!(titleVi || titleEn || titleKo)) return badRequest("invalid_input", { field: "title" });
    const originalLang = (optionalEnum(p.originalLang, LANGS) ?? "KO") as Language;
    const titleFilled = await fillTranslations({ vi: titleVi ?? null, en: titleEn ?? null, ko: titleKo ?? null, originalLang });
    const descFilled = (descVi || descEn || descKo) ? await fillTranslations({ vi: descVi ?? null, en: descEn ?? null, ko: descKo ?? null, originalLang }) : { vi: null, en: null, ko: null };

    try {
      const created = await withUniqueRetry(
        () => generateDatedCode({
          prefix: "QR", digits: 3,
          lookupLast: async (full) => {
            const last = await prisma.quoteRequest.findFirst({ where: { quoteCode: { startsWith: full } }, orderBy: { quoteCode: "desc" }, select: { quoteCode: true } });
            return last?.quoteCode ?? null;
          },
        }).then((quoteCode) => prisma.quoteRequest.create({
          data: {
            quoteCode,
            clientId: user.clientAccount!.id,
            companyCode: user.clientAccount!.companyNameVi.includes("VR") ? "VR" : "TV",
            titleVi: titleFilled.vi, titleEn: titleFilled.en, titleKo: titleFilled.ko,
            descriptionVi: descFilled.vi, descriptionEn: descFilled.en, descriptionKo: descFilled.ko,
            originalLang,
            quoteType,
            quantity: typeof p.quantity === "number" ? p.quantity : null,
            desiredStartDate: p.desiredStartDate ? new Date(String(p.desiredStartDate)) : null,
            desiredEndDate: p.desiredEndDate ? new Date(String(p.desiredEndDate)) : null,
            status: "REQUESTED",
          },
        })),
        { isConflict: () => true },
      );
      const granted = await grantPoints({ clientId: user.clientAccount!.id, reason: "QUOTE_REQUEST", linkedModel: "QuoteRequest", linkedId: created.id }).catch(() => null);
      // 알림 — 포탈 견적 요청 → 담당 영업
      try {
        const { dispatchNotification } = await import("@/lib/notify/dispatcher");
        const client = await prisma.client.findUnique({
          where: { id: user.clientAccount!.id },
          select: { companyNameKo: true, companyNameVi: true, salesPicId: true },
        });
        await dispatchNotification({
          eventType: "PORTAL_QUOTE_REQUEST",
          companyCode: session.companyCode as "TV" | "VR",
          data: {
            assigneeId: client?.salesPicId ?? "",
            clientName: client?.companyNameKo ?? client?.companyNameVi ?? "",
            quoteType, budget: p.quantity ? `qty=${p.quantity}` : "—",
          },
          linkedModel: "QuoteRequest", linkedId: created.id,
          linkUrl: `/admin/quotes/${created.id}`,
        });
      } catch (e) { console.error("[portal-quote] notify failed:", e); }
      return ok({ quote: created, pointsEarned: granted?.pointsEarned ?? null, pointBalance: granted?.balance ?? null }, { status: 201 });
    } catch (e) { return serverError(e); }
  });
}
