import "server-only";
import { prisma } from "@/lib/prisma";
import type { PointReason, PortalPoint } from "@/generated/prisma/client";

// 포탈 포인트 헬퍼.
// 핵심 정책 (Phase A):
// - PortalPoint.balance 필드 없음 → 잔액은 항상 SUM(amount) WHERE clientId 로 계산.
// - 적립 단가는 PointConfig 테이블에서 조회 (관리자가 변경 가능).
// - 중복 방지: linkedModel + linkedId 조합이 같으면 재적립 스킵.

export type GrantResult = { point: PortalPoint; balance: number; pointsEarned: number } | null;

export async function getPointBalance(clientId: string): Promise<number> {
  const r = await prisma.portalPoint.aggregate({
    where: { clientId },
    _sum: { amount: true },
  });
  return Number(r._sum.amount ?? 0);
}

export async function grantPoints(args: {
  clientId: string;
  reason: PointReason;
  linkedModel?: string;
  linkedId?: string;
  issuedById?: string;
  customAmount?: number; // 관리자 수동 지급 시 (양수=적립, 음수=차감)
  reasonDetail?: string;
}): Promise<GrantResult> {
  const { clientId, reason, linkedModel, linkedId, issuedById, customAmount, reasonDetail } = args;

  let amount = customAmount;
  if (amount === undefined) {
    const cfg = await prisma.pointConfig.findUnique({ where: { reason } });
    if (!cfg || !cfg.isActive || cfg.amount <= 0) return null;
    amount = cfg.amount;
  }
  if (!amount || amount === 0) return null;

  if (linkedModel && linkedId) {
    const existing = await prisma.portalPoint.findFirst({
      where: { clientId, linkedModel, linkedId, reason },
    });
    if (existing) return null; // 중복 적립 방지
  }

  // 만료일 자동 설정 — PointConfig.expiryMonths (기본 24개월). 양수 적립만.
  let expiresAt: Date | null = null;
  if (amount > 0) {
    const anyCfg = await prisma.pointConfig.findFirst({ select: { expiryMonths: true } });
    const months = anyCfg?.expiryMonths ?? 24;
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    expiresAt = d;
  }

  const point = await prisma.portalPoint.create({
    data: { clientId, amount, reason, linkedModel, linkedId, issuedById, reasonDetail, expiresAt },
  });
  const balance = await getPointBalance(clientId);
  return { point, balance, pointsEarned: amount };
}

// FIFO 차감 — 가장 오래된 만료 안 된 양수 행부터 소진.
// 만료된 행 / 차감 행 / 음수 행 제외. 잔여 amount 가 충분치 않으면 INSUFFICIENT.
export async function fifoConsumePoints(args: {
  clientId: string;
  amount: number;          // 양수 (사용량)
  reason: "REWARD_EXCHANGE" | "POINT_EXPIRED" | "ADMIN_DEDUCT";
  linkedModel?: string;
  linkedId?: string;
  reasonDetail?: string;
}): Promise<{ ok: true; consumed: { fromId: string; usedAmount: number }[]; balance: number } | { ok: false; reason: "INSUFFICIENT" }> {
  const remaining = await getPointBalance(args.clientId);
  if (remaining < args.amount) return { ok: false, reason: "INSUFFICIENT" };

  // 양수 적립행 + 아직 소진되지 않은 부분만 — 같은 적립행에 대해 이미 누적 소진된 양 계산.
  const grants = await prisma.portalPoint.findMany({
    where: { clientId: args.clientId, amount: { gt: 0 }, expiredAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, amount: true, expiresAt: true },
  });
  // 각 grant 별 누적 소비량
  const consumed = await prisma.portalPoint.groupBy({
    by: ["consumedFromId"],
    where: { clientId: args.clientId, consumedFromId: { not: null } },
    _sum: { amount: true },
  });
  const consumedMap = new Map(consumed.map((c) => [c.consumedFromId!, Math.abs(Number(c._sum.amount ?? 0))]));

  let need = args.amount;
  const used: { fromId: string; usedAmount: number }[] = [];
  for (const g of grants) {
    if (need <= 0) break;
    const alreadyConsumed = consumedMap.get(g.id) ?? 0;
    const remainingInGrant = g.amount - alreadyConsumed;
    if (remainingInGrant <= 0) continue;
    const takeAmount = Math.min(need, remainingInGrant);
    used.push({ fromId: g.id, usedAmount: takeAmount });
    need -= takeAmount;
  }
  if (need > 0) return { ok: false, reason: "INSUFFICIENT" };

  // FIFO 소진 — 사용 행을 grant 별로 분할 작성 (consumedFromId 트레이스용).
  await prisma.$transaction(async (tx) => {
    for (const u of used) {
      await tx.portalPoint.create({
        data: {
          clientId: args.clientId,
          amount: -u.usedAmount,
          reason: args.reason as never,
          linkedModel: args.linkedModel,
          linkedId: args.linkedId,
          reasonDetail: args.reasonDetail,
          consumedFromId: u.fromId,
        },
      });
    }
  });
  const balance = await getPointBalance(args.clientId);
  return { ok: true, consumed: used, balance };
}

export async function deductPoints(args: {
  clientId: string;
  amount: number; // 양수
  reason: PointReason; // 보통 REWARD_EXCHANGE
  linkedModel?: string;
  linkedId?: string;
  reasonDetail?: string;
}): Promise<GrantResult | "INSUFFICIENT"> {
  const r = await fifoConsumePoints({
    clientId: args.clientId,
    amount: Math.abs(args.amount),
    reason: args.reason === "REWARD_EXCHANGE" ? "REWARD_EXCHANGE" : "ADMIN_DEDUCT",
    linkedModel: args.linkedModel,
    linkedId: args.linkedId,
    reasonDetail: args.reasonDetail,
  });
  if (!r.ok) return "INSUFFICIENT";
  // 첫 차감행 반환 (호환성).
  const last = await prisma.portalPoint.findFirst({
    where: { clientId: args.clientId, amount: { lt: 0 } },
    orderBy: { createdAt: "desc" },
  });
  return { point: last!, balance: r.balance, pointsEarned: -args.amount };
}

// 만료 예정 잔여 합계 — 다음 N일 내에 만료될 적립 포인트.
export async function getExpiringPoints(clientId: string, withinDays: number = 30): Promise<{ totalExpiring: number; nextExpireAt: Date | null }> {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + withinDays);
  const grants = await prisma.portalPoint.findMany({
    where: { clientId, amount: { gt: 0 }, expiredAt: null, expiresAt: { not: null, lte: cutoff } },
    orderBy: { expiresAt: "asc" },
    select: { id: true, amount: true, expiresAt: true },
  });
  const consumed = await prisma.portalPoint.groupBy({
    by: ["consumedFromId"],
    where: { clientId, consumedFromId: { not: null } },
    _sum: { amount: true },
  });
  const consumedMap = new Map(consumed.map((c) => [c.consumedFromId!, Math.abs(Number(c._sum.amount ?? 0))]));
  let total = 0;
  for (const g of grants) {
    const used = consumedMap.get(g.id) ?? 0;
    total += Math.max(0, g.amount - used);
  }
  return { totalExpiring: total, nextExpireAt: grants[0]?.expiresAt ?? null };
}
