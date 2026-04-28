import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { forbidden, ok, serverError } from "@/lib/api-utils";

// 계약별 장비 + 토큰 상태 + 마지막 수집일
export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const url = new URL(request.url);
    const where: any = { removedAt: null };
    const cid = url.searchParams.get("contractId"); if (cid) where.itContractId = cid;
    try {
      const items = await prisma.itContractEquipment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 500,
        include: {
          itContract: { select: { contractNumber: true, client: { select: { clientCode: true, companyNameVi: true } } } },
          item: { select: { name: true } },
        },
      });
      const out = items.map((eq) => ({
        id: eq.id,
        serialNumber: eq.serialNumber,
        itemName: eq.item.name,
        deviceIp: eq.deviceIp,
        deviceModel: eq.deviceModel,
        hasToken: !!eq.deviceToken && !eq.deviceTokenRevokedAt,
        tokenExpiresAt: eq.deviceTokenExpiresAt,
        tokenRevokedAt: eq.deviceTokenRevokedAt,
        lastReadingAt: eq.lastReadingAt,
        contractNumber: eq.itContract.contractNumber,
        clientCode: eq.itContract.client.clientCode,
        clientName: eq.itContract.client.companyNameVi,
      }));
      return ok({ items: out });
    } catch (e) { return serverError(e); }
  });
}
