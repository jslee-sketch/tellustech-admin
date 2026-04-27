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

  const point = await prisma.portalPoint.create({
    data: { clientId, amount, reason, linkedModel, linkedId, issuedById, reasonDetail },
  });
  const balance = await getPointBalance(clientId);
  return { point, balance, pointsEarned: amount };
}

export async function deductPoints(args: {
  clientId: string;
  amount: number; // 양수
  reason: PointReason; // 보통 REWARD_EXCHANGE
  linkedModel?: string;
  linkedId?: string;
  reasonDetail?: string;
}): Promise<GrantResult | "INSUFFICIENT"> {
  const balance = await getPointBalance(args.clientId);
  if (balance < args.amount) return "INSUFFICIENT";
  const point = await prisma.portalPoint.create({
    data: {
      clientId: args.clientId,
      amount: -Math.abs(args.amount),
      reason: args.reason,
      linkedModel: args.linkedModel,
      linkedId: args.linkedId,
      reasonDetail: args.reasonDetail,
    },
  });
  const newBalance = await getPointBalance(args.clientId);
  return { point, balance: newBalance, pointsEarned: -args.amount };
}
