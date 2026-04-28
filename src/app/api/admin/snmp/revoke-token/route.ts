import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";

// POST /api/admin/snmp/revoke-token — body: { equipmentId }
// 즉시 deviceTokenRevokedAt = now → authDeviceToken 검증 시 즉시 거절.
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    let body: any;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const { equipmentId } = body ?? {};
    if (!equipmentId) return badRequest("equipmentId_required");
    try {
      const eq = await prisma.itContractEquipment.findUnique({ where: { id: String(equipmentId) } });
      if (!eq) return notFound();
      await prisma.itContractEquipment.update({
        where: { id: eq.id },
        data: { deviceTokenRevokedAt: new Date() },
      });
      return ok({ revoked: true });
    } catch (e) { return serverError(e); }
  });
}
