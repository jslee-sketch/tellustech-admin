import "server-only";
import { prisma } from "./prisma";
import type { CompanyCode } from "@/generated/prisma/client";

// AI 인사평가 핵심 로직.
// - Claude API 있을 때: 사건 분석 + 편향 분석 텍스트 생성
// - 없을 때: 규칙기반 점수만 산출 (graceful degradation)
// - 9지표 가중합: 사건(20%) + 동료(15%) + AS_TAT(15%) + 출동효율(10%) +
//                 매출기여(15%) + ERP속도(5%) + ERP마감(10%) + ERP숙련(5%) + 근태(5%) = 100
// - 공정성 보정: ±2σ 이상치 제거, 올림픽 방식, 부서 평균 대비 정규화

const MODEL = "claude-haiku-4-5-20251001";

// 디버그: 마지막 호출 정보 추적 (개발 모드에서 원인 파악)
export const claudeDebug: { lastError: string | null; lastStatus: number | null } = {
  lastError: null,
  lastStatus: null,
};

async function claudeCall(prompt: string, maxTokens = 2048): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    claudeDebug.lastError = "ANTHROPIC_API_KEY 환경변수 없음";
    return null;
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    claudeDebug.lastStatus = res.status;
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      claudeDebug.lastError = `HTTP ${res.status}: ${errBody.slice(0, 300)}`;
      return null;
    }
    const json = (await res.json()) as { content?: { text?: string }[] };
    claudeDebug.lastError = null;
    return json.content?.[0]?.text ?? null;
  } catch (err) {
    claudeDebug.lastError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

// ───── 사건기반 분석 ─────
export type IncidentAnalysis = {
  strengths: string[];
  weaknesses: string[];
  patternSummary: string;
  ruleScore: number;      // 규칙기반 점수 (AI 없을 때도 유효)
  aiScore: number | null; // Claude 점수
  aiText: string | null;  // Claude 원문 분석
};

export async function analyzeIncidents(
  employeeId: string,
  companyCode: CompanyCode,
): Promise<IncidentAnalysis> {
  const incidents = await prisma.incident.findMany({
    where: { companyCode, subjectId: employeeId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const praiseCount = incidents.filter((i) => i.type === "PRAISE").length;
  const improveCount = incidents.filter((i) => i.type === "IMPROVEMENT").length;

  // 규칙기반: 칭찬 +10 / 개선 -5, 50 기준.
  const ruleScore = Math.max(0, Math.min(100, 50 + praiseCount * 10 - improveCount * 5));

  if (incidents.length === 0) {
    return {
      strengths: [],
      weaknesses: [],
      patternSummary: "사건 기록 없음",
      ruleScore: 50,
      aiScore: null,
      aiText: null,
    };
  }

  const lines = incidents.map(
    (i, n) =>
      `#${n + 1} [${i.type}] ${(i.contentVi || i.contentKo || i.contentEn || "").slice(0, 200)}`,
  );

  const prompt = `다음은 한 직원에 대한 사건 기록입니다 (칭찬=PRAISE, 개선필요=IMPROVEMENT).
${lines.join("\n")}

아래 JSON 형식으로만 응답하세요. 다른 설명은 포함하지 마세요:
{
  "strengths": ["강점1", "강점2"],
  "weaknesses": ["약점1", "약점2"],
  "patternSummary": "한국어 2~3문장 요약",
  "score": 0-100 사이 숫자
}`;

  const text = await claudeCall(prompt);
  if (!text) {
    return {
      strengths: [],
      weaknesses: [],
      patternSummary: `PRAISE ${praiseCount}건 · IMPROVEMENT ${improveCount}건 (규칙기반)`,
      ruleScore,
      aiScore: null,
      aiText: null,
    };
  }

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no_json");
    const parsed = JSON.parse(match[0]) as { strengths?: string[]; weaknesses?: string[]; patternSummary?: string; score?: number };
    return {
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      patternSummary: parsed.patternSummary ?? "",
      ruleScore,
      aiScore: typeof parsed.score === "number" ? Math.max(0, Math.min(100, parsed.score)) : null,
      aiText: text,
    };
  } catch {
    return { strengths: [], weaknesses: [], patternSummary: text.slice(0, 300), ruleScore, aiScore: null, aiText: text };
  }
}

// ───── 평가자 편향성 분석 ─────
export type BiasAnalysis = {
  totalReviews: number;
  avgScore: number;
  stdDev: number;
  highRisk: boolean;
  aiText: string | null;
  suggestedCorrection: number; // ±점수 권고
};

export async function analyzeBiasRisk(
  reviewerId: string,
  companyCode: CompanyCode,
): Promise<BiasAnalysis> {
  const evals = await prisma.regularEvaluation.findMany({
    where: { companyCode, reviewerId },
    include: { subject: { select: { employeeCode: true, nameVi: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const total = evals.length;
  if (total === 0) {
    return { totalReviews: 0, avgScore: 0, stdDev: 0, highRisk: false, aiText: null, suggestedCorrection: 0 };
  }
  const scores = evals.map((e) => Number(e.normalizedScore));
  const avg = scores.reduce((a, b) => a + b, 0) / total;
  const variance = scores.reduce((a, b) => a + (b - avg) ** 2, 0) / total;
  const stdDev = Math.sqrt(variance);

  // 규칙기반 위험도: 평균이 80+ 또는 30-  또는 표준편차 5 이하(모두 비슷한 점수)
  const highRisk = avg > 85 || avg < 35 || stdDev < 5;
  const suggestedCorrection = avg > 85 ? -Math.round(avg - 75) : avg < 35 ? Math.round(50 - avg) : 0;

  if (!highRisk && total < 3) {
    return { totalReviews: total, avgScore: Number(avg.toFixed(1)), stdDev: Number(stdDev.toFixed(2)), highRisk: false, aiText: null, suggestedCorrection: 0 };
  }

  const rows = evals
    .map((e) => `[${e.subject.employeeCode} · ${e.subject.nameVi}] 점수 ${Number(e.normalizedScore).toFixed(1)}`)
    .join("\n");
  const prompt = `평가자의 평가 기록입니다:
${rows}

1) 점수를 지나치게 높게/낮게 주는 경향
2) 특정인에 대한 편향 위험도 (HIGH/MEDIUM/LOW)
3) 보정 권고 (±점수)
를 한국어 3~4문장 JSON 없이 일반 텍스트로 답변하세요.`;

  const text = await claudeCall(prompt, 1024);
  return {
    totalReviews: total,
    avgScore: Number(avg.toFixed(1)),
    stdDev: Number(stdDev.toFixed(2)),
    highRisk,
    aiText: text,
    suggestedCorrection,
  };
}

// ───── ERP 객관 지표 ─────
export type ErpMetrics = {
  asTatHours: number | null;   // AS 평균 접수~완료 시간
  dispatchEfficiency: number;  // 출동 건수 / distanceMatch 일치율
  salesContribution: number;   // 해당 직원 salesEmployeeId 매출 합계 (VND)
  erpSpeed: number;            // 업무 처리 속도 (스케줄 CFM 제시간 비율)
  erpDeadline: number;         // CFM 지연 횟수 (역수)
  erpMastery: number;          // 모듈 사용 다양성 (세션 역할 기준 간접치, 기본 50)
  attendance: number;          // 100 - (무단/결근 × 5)
};

export async function computeErpMetrics(
  employeeId: string,
  companyCode: CompanyCode,
): Promise<ErpMetrics> {
  // AsTicket/AsDispatch/Sales 는 거래처 기반으로 companyCode 필드가 없음 — 직원ID만 필터
  const [tickets, dispatches, sales, confirms, leaves] = await Promise.all([
    prisma.asTicket.findMany({
      where: { assignedToId: employeeId, status: "COMPLETED" },
      select: { receivedAt: true, completedAt: true },
      take: 200,
    }),
    prisma.asDispatch.findMany({
      where: { dispatchEmployeeId: employeeId },
      select: { distanceMatch: true },
      take: 200,
    }),
    prisma.sales.findMany({
      where: { salesEmployeeId: employeeId },
      select: { totalAmount: true, currency: true, fxRate: true },
      take: 500,
    }),
    prisma.scheduleConfirmation.findMany({
      where: { employeeId },
      select: { status: true, confirmedAt: true, schedule: { select: { dueAt: true } } },
      take: 200,
    }),
    prisma.leaveRecord.findMany({
      where: { companyCode, employeeId, status: "APPROVED" },
      select: { leaveType: true, days: true },
      take: 200,
    }),
  ]);

  // AS TAT
  const tats: number[] = [];
  for (const t of tickets) {
    if (t.receivedAt && t.completedAt) {
      tats.push((t.completedAt.getTime() - t.receivedAt.getTime()) / 3600000);
    }
  }
  const asTatHours = tats.length > 0 ? Number((tats.reduce((a, b) => a + b, 0) / tats.length).toFixed(1)) : null;

  // 출동 효율: distanceMatch true 비율 × 100
  const matches = dispatches.filter((d) => d.distanceMatch === true).length;
  const dispatchEfficiency = dispatches.length > 0 ? (matches / dispatches.length) * 100 : 50;

  // 매출 기여 (VND 환산 총합)
  const salesContribution = sales.reduce(
    (sum, s) => sum + Number(s.totalAmount) * Number(s.fxRate),
    0,
  );

  // ERP 속도: 제시간 CFM 비율
  const onTime = confirms.filter((c) => c.confirmedAt <= c.schedule.dueAt).length;
  const erpSpeed = confirms.length > 0 ? (onTime / confirms.length) * 100 : 50;

  // ERP 마감: 지연 비율 역수
  const late = confirms.length - onTime;
  const erpDeadline = confirms.length > 0 ? Math.max(0, 100 - (late / confirms.length) * 100) : 50;

  // 모듈 숙련도: 지금은 50 기본 (추후 audit_log 기반 다양성으로 확장)
  const erpMastery = 50;

  // 근태: KSX(결근) 타입 차감. 연차/병가/출장은 정상.
  const uncovered = leaves.filter((l) => l.leaveType === "KSX");
  const unCount = uncovered.reduce((s, l) => s + Number(l.days), 0);
  const attendance = Math.max(0, 100 - unCount * 5);

  return {
    asTatHours,
    dispatchEfficiency,
    salesContribution,
    erpSpeed,
    erpDeadline,
    erpMastery,
    attendance,
  };
}

// ───── 종합 점수 + 등급 ─────
export type FinalScore = {
  total: number;
  grade: "A" | "B" | "C" | "D";
  breakdown: Record<string, { score: number; weight: number; contribution: number }>;
};

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

export function computeFinalScore(input: {
  incidentScore: number;        // 0-100
  peerScore: number;            // 0-100 (RegularEvaluation avg)
  asTatHours: number | null;
  dispatchEfficiency: number;
  salesContribution: number;
  salesMaxInCohort: number;     // 부서 내 최대값 (정규화용)
  erpSpeed: number;
  erpDeadline: number;
  erpMastery: number;
  attendance: number;
}): FinalScore {
  const weights = {
    incident: 0.20,
    peer: 0.15,
    asTat: 0.15,
    dispatch: 0.10,
    sales: 0.15,
    erpSpeed: 0.05,
    erpDeadline: 0.10,
    erpMastery: 0.05,
    attendance: 0.05,
  };

  // AS TAT: 낮을수록 좋음 → 24시간 이내=100, 72시간+=0
  const asTatScore = input.asTatHours === null ? 50 :
    input.asTatHours <= 24 ? 100 :
    input.asTatHours >= 72 ? 0 :
    100 - ((input.asTatHours - 24) / 48) * 100;

  // 매출: 부서 최대 대비 정규화
  const salesScore = normalize(input.salesContribution, 0, input.salesMaxInCohort || 1);

  const scores = {
    incident: input.incidentScore,
    peer: input.peerScore,
    asTat: asTatScore,
    dispatch: input.dispatchEfficiency,
    sales: salesScore,
    erpSpeed: input.erpSpeed,
    erpDeadline: input.erpDeadline,
    erpMastery: input.erpMastery,
    attendance: input.attendance,
  };

  const breakdown: FinalScore["breakdown"] = {};
  let total = 0;
  for (const [k, w] of Object.entries(weights)) {
    const s = scores[k as keyof typeof scores];
    const contribution = s * w;
    breakdown[k] = { score: Number(s.toFixed(1)), weight: w, contribution: Number(contribution.toFixed(2)) };
    total += contribution;
  }

  const totalRounded = Number(total.toFixed(1));
  const grade = totalRounded >= 85 ? "A" : totalRounded >= 70 ? "B" : totalRounded >= 50 ? "C" : "D";
  return { total: totalRounded, grade, breakdown };
}

// ───── 종합 리포트 오케스트레이션 ─────
export type EvaluationReport = {
  employeeId: string;
  generatedAt: Date;
  incidentAnalysis: IncidentAnalysis;
  erpMetrics: ErpMetrics;
  peerScore: number;         // RegularEvaluation avg
  finalScore: FinalScore;
  biasWarnings: string[];
};

export async function generateEvaluationReport(
  employeeId: string,
  companyCode: CompanyCode,
): Promise<EvaluationReport> {
  const [incidentAnalysis, erpMetrics, peerEvals, cohortSales] = await Promise.all([
    analyzeIncidents(employeeId, companyCode),
    computeErpMetrics(employeeId, companyCode),
    prisma.regularEvaluation.findMany({
      where: { companyCode, subjectId: employeeId },
      select: { normalizedScore: true, reviewerId: true },
      take: 50,
    }),
    prisma.sales.findMany({
      where: { salesEmployeeId: { not: null } },
      select: { salesEmployeeId: true, totalAmount: true, fxRate: true },
      take: 1000,
    }),
  ]);

  // 동료 평가 평균 (±2σ 이상치 제거)
  let peerScore = 50;
  if (peerEvals.length >= 2) {
    const xs = peerEvals.map((e) => Number(e.normalizedScore));
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
    const cleaned = xs.filter((x) => Math.abs(x - mean) <= 2 * sd);
    peerScore = cleaned.length > 0 ? cleaned.reduce((a, b) => a + b, 0) / cleaned.length : mean;
  } else if (peerEvals.length === 1) {
    peerScore = Number(peerEvals[0].normalizedScore);
  }

  // 편향 경고: 평가자별 집계 → 편향 높은 평가자 제외 권고
  const biasWarnings: string[] = [];
  const byReviewer = new Map<string, number[]>();
  for (const e of peerEvals) {
    const list = byReviewer.get(e.reviewerId) ?? [];
    list.push(Number(e.normalizedScore));
    byReviewer.set(e.reviewerId, list);
  }
  for (const [reviewerId, xs] of byReviewer.entries()) {
    if (xs.length >= 3) {
      const m = xs.reduce((a, b) => a + b, 0) / xs.length;
      if (m > 90 || m < 30) biasWarnings.push(`Reviewer ${reviewerId.slice(0, 8)} avg=${m.toFixed(1)} — 편향 의심`);
    }
  }

  // 매출 최대값 (부서·직원 막론 — 정규화 기준)
  const salesByEmp = new Map<string, number>();
  for (const s of cohortSales) {
    if (!s.salesEmployeeId) continue;
    const amt = Number(s.totalAmount) * Number(s.fxRate);
    salesByEmp.set(s.salesEmployeeId, (salesByEmp.get(s.salesEmployeeId) ?? 0) + amt);
  }
  const salesMax = Math.max(1, ...Array.from(salesByEmp.values()));

  const finalScore = computeFinalScore({
    incidentScore: incidentAnalysis.aiScore ?? incidentAnalysis.ruleScore,
    peerScore,
    asTatHours: erpMetrics.asTatHours,
    dispatchEfficiency: erpMetrics.dispatchEfficiency,
    salesContribution: erpMetrics.salesContribution,
    salesMaxInCohort: salesMax,
    erpSpeed: erpMetrics.erpSpeed,
    erpDeadline: erpMetrics.erpDeadline,
    erpMastery: erpMetrics.erpMastery,
    attendance: erpMetrics.attendance,
  });

  return {
    employeeId,
    generatedAt: new Date(),
    incidentAnalysis,
    erpMetrics,
    peerScore: Number(peerScore.toFixed(1)),
    finalScore,
    biasWarnings,
  };
}
