import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  optionalEnum,
  requireEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import type { ColorChannel, ItemType } from "@/generated/prisma/client";

const ITEM_TYPES: readonly ItemType[] = ["PRODUCT", "CONSUMABLE", "PART", "SUPPLIES"] as const;
const COLOR_CHANNELS: readonly ColorChannel[] = ["BLACK", "CYAN", "MAGENTA", "YELLOW", "DRUM", "FUSER", "NONE"] as const;

function parseYieldInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= 10000000 ? n : null;
}
function parseCoverage(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
}

// 품목은 공유 마스터. itemCode 는 ITM-YYMMDD-### 자동 생성.

export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const itemType = optionalEnum(url.searchParams.get("type"), ITEM_TYPES);
    const compatSn = trimNonEmpty(url.searchParams.get("compatibleWithSn"));
    const compatItemId = trimNonEmpty(url.searchParams.get("compatibleWithItemId"));

    // 호환 필터링 — 지정 PRODUCT 의 호환 소모품/부품 ID 목록만 매칭.
    let allowedConsumableIds: string[] | null = null;
    if (compatSn || compatItemId) {
      let productItemId: string | null = null;
      if (compatItemId) productItemId = compatItemId;
      else if (compatSn) {
        const eq = await prisma.itContractEquipment.findFirst({
          where: { serialNumber: compatSn, removedAt: null },
          select: { itemId: true },
        });
        productItemId = eq?.itemId ?? null;
      }
      if (productItemId) {
        const compats = await prisma.itemCompatibility.findMany({
          where: { productItemId },
          select: { consumableItemId: true },
        });
        allowedConsumableIds = compats.map((c) => c.consumableItemId);
        if (allowedConsumableIds.length === 0) return ok({ items: [] });
      }
    }

    const where = {
      ...(itemType ? { itemType } : {}),
      ...(allowedConsumableIds ? { id: { in: allowedConsumableIds } } : {}),
      ...(q
        ? {
            OR: [
              { itemCode: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const items = await prisma.item.findMany({
      where,
      orderBy: { itemCode: "desc" },
      take: 500,
    });
    return ok({ items });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const itemType = requireEnum(p.itemType, ITEM_TYPES, "itemType");
      const name = requireString(p.name, "name");
      if (!/^[\x20-\x7E]+$/.test(name)) {
        return badRequest("invalid_input", { field: "name", reason: "english_only" });
      }
      const unit = trimNonEmpty(p.unit);
      const description = trimNonEmpty(p.description) ?? "";
      const expectedYield = parseYieldInt(p.expectedYield);
      const yieldCoverageBase = parseCoverage(p.yieldCoverageBase);
      const colorChannel = optionalEnum(p.colorChannel as string | null, COLOR_CHANNELS);
      const compatibleItemIds = Array.isArray(p.compatibleItemIds)
        ? (p.compatibleItemIds as unknown[]).filter((s): s is string => typeof s === "string" && s.length > 0)
        : [];

      // CONSUMABLE/PART 는 호환 장비(=PRODUCT) 최소 1개 필수.
      if ((itemType === "CONSUMABLE" || itemType === "PART") && compatibleItemIds.length === 0) {
        return badRequest("invalid_input", { field: "compatibleItemIds", reason: "required_for_consumable_part" });
      }

      const created = await withUniqueRetry(
        async () => {
          const itemCode = await generateDatedCode({
            prefix: "ITM",
            lookupLast: async (fullPrefix) => {
              const last = await prisma.item.findFirst({
                where: { deletedAt: undefined, itemCode: { startsWith: fullPrefix } },
                orderBy: { itemCode: "desc" },
                select: { itemCode: true },
              });
              return last?.itemCode ?? null;
            },
          });
          return prisma.$transaction(async (tx) => {
            const item = await tx.item.create({
              data: {
                itemCode, itemType, name, unit, description,
                ...(itemType === "CONSUMABLE" || itemType === "PART"
                  ? {
                      expectedYield,
                      yieldCoverageBase: yieldCoverageBase ?? 5,
                      colorChannel: colorChannel ?? null,
                    }
                  : {}),
              },
            });
            // 호환 장비 매핑 — CONSUMABLE/PART 만, PRODUCT 는 매핑 안 함.
            if (compatibleItemIds.length > 0 && (itemType === "CONSUMABLE" || itemType === "PART")) {
              await tx.itemCompatibility.createMany({
                data: compatibleItemIds.map((pid) => ({
                  productItemId: pid,
                  consumableItemId: item.id,
                })),
                skipDuplicates: true,
              });
            }
            return item;
          });
        },
        { isConflict: isUniqueConstraintError },
      );

      return ok({ item: created }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
