import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import { generateDatedCode } from "@/lib/code-generator";
import type { ColorChannel, ItemType } from "@/generated/prisma/client";

// POST /api/master/items/bulk-import
// Body: { rows: [{...}, ...] }
// 3-phase 처리:
//   1) 모든 품목 upsert (parentItemId 미연결)
//   2) compatibleItemCodes → ItemCompatibility
//   3) parentItemCode → parentItemId/bomLevel/bomQuantity 연결

const COLOR_CHANNELS: ColorChannel[] = ["BLACK", "CYAN", "MAGENTA", "YELLOW", "DRUM", "FUSER", "NONE"];

type Row = {
  itemCode?: string;
  itemType: string;
  name: string;
  description?: string;
  unit?: string;
  reorderPoint?: string;
  colorChannel?: string;
  expectedYield?: string;
  yieldCoverageBase?: string;
  compatibleItemCodes?: string;
  parentItemCode?: string;
  bomQuantity?: string;
  bomNote?: string;
};

export async function POST(request: Request) {
  return withSessionContext(async () => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const rows = (body as { rows?: Row[] })?.rows ?? [];
    if (!Array.isArray(rows) || rows.length === 0) return badRequest("invalid_input", { field: "rows", reason: "empty" });

    let created = 0, failed = 0;
    const errors: Array<{ index: number; error: string }> = [];
    const codeToId = new Map<string, string>();

    try {
      // Phase 1: 품목 upsert
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          const itemType = r.itemType as ItemType;
          if (!["PRODUCT", "CONSUMABLE", "PART"].includes(itemType)) throw new Error("invalid_itemType");
          if (!r.name) throw new Error("name_required");
          if (!r.description) throw new Error("description_required");
          let itemCode = r.itemCode?.trim();
          if (!itemCode) {
            itemCode = await generateDatedCode({
              prefix: "ITM",
              lookupLast: async (full) => {
                const last = await prisma.item.findFirst({ where: { itemCode: { startsWith: full } }, orderBy: { itemCode: "desc" }, select: { itemCode: true } });
                return last?.itemCode ?? null;
              },
            });
          }
          const cc = r.colorChannel ? (r.colorChannel.toUpperCase() as ColorChannel) : null;
          if (cc && !COLOR_CHANNELS.includes(cc)) throw new Error("invalid_colorChannel");

          const data = {
            itemCode,
            itemType,
            name: r.name,
            description: r.description ?? "",
            unit: r.unit || null,
            reorderPoint: r.reorderPoint ? Number(r.reorderPoint) : null,
            colorChannel: cc,
            expectedYield: r.expectedYield ? Number(r.expectedYield) : null,
            yieldCoverageBase: r.yieldCoverageBase ? Number(r.yieldCoverageBase) : 5,
          };

          const upserted = await prisma.item.upsert({
            where: { itemCode },
            update: data,
            create: data,
          });
          codeToId.set(itemCode, upserted.id);
          created++;
        } catch (e: unknown) {
          failed++;
          errors.push({ index: i, error: String((e as Error)?.message ?? e) });
        }
      }

      // Phase 2: 호환 매핑 (CONSUMABLE/PART → PRODUCT)
      for (const r of rows) {
        if (!r.compatibleItemCodes) continue;
        const childId = codeToId.get((r.itemCode ?? "").trim());
        if (!childId) continue;
        const codes = r.compatibleItemCodes.split(";").map((s) => s.trim()).filter(Boolean);
        for (const code of codes) {
          let pid = codeToId.get(code);
          if (!pid) {
            const found = await prisma.item.findUnique({ where: { itemCode: code }, select: { id: true } });
            pid = found?.id;
          }
          if (!pid) continue;
          await prisma.itemCompatibility.upsert({
            where: { productItemId_consumableItemId: { productItemId: pid, consumableItemId: childId } },
            update: {},
            create: { productItemId: pid, consumableItemId: childId },
          }).catch(() => undefined);
        }
      }

      // Phase 3: BOM 부모 연결
      for (const r of rows) {
        if (!r.parentItemCode) continue;
        const childId = codeToId.get((r.itemCode ?? "").trim());
        if (!childId) continue;
        let parentId = codeToId.get(r.parentItemCode.trim());
        if (!parentId) {
          const found = await prisma.item.findUnique({ where: { itemCode: r.parentItemCode.trim() }, select: { id: true, bomLevel: true } });
          parentId = found?.id;
        }
        if (!parentId) continue;
        const parent = await prisma.item.findUnique({ where: { id: parentId }, select: { bomLevel: true, itemType: true } });
        if (!parent || parent.itemType === "PRODUCT") continue;
        if ((parent.bomLevel ?? 0) >= 3) continue;
        await prisma.item.update({
          where: { id: childId },
          data: {
            parentItemId: parentId,
            bomLevel: (parent.bomLevel ?? 0) + 1,
            bomQuantity: r.bomQuantity ? Number(r.bomQuantity) : 1,
            bomNote: r.bomNote || null,
          },
        }).catch(() => undefined);
      }

      return ok({ created, failed, errors });
    } catch (err) {
      return serverError(err);
    }
  });
}
