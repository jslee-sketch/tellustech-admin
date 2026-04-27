import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok } from "@/lib/api-utils";

// GET /api/portal/tickets — 본인 거래처의 AS + 소모품 요청 통합 list (4단계 status)
export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
    if (!user?.clientAccount) return badRequest("not_linked");
    const tickets = await prisma.asTicket.findMany({
      where: { clientId: user.clientAccount.id },
      orderBy: { receivedAt: "desc" },
      take: 100,
      select: {
        id: true, ticketNumber: true, kind: true, status: true,
        serialNumber: true, receivedAt: true, completedAt: true, confirmedAt: true,
        symptomKo: true, symptomVi: true, symptomEn: true,
        suppliesItems: true,
      },
    });
    return ok({ tickets });
  });
}
