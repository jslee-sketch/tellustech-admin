import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { ok } from "@/lib/api-utils";

// GET /api/inventory/sn/[sn]/active-contracts
// 입출고 폼이 S/N onBlur 시 호출 — 해당 S/N 이 어떤 active 계약에 등록되어 있는지 반환.
// 결과 있으면 폼이 모달로 "회수 / 교체 / 일반 이동" 중 의도를 묻는다.

type RouteContext = { params: Promise<{ sn: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { sn } = await context.params;
    const serialNumber = (sn ?? "").trim();
    if (!serialNumber) return ok({ contracts: [] });

    const now = new Date();

    // 활성 IT 계약 장비
    const itEquipment = await prisma.itContractEquipment.findMany({
      where: {
        serialNumber,
        removedAt: null,
        itContract: { status: { in: ["ACTIVE", "DRAFT"] } },
      },
      include: {
        itContract: {
          select: {
            id: true,
            contractNumber: true,
            status: true,
            startDate: true,
            endDate: true,
            client: { select: { id: true, clientCode: true, companyNameVi: true } },
          },
        },
        item: { select: { id: true, itemCode: true, name: true } },
      },
    });

    // 진행 중 TM 렌탈 라인
    const tmItems = await prisma.tmRentalItem.findMany({
      where: {
        serialNumber,
        endDate: { gte: now },
      },
      include: {
        tmRental: {
          select: {
            id: true,
            rentalCode: true,
            startDate: true,
            endDate: true,
            client: { select: { id: true, clientCode: true, companyNameVi: true } },
          },
        },
        item: { select: { id: true, itemCode: true, name: true } },
      },
    });

    const contracts = [
      ...itEquipment.map((e) => ({
        kind: "IT" as const,
        equipmentId: e.id,
        contractId: e.itContract.id,
        contractNumber: e.itContract.contractNumber,
        status: e.itContract.status,
        startDate: e.itContract.startDate,
        endDate: e.itContract.endDate,
        client: e.itContract.client,
        itemId: e.itemId,
        item: e.item,
        monthlyBaseFee: e.monthlyBaseFee,
      })),
      ...tmItems.map((it) => ({
        kind: "TM" as const,
        rentalItemId: it.id,
        rentalId: it.tmRental.id,
        rentalCode: it.tmRental.rentalCode,
        status: "ACTIVE",
        startDate: it.tmRental.startDate,
        endDate: it.tmRental.endDate,
        client: it.tmRental.client,
        itemId: it.itemId,
        item: it.item,
        salesPrice: it.salesPrice,
      })),
    ];

    return ok({ serialNumber, contracts });
  });
}
