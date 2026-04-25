import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, notFound, ok, requireEnum, serverError, trimNonEmpty } from "@/lib/api-utils";
import { fillTranslations } from "@/lib/translate";
import type { InventoryStatus, Language } from "@/generated/prisma/client";

const STATUSES: readonly InventoryStatus[] = ["NORMAL", "NEEDS_REPAIR", "PARTS_USED", "IRREPARABLE"] as const;
const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/inventory/items/[id]/status
// body: { status, remarkContent?, remarkLang? }
// 처리: 상태변경 + 자동 비고 생성 + Claude 자동번역
export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) return notFound();

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;

    try {
      const status = requireEnum(p.status, STATUSES, "status");
      const remarkContent = trimNonEmpty(p.remarkContent);
      const remarkLang = (trimNonEmpty(p.remarkLang) as Language | undefined) ?? "KO";
      if (!LANGS.includes(remarkLang)) return badRequest("invalid_input", { field: "remarkLang" });

      await prisma.$transaction(async (tx) => {
        await tx.inventoryItem.update({
          where: { id },
          data: { status, lastStatusChange: new Date() },
        });

        if (remarkContent) {
          // 3언어 자동번역
          const filled = await fillTranslations({
            vi: remarkLang === "VI" ? remarkContent : null,
            en: remarkLang === "EN" ? remarkContent : null,
            ko: remarkLang === "KO" ? remarkContent : null,
            originalLang: remarkLang,
          });
          await tx.inventoryRemark.create({
            data: {
              inventoryItemId: id,
              contentVi: filled.vi,
              contentEn: filled.en,
              contentKo: filled.ko,
              originalLang: remarkLang,
              date: new Date(),
            },
          });
        } else {
          // 자동 비고 (상태 변경 사유 명시 안 됐을 때)
          const auto = `상태 변경: ${existing.status} → ${status}`;
          const filled = await fillTranslations({
            vi: null, en: null, ko: auto, originalLang: "KO",
          });
          await tx.inventoryRemark.create({
            data: {
              inventoryItemId: id,
              contentVi: filled.vi,
              contentEn: filled.en,
              contentKo: filled.ko ?? auto,
              originalLang: "KO",
              date: new Date(),
            },
          });
        }
      });

      const updated = await prisma.inventoryItem.findUnique({
        where: { id },
        include: { remarks: { orderBy: { date: "desc" }, take: 5 } },
      });
      return ok({ item: updated });
    } catch (err) {
      return serverError(err);
    }
  });
}
