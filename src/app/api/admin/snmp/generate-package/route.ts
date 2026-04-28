import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, serverError } from "@/lib/api-utils";
import { generateToken, generateContractToken, tokenExpiresAt } from "@/lib/snmp-token";

// POST /api/admin/snmp/generate-package
// body: { contractId }
// 응답: 에이전트 config.json (관리자가 다운로드 → ZIP 으로 USB 복사)
//
// Phase 1 단순화: 실제 ZIP 빌드는 Phase 2 (에이전트 코드 합쳐 빌드 시점) 에서.
// 여기서는 토큰 발급 + config.json 응답만.
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    let body: any;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const contractId = String(body?.contractId ?? "").trim();
    if (!contractId) return badRequest("contractId_required");

    try {
      const contract = await prisma.itContract.findUnique({
        where: { id: contractId },
        include: {
          client: { select: { clientCode: true, companyNameVi: true } },
          equipment: { where: { removedAt: null }, include: { item: { select: { name: true } } } },
        },
      });
      if (!contract) return notFound();

      // 1) 계약 토큰 발급/갱신
      const contractToken = contract.contractToken ?? generateContractToken();
      if (!contract.contractToken) {
        await prisma.itContract.update({ where: { id: contractId }, data: { contractToken, contractTokenExpiresAt: tokenExpiresAt() } });
      }

      // 2) 각 장비 토큰 발급 (미발급 또는 폐기 상태만)
      const devices: any[] = [];
      for (const eq of contract.equipment) {
        let tok = eq.deviceToken;
        if (!tok || eq.deviceTokenRevokedAt) {
          tok = generateToken();
          await prisma.itContractEquipment.update({
            where: { id: eq.id },
            data: { deviceToken: tok, deviceTokenExpiresAt: tokenExpiresAt(), deviceTokenRevokedAt: null },
          });
        }
        devices.push({
          serialNumber: eq.serialNumber,
          itemName: eq.item.name,
          deviceModel: eq.deviceModel ?? null,
          deviceIp: eq.deviceIp ?? null,
          deviceToken: tok,
          snmpCommunity: eq.snmpCommunity ?? "public",
        });
      }

      // 3) config.json 구성
      const config = {
        erpUrl: process.env.NEXT_PUBLIC_BASE_URL ?? "https://tellustech-admin-production.up.railway.app",
        contractCode: contract.contractNumber,
        clientCode: contract.client.clientCode,
        clientName: contract.client.companyNameVi,
        contractToken,
        snmpCollectDay: contract.snmpCollectDay,
        devices,
        agentVersionCheckPath: "/api/snmp/agent-version",
        agentReadingsPath: "/api/snmp/readings",
        agentRegisterPath: "/api/snmp/register-devices",
        agentHeartbeatPath: "/api/snmp/heartbeat",
        generatedAt: new Date().toISOString(),
      };

      return new Response(JSON.stringify(config, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="config-${contract.contractNumber}.json"`,
        },
      });
    } catch (e) { return serverError(e); }
  });
}
