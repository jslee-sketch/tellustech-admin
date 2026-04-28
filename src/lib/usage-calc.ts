import "server-only";
import { prisma } from "@/lib/prisma";

// 사용량 계산 — UsageConfirmation 생성 시 자동 호출.
// 정책:
//   - usage = curr - prev. 음수면 0 으로 클립 + isCounterReset 표시 (관리자 알림)
//   - resetAt 이 prev 와 curr 사이에 있으면 prev 무시 (장비 메인보드 교체 등)
//   - 첫 달 (prev 없음) 은 installCounterBw/Color 사용
//   - 추가 과금 = max(0, usage - baseIncluded) * extraRate

export type EquipmentUsageRow = {
  serialNumber: string;
  brand: string;
  itemName: string;
  prevBw: number;
  prevColor: number;
  currBw: number;
  currColor: number;
  usageBw: number;
  usageColor: number;
  baseFee: number;
  baseIncludedBw: number;
  baseIncludedColor: number;
  extraBw: number;
  extraColor: number;
  extraChargeBw: number;
  extraChargeColor: number;
  subtotal: number;
  isCounterReset: boolean;
  isMissingReading: boolean; // 이번 달 reading 자체가 없는 경우
};

function startOfMonth(billingMonth: string): Date {
  // billingMonth = "2026-05"
  const [y, m] = billingMonth.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

function endOfMonth(billingMonth: string): Date {
  const [y, m] = billingMonth.split("-").map(Number);
  return new Date(y, m, 0, 23, 59, 59, 999);
}

function prevMonthLastDay(billingMonth: string): Date {
  const [y, m] = billingMonth.split("-").map(Number);
  return new Date(y, m - 1, 0, 23, 59, 59, 999); // 전월 말일
}

export async function calculateUsageForContract(contractId: string, billingMonth: string): Promise<EquipmentUsageRow[]> {
  const equipment = await prisma.itContractEquipment.findMany({
    where: { itContractId: contractId, removedAt: null },
    include: { item: { select: { name: true } } },
  });

  const periodStart = startOfMonth(billingMonth);
  const periodEnd = endOfMonth(billingMonth);
  const prevEnd = prevMonthLastDay(billingMonth);

  const rows: EquipmentUsageRow[] = [];
  for (const eq of equipment) {
    // 이번 달 마지막 reading
    const curr = await prisma.snmpReading.findFirst({
      where: { equipmentId: eq.id, collectedAt: { gte: periodStart, lte: periodEnd } },
      orderBy: { collectedAt: "desc" },
    });
    // 전월 마지막 reading
    const prev = await prisma.snmpReading.findFirst({
      where: { equipmentId: eq.id, collectedAt: { lte: prevEnd } },
      orderBy: { collectedAt: "desc" },
    });

    const isMissingReading = !curr;

    // resetAt 이 prev~curr 사이면 prev 무시
    const resetCutoff = eq.resetAt;
    const ignorePrev = resetCutoff && prev && curr && resetCutoff > prev.collectedAt && resetCutoff <= curr.collectedAt;

    const currBw = curr?.bwPages ?? curr?.totalPages ?? 0;
    const currColor = curr?.colorPages ?? 0;

    // prev 산출 — 없거나 무시면 installCounter 사용
    let prevBw = 0;
    let prevColor = 0;
    if (prev && !ignorePrev) {
      prevBw = prev.bwPages ?? prev.totalPages ?? 0;
      prevColor = prev.colorPages ?? 0;
    } else {
      prevBw = eq.installCounterBw ?? 0;
      prevColor = eq.installCounterColor ?? 0;
    }

    // 음수 → 0 클립 + 리셋 플래그
    let isCounterReset = curr?.isCounterReset ?? false;
    let usageBw = currBw - prevBw;
    let usageColor = currColor - prevColor;
    if (usageBw < 0) { usageBw = 0; isCounterReset = true; }
    if (usageColor < 0) { usageColor = 0; isCounterReset = true; }

    const baseFee = Number(eq.monthlyBaseFee ?? 0);
    const baseIncludedBw = eq.baseIncludedBw ?? eq.bwIncludedPages ?? 0;
    const baseIncludedColor = eq.baseIncludedColor ?? eq.colorIncludedPages ?? 0;
    const extraRateBw = Number(eq.extraRateBw ?? eq.bwOverageRate ?? 0);
    const extraRateColor = Number(eq.extraRateColor ?? eq.colorOverageRate ?? 0);

    const extraBw = Math.max(0, usageBw - baseIncludedBw);
    const extraColor = Math.max(0, usageColor - baseIncludedColor);
    const extraChargeBw = extraBw * extraRateBw;
    const extraChargeColor = extraColor * extraRateColor;
    const subtotal = baseFee + extraChargeBw + extraChargeColor;

    rows.push({
      serialNumber: eq.serialNumber,
      brand: curr?.brand ?? "—",
      itemName: curr?.itemName ?? eq.item.name,
      prevBw, prevColor, currBw, currColor,
      usageBw, usageColor,
      baseFee, baseIncludedBw, baseIncludedColor,
      extraBw, extraColor, extraChargeBw, extraChargeColor,
      subtotal,
      isCounterReset,
      isMissingReading,
    });
  }

  return rows;
}
