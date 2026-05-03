import { withSessionContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api-utils";

export async function GET(request: Request) {
  return withSessionContext(async () => {
    try {
      const u = new URL(request.url);
      const channel = u.searchParams.get("channel");
      const status = u.searchParams.get("status");
      const limit = Math.min(500, Number(u.searchParams.get("limit") ?? 200));

      const where: Record<string, unknown> = {};
      if (channel && ["EMAIL", "ZALO", "CHAT"].includes(channel)) where.channel = channel;
      if (status && ["PENDING", "SENT", "FAILED", "RETRY"].includes(status)) where.status = status;

      const deliveries = await prisma.notificationDelivery.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          notification: { select: { eventType: true, titleKo: true, titleVi: true, titleEn: true, linkUrl: true } },
        },
      });
      return ok({ deliveries });
    } catch (e) { return serverError(e); }
  });
}
