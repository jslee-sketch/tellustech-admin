import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, requireString, serverError, trimNonEmpty } from "@/lib/api-utils";

// GET /api/admin/item-compatibility?productItemId= → 본체 장비의 호환 소모품/부품 목록
//                                  ?consumableItemId= → 소모품/부품의 호환 본체 목록
// POST body: { productItemId, consumableItemId, note? } → 매핑 추가 (멱등)
// DELETE ?productItemId&consumableItemId → 매핑 제거

export async function GET(request: Request) {
  return withSessionContext(async () => {
    const u = new URL(request.url);
    const productItemId = trimNonEmpty(u.searchParams.get("productItemId"));
    const consumableItemId = trimNonEmpty(u.searchParams.get("consumableItemId"));
    if (!productItemId && !consumableItemId) return badRequest("invalid_input");
    const rows = await prisma.itemCompatibility.findMany({
      where: { ...(productItemId ? { productItemId } : {}), ...(consumableItemId ? { consumableItemId } : {}) },
      include: {
        product:    { select: { id: true, itemCode: true, name: true, itemType: true } },
        consumable: { select: { id: true, itemCode: true, name: true, itemType: true, unit: true, description: true } },
      },
    });
    return ok({ compatibilities: rows });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return badRequest("forbidden");
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const productItemId = requireString(p.productItemId, "productItemId");
      const consumableItemId = requireString(p.consumableItemId, "consumableItemId");
      if (productItemId === consumableItemId) return badRequest("self_mapping_not_allowed");
      const created = await prisma.itemCompatibility.upsert({
        where: { productItemId_consumableItemId: { productItemId, consumableItemId } },
        create: { productItemId, consumableItemId, note: trimNonEmpty(p.note) },
        update: { note: trimNonEmpty(p.note) },
      });
      return ok({ compatibility: created }, { status: 201 });
    } catch (err) { return serverError(err); }
  });
}

export async function DELETE(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return badRequest("forbidden");
    const u = new URL(request.url);
    const productItemId = trimNonEmpty(u.searchParams.get("productItemId"));
    const consumableItemId = trimNonEmpty(u.searchParams.get("consumableItemId"));
    if (!productItemId || !consumableItemId) return badRequest("invalid_input");
    try {
      await prisma.itemCompatibility.delete({
        where: { productItemId_consumableItemId: { productItemId, consumableItemId } },
      });
      return ok({ ok: true });
    } catch (err) { return serverError(err); }
  });
}
