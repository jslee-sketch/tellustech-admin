import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, notFound, ok, serverError, trimNonEmpty } from "@/lib/api-utils";

// GET  /api/items/[id]/bom        — 트리 조회 (3단계까지)
// POST /api/items/[id]/bom        — 하위 부품 추가 { childItemId, quantity?, note? }

const MAX_LEVEL = 3;

type TreeNode = {
  item: { id: string; itemCode: string; name: string; itemType: string; description: string; bomLevel: number | null };
  quantity: number;
  note: string | null;
  children: TreeNode[];
};

async function loadChildren(parentId: string, currentLevel: number): Promise<TreeNode[]> {
  if (currentLevel > MAX_LEVEL) return [];
  const kids = await prisma.item.findMany({
    where: { parentItemId: parentId, deletedAt: null },
    orderBy: { itemCode: "asc" },
    select: { id: true, itemCode: true, name: true, itemType: true, description: true, bomLevel: true, bomQuantity: true, bomNote: true },
  });
  const nodes: TreeNode[] = [];
  for (const k of kids) {
    nodes.push({
      item: { id: k.id, itemCode: k.itemCode, name: k.name, itemType: k.itemType, description: k.description, bomLevel: k.bomLevel },
      quantity: k.bomQuantity ? Number(k.bomQuantity) : 1,
      note: k.bomNote,
      children: await loadChildren(k.id, currentLevel + 1),
    });
  }
  return nodes;
}

export async function GET(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async () => {
    const { id } = await ctx.params;
    const item = await prisma.item.findUnique({
      where: { id },
      select: { id: true, itemCode: true, name: true, itemType: true, description: true, bomLevel: true },
    });
    if (!item) return notFound();
    const tree = await loadChildren(id, (item.bomLevel ?? 0) + 1);
    return ok({ item, children: tree });
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async () => {
    const { id: parentId } = await ctx.params;
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;

    const childItemId = trimNonEmpty(p.childItemId);
    if (!childItemId) return badRequest("invalid_input", { field: "childItemId", reason: "required" });
    const quantity = p.quantity !== undefined && p.quantity !== "" ? Number(p.quantity) : 1;
    if (!Number.isFinite(quantity) || quantity <= 0) return badRequest("invalid_input", { field: "quantity" });
    const note = trimNonEmpty(p.note);

    try {
      const parent = await prisma.item.findUnique({ where: { id: parentId }, select: { id: true, itemType: true, bomLevel: true } });
      if (!parent) return notFound();
      // PRODUCT 는 BOM 부모 불가
      if (parent.itemType === "PRODUCT") return badRequest("invalid_input", { field: "parent", reason: "product_cannot_have_bom" });
      const parentLevel = parent.bomLevel ?? 0;
      if (parentLevel >= MAX_LEVEL) return badRequest("invalid_input", { field: "parent", reason: "max_depth_exceeded" });

      const child = await prisma.item.findUnique({ where: { id: childItemId }, select: { id: true, itemType: true, parentItemId: true } });
      if (!child) return notFound();
      if (child.id === parent.id) return badRequest("invalid_input", { field: "childItemId", reason: "self_reference" });
      if (child.itemType === "PRODUCT") return badRequest("invalid_input", { field: "childItemId", reason: "product_cannot_be_part" });

      // 순환 참조 검사 — parent 의 조상 체인에 child 가 있으면 차단.
      let cursor: { id: string; parentItemId: string | null } | null = await prisma.item.findUnique({
        where: { id: parent.id },
        select: { id: true, parentItemId: true },
      });
      const ancestors: string[] = [];
      let depth = 0;
      while (cursor && cursor.parentItemId && depth < 10) {
        ancestors.push(cursor.parentItemId);
        if (cursor.parentItemId === child.id) {
          return badRequest("invalid_input", { field: "childItemId", reason: "cycle_detected" });
        }
        cursor = await prisma.item.findUnique({ where: { id: cursor.parentItemId }, select: { id: true, parentItemId: true } });
        depth++;
      }

      // child 가 다른 부모를 갖고 있으면 거절 (BOM 1:N 만 허용 — 한 부품은 한 부모).
      if (child.parentItemId && child.parentItemId !== parent.id) {
        return badRequest("invalid_input", { field: "childItemId", reason: "already_has_parent" });
      }

      const updated = await prisma.item.update({
        where: { id: child.id },
        data: {
          parentItemId: parent.id,
          bomQuantity: quantity,
          bomLevel: parentLevel + 1,
          bomNote: note,
        },
      });
      return ok({ item: updated }, { status: 201 });
    } catch (err) {
      return serverError(err);
    }
  });
}
