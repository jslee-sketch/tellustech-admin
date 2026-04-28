import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";
import { generateToken, generateContractToken, tokenExpiresAt } from "@/lib/snmp-token";

// POST /api/admin/snmp/generate-token
// body: { equipmentId } | { contractId }
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    let body: any;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const { equipmentId, contractId } = body ?? {};
    try {
      if (equipmentId) {
        const eq = await prisma.itContractEquipment.findUnique({ where: { id: String(equipmentId) } });
        if (!eq) return notFound();
        const token = generateToken();
        await prisma.itContractEquipment.update({
          where: { id: eq.id },
          data: { deviceToken: token, deviceTokenExpiresAt: tokenExpiresAt(), deviceTokenRevokedAt: null },
        });
        return ok({ deviceToken: token });
      }
      if (contractId) {
        const c = await prisma.itContract.findUnique({ where: { id: String(contractId) } });
        if (!c) return notFound();
        const token = generateContractToken();
        await prisma.itContract.update({
          where: { id: c.id },
          data: { contractToken: token, contractTokenExpiresAt: tokenExpiresAt() },
        });
        return ok({ contractToken: token });
      }
      return badRequest("equipmentId_or_contractId_required");
    } catch (e) { return serverError(e); }
  });
}
