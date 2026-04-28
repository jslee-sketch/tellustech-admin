import "server-only";
import { prisma } from "./prisma";
import type { YieldBadge } from "@/generated/prisma/client";

// 소모품 적정율 분석 — 토너/드럼 투입량 vs SNMP 출력량 비교.
// 공식: 기대출력량 = Σ (수량 × expectedYield × yieldCoverageBase / actualCoverage)
//        적정율(%) = 실제출력량 / 기대출력량 × 100
//
// 흑백/컬러 분류는 Item.name 패턴으로 (Black/Drum → 흑백, Cyan/Magenta/Yellow/Color → 컬러).

export type ConsumableDetail = {
  itemId: string;
  itemName: string;
  quantity: number;
  expectedYield: number;
  yieldCoverageBase: number;
  contributedExpectedPages: number;
};

export type YieldResult = {
  actualPages: number;
  expectedPages: number;
  yieldRate: number;       // % 소수점 1자리
  badge: YieldBadge;
  isFraudSuspect: boolean;
  consumablesDetail: ConsumableDetail[];
};

export type YieldComputation = {
  bw: YieldResult;
  color: YieldResult | null;
};

const DEFAULT_THRESHOLDS = { blue: 120, green: 80, yellow: 50, orange: 30, fraud: 30 };

function classifyConsumable(itemName: string): "BW" | "COLOR" {
  const n = itemName.toLowerCase();
  if (/(cyan|magenta|yellow|color|컬러)/i.test(n)) return "COLOR";
  // Black/Drum/Fuser/흑백/Toner Black → BW (default)
  return "BW";
}

async function loadThresholds() {
  const cfg = await prisma.yieldConfig.findFirst();
  return {
    blue: cfg?.thresholdBlue ?? DEFAULT_THRESHOLDS.blue,
    green: cfg?.thresholdGreen ?? DEFAULT_THRESHOLDS.green,
    yellow: cfg?.thresholdYellow ?? DEFAULT_THRESHOLDS.yellow,
    orange: cfg?.thresholdOrange ?? DEFAULT_THRESHOLDS.orange,
    fraud: cfg?.fraudAlertThreshold ?? DEFAULT_THRESHOLDS.fraud,
  };
}

function pickBadge(rate: number, t: Awaited<ReturnType<typeof loadThresholds>>): YieldBadge {
  if (rate >= t.blue) return "BLUE";
  if (rate >= t.green) return "GREEN";
  if (rate >= t.yellow) return "YELLOW";
  if (rate >= t.orange) return "ORANGE";
  return "RED";
}

export async function calculateYieldRate(
  equipmentId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<YieldComputation | null> {
  const equipment = await prisma.itContractEquipment.findUnique({
    where: { id: equipmentId },
    select: { id: true, serialNumber: true, actualCoverage: true },
  });
  if (!equipment) return null;
  const actualCoverage = equipment.actualCoverage ?? 5;

  // SNMP 카운터 — 기간 시작 직전·마지막 readings.
  const startReading = await prisma.snmpReading.findFirst({
    where: { equipmentId, collectedAt: { lte: periodStart } },
    orderBy: { collectedAt: "desc" },
    select: { totalPages: true, bwPages: true, colorPages: true },
  });
  const endReading = await prisma.snmpReading.findFirst({
    where: { equipmentId, collectedAt: { lte: periodEnd } },
    orderBy: { collectedAt: "desc" },
    select: { totalPages: true, bwPages: true, colorPages: true },
  });
  const startBw = startReading?.bwPages ?? startReading?.totalPages ?? 0;
  const endBw = endReading?.bwPages ?? endReading?.totalPages ?? 0;
  const startColor = startReading?.colorPages ?? 0;
  const endColor = endReading?.colorPages ?? 0;
  const actualBw = Math.max(0, endBw - startBw);
  const actualColor = Math.max(0, endColor - startColor);

  // 기간 내 투입된 소모품 — AsDispatchPart × dispatch.completedAt
  const parts = await prisma.asDispatchPart.findMany({
    where: {
      targetEquipmentSN: equipment.serialNumber,
      asDispatch: { completedAt: { gte: periodStart, lte: periodEnd } },
    },
    include: {
      item: { select: { id: true, name: true, expectedYield: true, yieldCoverageBase: true } },
    },
  });

  let expectedBw = 0;
  let expectedColor = 0;
  const bwDetails: ConsumableDetail[] = [];
  const colorDetails: ConsumableDetail[] = [];

  for (const p of parts) {
    if (!p.item.expectedYield || p.item.expectedYield <= 0) continue;
    const coverageBase = p.item.yieldCoverageBase ?? 5;
    const ratio = coverageBase / Math.max(1, actualCoverage);
    const contributed = p.quantity * p.item.expectedYield * ratio;

    const detail: ConsumableDetail = {
      itemId: p.item.id,
      itemName: p.item.name,
      quantity: p.quantity,
      expectedYield: p.item.expectedYield,
      yieldCoverageBase: coverageBase,
      contributedExpectedPages: Math.round(contributed),
    };

    if (classifyConsumable(p.item.name) === "COLOR") {
      expectedColor += contributed;
      colorDetails.push(detail);
    } else {
      expectedBw += contributed;
      bwDetails.push(detail);
    }
  }

  const t = await loadThresholds();

  function build(actual: number, expected: number, details: ConsumableDetail[]): YieldResult {
    if (expected <= 0) {
      return {
        actualPages: actual,
        expectedPages: 0,
        yieldRate: 0,
        badge: "GREEN",
        isFraudSuspect: false,
        consumablesDetail: details,
      };
    }
    const rate = Math.round((actual / expected) * 1000) / 10;
    const badge = pickBadge(rate, t);
    return {
      actualPages: actual,
      expectedPages: Math.round(expected),
      yieldRate: rate,
      badge,
      isFraudSuspect: rate < t.fraud,
      consumablesDetail: details,
    };
  }

  const bwRes = build(actualBw, expectedBw, bwDetails);
  const colorRes = expectedColor > 0 || actualColor > 0
    ? build(actualColor, expectedColor, colorDetails)
    : null;

  return { bw: bwRes, color: colorRes };
}

// RED 뱃지 / isFraudSuspect 시 — 관리자 알림 + 감사로그.
// audit_log 는 prisma.ts middleware 가 자동 기록하므로 여기서는 알림만.
export async function notifyFraudSuspect(analysisId: string): Promise<void> {
  const a = await prisma.yieldAnalysis.findUnique({
    where: { id: analysisId },
    include: {
      equipment: { select: { serialNumber: true } },
      contract: { select: { contractNumber: true } },
    },
  });
  if (!a || !a.isFraudSuspect) return;

  const client = await prisma.client.findUnique({
    where: { id: a.clientId },
    select: { companyNameVi: true, companyNameKo: true, companyNameEn: true },
  });

  const titleKo = `소모품 적정율 이상 감지 — ${a.equipment.serialNumber}`;
  const titleEn = `Yield anomaly detected — ${a.equipment.serialNumber}`;
  const titleVi = `Phát hiện tỷ lệ vật tư bất thường — ${a.equipment.serialNumber}`;
  const bodyKo = `계약 ${a.contract.contractNumber} · 거래처 ${client?.companyNameKo ?? client?.companyNameVi ?? "-"} · 흑백 적정율 ${a.yieldRateBw}%${a.yieldRateColor !== null ? ` · 컬러 ${a.yieldRateColor}%` : ""}. 과다 투입 의심.`;
  const bodyEn = `Contract ${a.contract.contractNumber} · client ${client?.companyNameEn ?? client?.companyNameVi ?? "-"} · BW yield ${a.yieldRateBw}%${a.yieldRateColor !== null ? ` · Color ${a.yieldRateColor}%` : ""}. Excessive supply suspected.`;
  const bodyVi = `Hợp đồng ${a.contract.contractNumber} · khách hàng ${client?.companyNameVi ?? "-"} · BW ${a.yieldRateBw}%${a.yieldRateColor !== null ? ` · Color ${a.yieldRateColor}%` : ""}. Nghi ngờ cung cấp quá mức.`;

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });
  await Promise.all(
    admins.map((u) =>
      prisma.notification.create({
        data: {
          userId: u.id,
          companyCode: a.companyCode as "TV" | "VR",
          type: "YIELD_FRAUD_SUSPECT",
          titleVi, titleEn, titleKo,
          bodyVi, bodyEn, bodyKo,
          linkUrl: `/admin/yield-analysis?id=${a.id}`,
        },
      }),
    ),
  );
}
