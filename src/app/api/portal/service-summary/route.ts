import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import { getServicePayments } from "@/lib/portal-payment-status";

// GET /api/portal/service-summary — 메인 페이지용 6종 서비스 + 미결제 요약
export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");

    try {
      const clientId = user.clientId;
      const [oaContracts, tmRentals, repairs, calibrations, maintenance, purchases] = await Promise.all([
        prisma.itContract.findMany({ where: { clientId, deletedAt: null }, select: { id: true, equipment: { where: { removedAt: null }, select: { id: true } } } }),
        prisma.tmRental.findMany({ where: { clientId, deletedAt: null }, select: { id: true, items: { select: { id: true } } } }),
        prisma.sales.count({ where: { clientId, deletedAt: null, project: { is: { salesType: "REPAIR" } } } }),
        prisma.sales.count({ where: { clientId, deletedAt: null, project: { is: { salesType: "CALIBRATION" } } } }),
        prisma.sales.count({ where: { clientId, deletedAt: null, project: { is: { salesType: "MAINTENANCE" } } } }),
        prisma.sales.count({ where: { clientId, deletedAt: null, project: { is: { salesType: "TRADE" } } } }),
      ]);

      // 미결제 합산 — 6종 모두 합치기
      const types = ["oa_rental", "tm_rental", "repair", "calibration", "maintenance", "purchase"] as const;
      const summaries = await Promise.all(types.map((t) => getServicePayments(clientId, t)));
      const unpaid = summaries.reduce(
        (acc, s) => ({
          count: acc.count + s.summary.unpaidCount,
          amount: acc.amount + s.summary.totalUnpaid,
          overdueCount: acc.overdueCount + s.summary.overdueCount,
        }),
        { count: 0, amount: 0, overdueCount: 0 },
      );

      const oaEqCount = oaContracts.reduce((n, c) => n + c.equipment.length, 0);
      const tmEqCount = tmRentals.reduce((n, r) => n + r.items.length, 0);

      return ok({
        oaRental:    { contractCount: oaContracts.length, equipmentCount: oaEqCount },
        tmRental:    { contractCount: tmRentals.length, equipmentCount: tmEqCount },
        repair:      { activeCount: repairs },
        calibration: { activeCount: calibrations },
        maintenance: { activeCount: maintenance },
        purchase:    { recentCount: purchases },
        unpaid,
      });
    } catch (e) { return serverError(e); }
  });
}
