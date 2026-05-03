// 기간 마감 — verify / close / reopen 액션 + 목록 조회.
import { withSessionContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-utils";
import { verifyPeriod, snapshotMonthlyBalance } from "@/lib/financial-statements";

export async function GET() {
  return withSessionContext(async () => {
    try {
      const closes = await prisma.periodClose.findMany({
        orderBy: { yearMonth: "desc" },
        take: 36,
      });
      return ok({ closes });
    } catch (e) { return serverError(e); }
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    try {
      const body = (await request.json()) as { yearMonth?: string; action?: string; reason?: string };
      const ym = body.yearMonth;
      if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return badRequest("invalid_yearMonth");
      const action = body.action;
      const cc = session.companyCode as "TV" | "VR";

      if (action === "verify") {
        const r = await verifyPeriod(ym, cc);
        const updated = await prisma.periodClose.upsert({
          where: { companyCode_yearMonth: { companyCode: cc as never, yearMonth: ym } },
          update: {
            status: r.ok ? "VERIFIED" : "OPEN",
            verifiedAt: new Date(),
            verifiedById: session.sub,
            verifyResult: r as never,
          },
          create: {
            yearMonth: ym,
            status: r.ok ? "VERIFIED" : "OPEN",
            verifiedAt: new Date(),
            verifiedById: session.sub,
            verifyResult: r as never,
          },
        });
        return ok({ close: updated, verifyResult: r });
      }

      if (action === "close") {
        // VERIFIED 상태에서만 마감 가능
        const cur = await prisma.periodClose.findUnique({
          where: { companyCode_yearMonth: { companyCode: cc as never, yearMonth: ym } },
        });
        if (!cur || cur.status !== "VERIFIED") return badRequest("not_verified");

        // AMB 동결
        const snap = await snapshotMonthlyBalance(ym, cc);
        await prisma.accountMonthlyBalance.updateMany({
          where: { companyCode: cc as never, yearMonth: ym },
          data: { isFrozen: true },
        });

        const updated = await prisma.periodClose.update({
          where: { companyCode_yearMonth: { companyCode: cc as never, yearMonth: ym } },
          data: { status: "CLOSED", closedAt: new Date(), closedById: session.sub },
        });
        return ok({ close: updated, snapshot: snap });
      }

      if (action === "reopen") {
        const cur = await prisma.periodClose.findUnique({
          where: { companyCode_yearMonth: { companyCode: cc as never, yearMonth: ym } },
        });
        if (!cur || cur.status !== "CLOSED") return badRequest("not_closed");
        const reopenReason = (body.reason ?? "").trim();
        if (!reopenReason) return badRequest("reason_required");
        await prisma.accountMonthlyBalance.updateMany({
          where: { companyCode: cc as never, yearMonth: ym },
          data: { isFrozen: false },
        });
        const updated = await prisma.periodClose.update({
          where: { companyCode_yearMonth: { companyCode: cc as never, yearMonth: ym } },
          data: { status: "REOPENED", reopenedAt: new Date(), reopenedById: session.sub, reopenReason },
        });
        return ok({ close: updated });
      }

      return badRequest("invalid_action");
    } catch (e) { return serverError(e); }
  });
}
