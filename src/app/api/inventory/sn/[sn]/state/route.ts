import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { ok, badRequest } from "@/lib/api-utils";

// S/N 의 현재 상태(마스터) + 다음 단계 추천 시나리오 반환.
// QR 다중 스캔 흐름에서 사용 — 스캔된 S/N 의 ownerType, currentLocation, archived 를 보고
// 자연스러운 다음 이벤트(txnType + refModule + subKind) 1~N 개 추천.

type Recommendation = {
  txnType: "IN" | "OUT" | "TRANSFER";
  refModule: string;
  subKind: string;
  labelKey: string;
  reason: string;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sn: string }> },
) {
  return withSessionContext(async () => {
    const { sn } = await ctx.params;
    if (!sn) return badRequest("invalid_input", { field: "sn" });

    const master = await prisma.inventoryItem.findUnique({
      where: { serialNumber: sn },
      include: {
        item: { select: { id: true, itemCode: true, name: true, itemType: true } },
        warehouse: { select: { id: true, code: true, name: true, warehouseType: true } },
        ownerClient: { select: { id: true, clientCode: true, companyNameVi: true, companyNameKo: true } },
      },
    });
    // currentLocationClientId 는 단순 String? — 별도 조회
    const currentLoc = master?.currentLocationClientId
      ? await prisma.client.findUnique({
          where: { id: master.currentLocationClientId },
          select: { clientCode: true, companyNameVi: true, companyNameKo: true },
        })
      : null;

    if (!master) {
      // 마스터 없음 — 신규 IN 케이스. BORROW/REQUEST/PURCHASE 추천.
      return ok({
        master: null,
        state: "NEW",
        recommendations: [
          { txnType: "IN", refModule: "RENTAL", subKind: "BORROW", labelKey: "txn.combo.rentalInBorrow", reason: "신규 S/N — 외주에서 빌림" },
          { txnType: "IN", refModule: "REPAIR", subKind: "REQUEST", labelKey: "txn.combo.repairInRequest", reason: "신규 S/N — 고객 수리 의뢰" },
          { txnType: "IN", refModule: "CALIB", subKind: "REQUEST", labelKey: "txn.combo.calibInRequest", reason: "신규 S/N — 고객 교정 의뢰" },
          { txnType: "IN", refModule: "DEMO", subKind: "BORROW", labelKey: "txn.combo.demoInBorrow", reason: "신규 S/N — 외부 데모기" },
          { txnType: "IN", refModule: "TRADE", subKind: "PURCHASE", labelKey: "txn.combo.tradeInPurchase", reason: "신규 매입" },
        ] as Recommendation[],
      });
    }

    // 상태 분류 + 추천
    let state: string;
    const recommendations: Recommendation[] = [];

    if (master.archivedAt) {
      state = "ARCHIVED";
      // 반환·매출 완료 — 추천 없음 (재입고 시 신규 흐름)
    } else if (master.ownerType === "COMPANY") {
      if (master.currentLocationClientId) {
        // 자사 자산이 외부에 위탁/렌탈 중 → 회수
        state = "OWN_AT_EXTERNAL";
        recommendations.push(
          { txnType: "IN", refModule: "RENTAL", subKind: "RETURN", labelKey: "txn.combo.rentalInReturn", reason: "자사 렌탈 회수" },
          { txnType: "IN", refModule: "REPAIR", subKind: "RETURN", labelKey: "txn.combo.repairInReturn", reason: "외주수리 후 회수" },
          { txnType: "IN", refModule: "CALIB", subKind: "RETURN", labelKey: "txn.combo.calibInReturn", reason: "외주교정 후 회수" },
          { txnType: "IN", refModule: "DEMO", subKind: "RETURN", labelKey: "txn.combo.demoInReturn", reason: "자사 데모 회수" },
        );
      } else {
        // 자사 자산이 자사 창고에 있음 → 출고
        state = "OWN_IN_STOCK";
        recommendations.push(
          { txnType: "OUT", refModule: "RENTAL", subKind: "LEND", labelKey: "txn.combo.rentalOutLend", reason: "고객에게 렌탈 출고" },
          { txnType: "OUT", refModule: "REPAIR", subKind: "REQUEST", labelKey: "txn.combo.repairOutRequest", reason: "외주에 수리 의뢰" },
          { txnType: "OUT", refModule: "CALIB", subKind: "REQUEST", labelKey: "txn.combo.calibOutRequest", reason: "외주에 교정 의뢰" },
          { txnType: "OUT", refModule: "DEMO", subKind: "LEND", labelKey: "txn.combo.demoOutLend", reason: "고객 데모 대여" },
          { txnType: "OUT", refModule: "TRADE", subKind: "SALE", labelKey: "txn.combo.tradeOutSale", reason: "매출" },
          { txnType: "TRANSFER", refModule: "TRADE", subKind: "OTHER", labelKey: "txn.combo.transferInternal", reason: "자사 창고 ↔ 자사 창고 이동" },
        );
      }
    } else {
      // EXTERNAL_CLIENT (외부 자산이 자사 보관)
      if (master.currentLocationClientId) {
        // 외부 자산이 외부에 위탁 중 (수리처 등)
        state = "EXTERNAL_AT_VENDOR";
        recommendations.push(
          { txnType: "IN", refModule: "REPAIR", subKind: "RETURN", labelKey: "txn.combo.repairInReturn", reason: "외주수리 완료 회수 (고객자산)" },
          { txnType: "IN", refModule: "CALIB", subKind: "RETURN", labelKey: "txn.combo.calibInReturn", reason: "외주교정 완료 회수 (고객자산)" },
        );
      } else {
        // 외부 자산이 자사 창고에 있음 → 반환·재의뢰
        state = "EXTERNAL_IN_STOCK";
        recommendations.push(
          { txnType: "OUT", refModule: "REPAIR", subKind: "RETURN", labelKey: "txn.combo.repairOutReturn", reason: "수리 완료 고객 반환" },
          { txnType: "OUT", refModule: "CALIB", subKind: "RETURN", labelKey: "txn.combo.calibOutReturn", reason: "교정 완료 고객 반환" },
          { txnType: "OUT", refModule: "RENTAL", subKind: "RETURN", labelKey: "txn.combo.rentalOutReturn", reason: "외주에 렌탈 반납" },
          { txnType: "OUT", refModule: "DEMO", subKind: "RETURN", labelKey: "txn.combo.demoOutReturn", reason: "외부에 데모 반환" },
          { txnType: "OUT", refModule: "REPAIR", subKind: "REQUEST", labelKey: "txn.combo.repairOutRequest", reason: "외주에 재의뢰 (수리)" },
          { txnType: "OUT", refModule: "CALIB", subKind: "REQUEST", labelKey: "txn.combo.calibOutRequest", reason: "외주에 재의뢰 (교정)" },
        );
      }
    }

    return ok({
      master: {
        serialNumber: master.serialNumber,
        itemId: master.item.id,
        itemCode: master.item.itemCode,
        itemName: master.item.name,
        itemType: master.item.itemType,
        warehouseId: master.warehouseId,
        warehouseCode: master.warehouse?.code,
        warehouseName: master.warehouse?.name,
        warehouseType: master.warehouse?.warehouseType,
        ownerType: master.ownerType,
        ownerClientId: master.ownerClientId,
        ownerClientLabel: master.ownerClient
          ? `${master.ownerClient.clientCode} · ${master.ownerClient.companyNameKo ?? master.ownerClient.companyNameVi}`
          : null,
        currentLocationClientId: master.currentLocationClientId,
        currentLocationClientLabel: currentLoc
          ? `${currentLoc.clientCode} · ${currentLoc.companyNameKo ?? currentLoc.companyNameVi}`
          : null,
        archivedAt: master.archivedAt,
        status: master.status,
      },
      state,
      recommendations,
    });
  });
}
