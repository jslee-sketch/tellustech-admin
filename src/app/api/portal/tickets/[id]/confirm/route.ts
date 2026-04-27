import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, notFound, ok, serverError } from "@/lib/api-utils";

// POST /api/portal/tickets/[id]/confirm
//   COMPLETED → CONFIRMED. 본인 거래처 ticket 만 가능.
type Ctx = { params: Promise<{ id: string }> };

export async function POST(_r: Request, context: Ctx) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const { id } = await context.params;
    const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
    if (!user?.clientAccount) return badRequest("not_linked");

    const ticket = await prisma.asTicket.findUnique({ where: { id }, select: { id: true, clientId: true, status: true } });
    if (!ticket) return notFound();
    if (ticket.clientId !== user.clientAccount.id) return badRequest("not_yours");
    if (ticket.status !== "COMPLETED") return badRequest("invalid_state", { current: ticket.status, expected: "COMPLETED" });

    try {
      const updated = await prisma.asTicket.update({
        where: { id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });
      return ok({ ticket: updated });
    } catch (err) { return serverError(err); }
  });
}
