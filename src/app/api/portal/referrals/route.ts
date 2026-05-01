import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError, trimNonEmpty } from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { fillTranslations } from "@/lib/translate";
import type { Language } from "@/generated/prisma/client";

export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");
    const items = await prisma.referral.findMany({
      where: { referrerClientId: user.clientId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { assignedTo: { select: { employeeCode: true, nameVi: true } } },
    });
    return ok({ items });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
    if (!user?.clientAccount) return badRequest("not_linked");
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const companyName = String(p.companyName ?? "").trim();
    const contactName = String(p.contactName ?? "").trim();
    const contactPhone = String(p.contactPhone ?? "").trim();
    if (!companyName || !contactName || !contactPhone) return badRequest("invalid_input");

    // 자기 거래처 추천 차단
    if (companyName.toLowerCase() === user.clientAccount.companyNameVi.toLowerCase()) return badRequest("self_referral");

    // 3언어 자동번역 (note 입력시)
    const noteRaw = trimNonEmpty(p.note);
    const noteOriginalLang = (trimNonEmpty(p.noteOriginalLang) as Language | undefined) ?? (session.language as Language);
    const filledNote = noteRaw
      ? await fillTranslations({
          vi: noteOriginalLang === "VI" ? noteRaw : null,
          en: noteOriginalLang === "EN" ? noteRaw : null,
          ko: noteOriginalLang === "KO" ? noteRaw : null,
          originalLang: noteOriginalLang,
        })
      : { vi: null, en: null, ko: null };

    try {
      const created = await withUniqueRetry(
        () => generateDatedCode({
          prefix: "REF", digits: 3,
          lookupLast: async (full) => {
            const last = await prisma.referral.findFirst({ where: { referralCode: { startsWith: full } }, orderBy: { referralCode: "desc" }, select: { referralCode: true } });
            return last?.referralCode ?? null;
          },
        }).then((referralCode) => prisma.referral.create({
          data: {
            referralCode,
            referrerClientId: user.clientAccount!.id,
            companyName, contactName, contactPhone,
            contactEmail: String(p.contactEmail ?? "") || null,
            note: noteRaw,
            noteVi: filledNote.vi,
            noteEn: filledNote.en,
            noteKo: filledNote.ko,
            noteOriginalLang: noteRaw ? noteOriginalLang : null,
            status: "SUBMITTED",
          },
        })),
        { isConflict: () => true },
      );
      // 추천 시점 적립 없음 — 첫 입금 시에만 100,000d (관리자 액션으로 트리거)
      return ok({ referral: created }, { status: 201 });
    } catch (e) { return serverError(e); }
  });
}
