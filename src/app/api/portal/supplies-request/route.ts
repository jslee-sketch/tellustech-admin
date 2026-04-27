import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError, trimNonEmpty } from "@/lib/api-utils";
import { grantPoints } from "@/lib/portal-points";
import { Prisma } from "@/generated/prisma/client";

// POST /api/portal/supplies-request
//   body: { items: [{ itemId, quantity, note? }] }  — multi-item
//   호환성 검증: 각 itemId 가 본인 활성 장비의 호환 매핑(ItemCompatibility)에 존재해야 함.
//   AsTicket(kind=SUPPLIES_REQUEST) 생성 + suppliesItems JSON 저장.
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
    if (!user?.clientAccount) return badRequest("not_linked");

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const rawItems = Array.isArray(p.items) ? (p.items as Array<{ itemId?: string; quantity?: number; note?: string }>) : [];
    if (rawItems.length === 0) return badRequest("invalid_input", { field: "items" });

    // 호환성 화이트리스트 — 본인 활성 장비의 호환 소모품 itemId 집합
    const clientId = user.clientAccount.id;
    const [itEq, tmItems] = await Promise.all([
      prisma.itContractEquipment.findMany({ where: { itContract: { clientId }, removedAt: null }, select: { itemId: true } }),
      prisma.tmRentalItem.findMany({ where: { tmRental: { clientId }, endDate: { gte: new Date() } }, select: { itemId: true } }),
    ]);
    const productIds = [...new Set([...itEq, ...tmItems].map(x => x.itemId))];
    const compats = await prisma.itemCompatibility.findMany({
      where: { productItemId: { in: productIds } },
      select: { consumableItemId: true },
    });
    const allowed = new Set(compats.map(c => c.consumableItemId));

    const itemsParsed: Array<{ itemId: string; quantity: number; note: string | null }> = [];
    for (const it of rawItems) {
      const itemId = trimNonEmpty(it.itemId);
      const quantity = Number(it.quantity ?? 0);
      if (!itemId || !Number.isFinite(quantity) || quantity <= 0) return badRequest("invalid_input", { field: "items.itemId/quantity" });
      if (!allowed.has(itemId)) return badRequest("not_compatible", { itemId });
      itemsParsed.push({ itemId, quantity, note: trimNonEmpty(it.note) });
    }

    try {
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

      // 한 줄 요약 — 첫 품목 + N건
      const itemNames = await prisma.item.findMany({
        where: { id: { in: itemsParsed.map(x => x.itemId) } },
        select: { id: true, itemCode: true, name: true },
      });
      const nameById = new Map(itemNames.map(i => [i.id, `${i.itemCode} · ${i.name}`]));
      const summary = itemsParsed.map(x => `${nameById.get(x.itemId) ?? x.itemId} × ${x.quantity}`).join(", ");
      const symptom = `[소모품 요청 / Yêu cầu vật tư] ${summary}`;

      const created = await prisma.asTicket.create({
        data: {
          ticketNumber: finalNum,
          kind: "SUPPLIES_REQUEST",
          clientId,
          symptomVi: symptom, symptomKo: symptom, symptomEn: symptom,
          originalLang: "KO",
          status: "RECEIVED",
          receivedAt: new Date(),
          suppliesItems: itemsParsed as unknown as Prisma.InputJsonValue,
        },
      });
      const granted = await grantPoints({
        clientId,
        reason: "SUPPLIES_REQUEST",
        linkedModel: "AsTicket",
        linkedId: created.id,
      }).catch(() => null);
      return ok({
        ticket: { id: created.id, ticketNumber: created.ticketNumber },
        pointsEarned: granted?.pointsEarned ?? null,
        pointBalance: granted?.balance ?? null,
      }, { status: 201 });
    } catch (err) { return serverError(err); }
  });
}
