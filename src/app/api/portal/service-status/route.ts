import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import { getServicePayments, type ServiceType } from "@/lib/portal-payment-status";

const VALID: ServiceType[] = ["oa_rental", "tm_rental", "repair", "calibration", "maintenance", "purchase"];

// GET /api/portal/service-status?type=oa_rental|tm_rental|repair|calibration|maintenance|purchase
export async function GET(req: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");

    const url = new URL(req.url);
    const type = url.searchParams.get("type") as ServiceType | null;
    if (!type || !VALID.includes(type)) return badRequest("invalid_type");

    try {
      const clientId = user.clientId;
      let contracts: any[] = [];

      if (type === "oa_rental") {
        const list = await prisma.itContract.findMany({
          where: { clientId, deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true, contractNumber: true, status: true, startDate: true, endDate: true,
            equipment: {
              where: { removedAt: null },
              select: { serialNumber: true, monthlyBaseFee: true, installedAt: true, item: { select: { name: true } } },
            },
          },
        });
        contracts = list.map((c) => ({
          code: c.contractNumber,
          status: c.status,
          startDate: c.startDate?.toISOString().slice(0, 10) ?? null,
          endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
          equipmentCount: c.equipment.length,
          equipment: c.equipment.map((e) => ({
            serialNumber: e.serialNumber,
            itemName: e.item.name,
            monthlyFee: Number(e.monthlyBaseFee ?? 0),
            installedAt: e.installedAt?.toISOString().slice(0, 10) ?? null,
          })),
        }));
      } else if (type === "tm_rental") {
        const list = await prisma.tmRental.findMany({
          where: { clientId, deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true, rentalCode: true, startDate: true, endDate: true,
            items: {
              select: { serialNumber: true, salesPrice: true, startDate: true, endDate: true, item: { select: { name: true } } },
            },
          },
        });
        contracts = list.map((r) => ({
          code: r.rentalCode,
          status: "ACTIVE",
          startDate: r.startDate?.toISOString().slice(0, 10) ?? null,
          endDate: r.endDate?.toISOString().slice(0, 10) ?? null,
          equipmentCount: r.items.length,
          equipment: r.items.map((it) => ({
            serialNumber: it.serialNumber,
            itemName: it.item.name,
            monthlyFee: Number(it.salesPrice ?? 0),
            installedAt: it.startDate?.toISOString().slice(0, 10) ?? null,
          })),
        }));
      }
      // repair / calibration / maintenance / purchase 는 계약 개념 없음 (건별 매출만) — contracts: []

      const { payments, summary } = await getServicePayments(clientId, type);
      const isEmpty = contracts.length === 0 && payments.length === 0;
      return ok({ contracts, payments, summary, isEmpty });
    } catch (e) { return serverError(e); }
  });
}
