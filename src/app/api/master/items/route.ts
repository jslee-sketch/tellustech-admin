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
import type { ItemType } from "@/generated/prisma/client";

const ITEM_TYPES: readonly ItemType[] = ["PRODUCT", "CONSUMABLE", "PART"] as const;

// 품목은 공유 마스터. itemCode 는 ITM-YYMMDD-### 자동 생성.

export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const itemType = optionalEnum(url.searchParams.get("type"), ITEM_TYPES);

    const where = {
      ...(itemType ? { itemType } : {}),
      ...(q
        ? {
            OR: [
              { itemCode: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
              { category: { contains: q, mode: "insensitive" as const } },
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
      const category = trimNonEmpty(p.category);

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
          return prisma.item.create({
            data: { itemCode, itemType, name, unit, category },
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
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
