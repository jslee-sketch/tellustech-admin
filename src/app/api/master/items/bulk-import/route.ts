import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import { generateDatedCode } from "@/lib/code-generator";
import type { ColorChannel, ItemType } from "@/generated/prisma/client";

// POST /api/master/items/bulk-import
// Body: { rows: [{...}, ...] } — 최대 1000건 권장 (그 이상은 분할 업로드).
// 3-phase 처리: (1) 품목 upsert (2) 호환 매핑 (3) BOM 부모 연결.
// 각 phase 는 청크 단위 병렬 (Promise.all) — 수백 행도 30초 안에 처리.

export const maxDuration = 300; // 5분 — Vercel/Railway 의 라우트 핸들러 타임아웃 확장.

const COLOR_CHANNELS: ColorChannel[] = ["BLACK", "CYAN", "MAGENTA", "YELLOW", "DRUM", "FUSER", "NONE"];
const MAX_ROWS = 2000;
const CHUNK_SIZE = 25; // DB 커넥션 풀 부하 회피 + 충분한 동시성.

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
    if (rows.length > MAX_ROWS) return badRequest("invalid_input", { field: "rows", reason: `max_${MAX_ROWS}_per_upload` });

    let created = 0, failed = 0;
    // 행별 상세 에러 — 사용자에게 어떤 행/어떤 필드가 누락됐는지 안내.
    const errors: Array<{ row: number; itemCode?: string; field: string; reason: string }> = [];
    const codeToId = new Map<string, string>();

    // 단일 행 처리 함수 — 청크 병렬화에 사용.
    async function processRow(r: Row, rowNum: number): Promise<void> {
      try {
          // ── 필수 검증 ──
          const itemType = (r.itemType ?? "").trim().toUpperCase() as ItemType;
          if (!itemType) throw { field: "itemType", reason: "missing_required" };
          if (!["PRODUCT", "CONSUMABLE", "PART"].includes(itemType)) throw { field: "itemType", reason: "invalid_value" };
          if (!r.name?.trim()) throw { field: "name", reason: "missing_required" };
          if (!r.description?.trim()) throw { field: "description", reason: "missing_required" };
          // CONSUMABLE/PART 는 호환 장비 최소 1건 필수.
          if (itemType !== "PRODUCT") {
            const compatList = (r.compatibleItemCodes ?? "").split(";").map((s) => s.trim()).filter(Boolean);
            if (compatList.length === 0) throw { field: "compatibleItemCodes", reason: "missing_required_for_consumable_part" };
          }
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
          if (cc && !COLOR_CHANNELS.includes(cc)) throw { field: "colorChannel", reason: "invalid_value" };

          // PRODUCT 는 소모품 전용 필드(yield/coverage/colorChannel) 무시.
          // CONSUMABLE/PART 만 실제 값 적용. yieldCoverageBase 도 빈칸이면 null 유지.
          const isConsumablePart = itemType === "CONSUMABLE" || itemType === "PART";
          const data = {
            itemCode,
            itemType,
            name: r.name,
            description: r.description ?? "",
            unit: r.unit || null,
            reorderPoint: r.reorderPoint ? Number(r.reorderPoint) : null,
            ...(isConsumablePart
              ? {
                  colorChannel: cc,
                  expectedYield: r.expectedYield ? Number(r.expectedYield) : null,
                  yieldCoverageBase: r.yieldCoverageBase ? Number(r.yieldCoverageBase) : 5,
                }
              : {
                  colorChannel: null,
                  expectedYield: null,
                  yieldCoverageBase: null,
                }),
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
          const fe = e as { field?: string; reason?: string };
          if (fe?.field && fe?.reason) {
            errors.push({ row: rowNum, itemCode: r.itemCode?.trim(), field: fe.field, reason: fe.reason });
          } else {
            errors.push({ row: rowNum, itemCode: r.itemCode?.trim(), field: "_unknown", reason: String((e as Error)?.message ?? e) });
          }
        }
    }

    try {
      // Phase 1: 청크 병렬 (CHUNK_SIZE 행씩 Promise.all).
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const slice = rows.slice(i, i + CHUNK_SIZE);
        await Promise.all(slice.map((r, j) => processRow(r, i + j + 2)));
      }

      // Phase 2: 호환 매핑 (CONSUMABLE/PART → PRODUCT) — flat 후 청크 병렬.
      const compatTasks: Array<{ pid: string; childId: string }> = [];
      for (const r of rows) {
        if (!r.compatibleItemCodes || r.itemType === "PRODUCT") continue;
        const childId = codeToId.get((r.itemCode ?? "").trim());
        if (!childId) continue;
        const codes = r.compatibleItemCodes.split(";").map((s) => s.trim()).filter(Boolean);
        for (const code of codes) {
          let pid = codeToId.get(code);
          if (!pid) {
            const found = await prisma.item.findUnique({ where: { itemCode: code }, select: { id: true } });
            pid = found?.id;
          }
          if (pid) compatTasks.push({ pid, childId });
        }
      }
      for (let i = 0; i < compatTasks.length; i += CHUNK_SIZE) {
        const slice = compatTasks.slice(i, i + CHUNK_SIZE);
        await Promise.all(slice.map(({ pid, childId }) =>
          prisma.itemCompatibility.upsert({
            where: { productItemId_consumableItemId: { productItemId: pid, consumableItemId: childId } },
            update: {},
            create: { productItemId: pid, consumableItemId: childId },
          }).catch(() => undefined),
        ));
      }

      // Phase 3: BOM 부모 연결 (PRODUCT 는 BOM 자식 불가) — 청크 병렬.
      type BomTask = { childId: string; parentId: string; level: number; quantity: number; note: string | null };
      const bomTasks: BomTask[] = [];
      for (const r of rows) {
        if (!r.parentItemCode || r.itemType === "PRODUCT") continue;
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
        bomTasks.push({
          childId,
          parentId,
          level: (parent.bomLevel ?? 0) + 1,
          quantity: r.bomQuantity ? Number(r.bomQuantity) : 1,
          note: r.bomNote || null,
        });
      }
      for (let i = 0; i < bomTasks.length; i += CHUNK_SIZE) {
        const slice = bomTasks.slice(i, i + CHUNK_SIZE);
        await Promise.all(slice.map((t) =>
          prisma.item.update({
            where: { id: t.childId },
            data: { parentItemId: t.parentId, bomLevel: t.level, bomQuantity: t.quantity, bomNote: t.note },
          }).catch(() => undefined),
        ));
      }

      return ok({ created, failed, errors });
    } catch (err) {
      return serverError(err);
    }
  });
}
