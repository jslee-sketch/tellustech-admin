import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, requireString, serverError, trimNonEmpty } from "@/lib/api-utils";

// POST /api/portal/supplies-request — CLIENT 가 소모품 추가 요청.
// 사내에서는 별도 워크플로 없으므로 AsTicket 의 SUPPLIES 변형으로 만들거나
// — 단순화: AsTicket(reason="SUPPLIES_REQUEST" 가 enum 에 없으니) 일반 티켓으로
//   증상 필드에 "[소모품 요청] item × qty" 텍스트 박아 넣음. 후속 정식화 가능.

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
    if (!user?.clientAccount) return badRequest("not_linked");

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const itemId = requireString(p.itemId, "itemId");
      const quantity = Number(p.quantity ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) return badRequest("invalid_input", { field: "quantity" });
      const note = trimNonEmpty(p.note) ?? "";

      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) return badRequest("invalid_item");

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

      const symptom = `[소모품 요청 / Yêu cầu vật tư] ${item.itemCode} · ${item.name} × ${quantity}${note ? ` — ${note}` : ""}`;
      const created = await prisma.asTicket.create({
        data: {
          ticketNumber: finalNum,
          clientId: user.clientAccount!.id,
          symptomVi: symptom, symptomKo: symptom, symptomEn: symptom,
          originalLang: "VI",
          status: "RECEIVED",
          receivedAt: new Date(),
        },
      });
      return ok({ ticket: { id: created.id, ticketNumber: created.ticketNumber } }, { status: 201 });
    } catch (err) { return serverError(err); }
  });
}
