import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, optionalEnum, requireString, serverError, trimNonEmpty } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import type { Language } from "@/generated/prisma/client";

// POST /api/portal/as-request — CLIENT 가 본인 거래처로 AS 티켓 발행.
// 사내 /api/as-tickets 와 분리: 거래처 ID 는 세션에서 자동, 직원 배정은 비움.
const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
    if (!user?.clientAccount) return badRequest("not_linked");

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const symptomVi = trimNonEmpty(p.symptomVi);
      const symptomEn = trimNonEmpty(p.symptomEn);
      const symptomKo = trimNonEmpty(p.symptomKo);
      const longest = Math.max(symptomVi?.length ?? 0, symptomEn?.length ?? 0, symptomKo?.length ?? 0);
      if (longest === 0) return badRequest("invalid_input", { field: "symptom" });
      const originalLang = (optionalEnum(p.originalLang, LANGS) ?? "VI") as Language;
      const filled = await fillTranslations({ vi: symptomVi ?? null, en: symptomEn ?? null, ko: symptomKo ?? null, originalLang });

      const created = await withUniqueRetry(
        async () => {
          const ticketNumber = await generateDatedCode({
            prefix: "", separator: "", digits: 2,
            // YY/MM/DD-NN 형식
            lookupLast: async () => null,
          });
          // Use existing AS prefix scheme
          const ymd = new Date();
          const yy = String(ymd.getFullYear()).slice(-2);
          const mm = String(ymd.getMonth()+1).padStart(2,'0');
          const dd = String(ymd.getDate()).padStart(2,'0');
          const fp = `${yy}/${mm}/${dd}-`;
          const last = await prisma.asTicket.findFirst({
            where: { deletedAt: undefined, ticketNumber: { startsWith: fp } },
            orderBy: { ticketNumber: "desc" }, select: { ticketNumber: true },
          });
          let next = 1;
          if (last) { const n = Number(last.ticketNumber.slice(fp.length)); if (Number.isInteger(n)) next = n + 1; }
          const finalNum = `${fp}${String(next).padStart(2,'0')}`;
          return prisma.asTicket.create({
            data: {
              ticketNumber: finalNum,
              clientId: user.clientAccount!.id,
              serialNumber: trimNonEmpty(p.serialNumber),
              symptomVi: filled.vi, symptomEn: filled.en, symptomKo: filled.ko, originalLang,
              status: "RECEIVED",
              receivedAt: new Date(),
            },
          });
        },
        { attempts: 5, isConflict: () => true },
      );
      return ok({ ticket: { id: created.id, ticketNumber: created.ticketNumber } }, { status: 201 });
    } catch (err) { return serverError(err); }
  });
}
