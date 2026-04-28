import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";

// POST /api/snmp/readings/manual
// 관리자 세션. body: { equipmentId, totalPages, bwPages?, colorPages?, collectedAt? }
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    let body: any;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const equipmentId = String(body?.equipmentId ?? "").trim();
    if (!equipmentId) return badRequest("equipmentId_required");

    const eq = await prisma.itContractEquipment.findUnique({ where: { id: equipmentId }, include: { itContract: { select: { id: true, clientId: true } }, item: { select: { name: true } } } });
    if (!eq) return notFound();
    if (eq.removedAt) return badRequest("equipment_removed");

    const collectedAt = body?.collectedAt ? new Date(String(body.collectedAt)) : new Date();
    const totalPages = Number(body?.totalPages ?? 0);
    if (!Number.isFinite(totalPages) || totalPages < 0) return badRequest("invalid_total_pages");

    // 음수/리셋 감지
    const prev = await prisma.snmpReading.findFirst({
      where: { equipmentId, collectedAt: { lt: collectedAt } },
      orderBy: { collectedAt: "desc" },
      select: { totalPages: true },
    });
    const isCounterReset = prev ? totalPages < prev.totalPages : false;

    try {
      const reading = await prisma.snmpReading.create({
        data: {
          equipmentId,
          contractId: eq.itContract.id,
          clientId: eq.itContract.clientId,
          brand: "—",
          itemName: eq.item.name,
          serialNumber: eq.serialNumber,
          totalPages,
          bwPages: body?.bwPages !== undefined && body?.bwPages !== null ? Number(body.bwPages) : null,
          colorPages: body?.colorPages !== undefined && body?.colorPages !== null ? Number(body.colorPages) : null,
          collectedAt,
          collectedBy: "MANUAL",
          isCounterReset,
          companyCode: "TV",
        },
      });
      await prisma.itContractEquipment.update({ where: { id: equipmentId }, data: { lastReadingAt: collectedAt } });
      return ok({ reading }, { status: 201 });
    } catch (e: any) {
      if (String(e?.code) === "P2002") return badRequest("duplicate_reading");
      return serverError(e);
    }
  });
}
