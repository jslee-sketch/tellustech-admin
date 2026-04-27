import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, notFound, ok, optionalEnum, serverError, trimNonEmpty } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import type { Language } from "@/generated/prisma/client";

const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

type Ctx = { params: Promise<{ id: string }> };

// GET /api/finance/payables/[id]/contacts
export async function GET(_r: Request, context: Ctx) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const pr = await prisma.payableReceivable.findUnique({ where: { id }, select: { id: true } });
    if (!pr) return notFound();
    const logs = await prisma.prContactLog.findMany({
      where: { payableReceivableId: id },
      orderBy: { recordedAt: "desc" },
      include: { contactedBy: { select: { employeeCode: true, nameVi: true, nameKo: true } } },
    });
    return ok({ logs });
  });
}

// POST body: { contactNoteVi/En/Ko?, responseVi/En/Ko?, originalLang?, expectedAmount?, expectedDate?, contactedById? }
export async function POST(request: Request, context: Ctx) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const pr = await prisma.payableReceivable.findUnique({ where: { id } });
    if (!pr) return notFound();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const noteVi = trimNonEmpty(p.contactNoteVi);
      const noteEn = trimNonEmpty(p.contactNoteEn);
      const noteKo = trimNonEmpty(p.contactNoteKo);
      const respVi = trimNonEmpty(p.responseVi);
      const respEn = trimNonEmpty(p.responseEn);
      const respKo = trimNonEmpty(p.responseKo);
      const originalLang = optionalEnum(p.originalLang, LANGS) ?? "KO";

      const noteFilled = (noteVi || noteEn || noteKo)
        ? await fillTranslations({ vi: noteVi ?? null, en: noteEn ?? null, ko: noteKo ?? null, originalLang })
        : { vi: null, en: null, ko: null };
      const respFilled = (respVi || respEn || respKo)
        ? await fillTranslations({ vi: respVi ?? null, en: respEn ?? null, ko: respKo ?? null, originalLang })
        : { vi: null, en: null, ko: null };

      const expectedAmountStr = trimNonEmpty(p.expectedAmount);
      const expectedDateStr = trimNonEmpty(p.expectedDate);

      const contactedById = trimNonEmpty(p.contactedById) ?? (session.empCode
        ? (await prisma.employee.findUnique({ where: { companyCode_employeeCode: { companyCode: session.companyCode, employeeCode: session.empCode } }, select: { id: true } }))?.id ?? null
        : null);

      const created = await prisma.prContactLog.create({
        data: {
          payableReceivableId: id,
          contactedById,
          contactNoteVi: noteFilled.vi, contactNoteEn: noteFilled.en, contactNoteKo: noteFilled.ko,
          responseVi: respFilled.vi, responseEn: respFilled.en, responseKo: respFilled.ko,
          originalLang,
          expectedAmount: expectedAmountStr ?? null,
          expectedDate: expectedDateStr ? new Date(expectedDateStr) : null,
        },
      });
      return ok({ log: created }, { status: 201 });
    } catch (err) { return serverError(err); }
  });
}
