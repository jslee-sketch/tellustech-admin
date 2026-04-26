import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, notFound, ok, serverError } from "@/lib/api-utils";
import { fetchSnmpBatch, type DeviceModel } from "@/lib/snmp";

// POST /api/snmp/poll/[contractId]
//   IT 계약의 활성 장비 전체에 대해 SNMP 카운터를 수집해서 반환.
//   - deviceIp + deviceModel 이 있으면 실호출 (SNMP_REAL=1 설정시)
//   - 없거나 mock 환경이면 deterministic mock
//   - 결과를 ItMonthlyBilling 으로 자동 적재하지는 않음 (UI 에서 수동 컨펌)
type RouteContext = { params: Promise<{ contractId: string }> };

const KNOWN_MODELS: readonly DeviceModel[] = ["SAMSUNG_SLX7500", "SINDOH_D410", "SINDOH_D320", "SINDOH_D330"];

export async function POST(_r: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER" && session.role !== "TECH") {
      return badRequest("forbidden");
    }
    const { contractId } = await context.params;
    const contract = await prisma.itContract.findUnique({ where: { id: contractId }, select: { id: true } });
    if (!contract) return notFound();
    try {
      const eq = await prisma.itContractEquipment.findMany({
        where: { itContractId: contractId, removedAt: null },
        select: { serialNumber: true, deviceIp: true, deviceModel: true },
      });
      const targets = eq.map((e) => ({
        model: (KNOWN_MODELS.includes(e.deviceModel as DeviceModel) ? e.deviceModel : "SAMSUNG_SLX7500") as DeviceModel,
        ip: e.deviceIp,
        serialNumber: e.serialNumber,
      }));
      const readings = await fetchSnmpBatch(targets);
      return ok({ pollAt: new Date(), count: readings.length, readings });
    } catch (err) { return serverError(err); }
  });
}
