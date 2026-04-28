import "server-only";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// SNMP 토큰 정책
//   - 발급: UUID v4
//   - 만료: 발급일 +60일 + 매 요청 시 lastSeenAt 갱신 → 마지막 접속 +60일 슬라이딩
//   - 폐기: 관리자가 deviceTokenRevokedAt 설정. 검증 즉시 거절.

export const TOKEN_TTL_DAYS = 60;

export function generateToken(): string {
  return "tok_" + randomUUID().replace(/-/g, "");
}

export function tokenExpiresAt(): Date {
  return new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * deviceToken 으로 장비 인증. 만료/폐기 검증 + 자동 슬라이딩 갱신.
 * 통과 시 ItContractEquipment + lastReadingAt 갱신용 메타 반환.
 */
export async function authDeviceToken(token: string) {
  if (!token || !token.startsWith("tok_")) return null;
  const eq = await prisma.itContractEquipment.findUnique({
    where: { deviceToken: token },
    include: { itContract: { select: { id: true, clientId: true, contractNumber: true } }, item: { select: { name: true } } },
  });
  if (!eq) return null;
  if (eq.deviceTokenRevokedAt) return null;
  if (eq.deviceTokenExpiresAt && eq.deviceTokenExpiresAt < new Date()) return null;
  if (eq.removedAt) return null; // 회수된 장비는 거절
  // 슬라이딩 만료 갱신 (60일)
  await prisma.itContractEquipment.update({
    where: { id: eq.id },
    data: { deviceTokenExpiresAt: tokenExpiresAt() },
  });
  return eq;
}

/**
 * contractToken 으로 계약 인증.
 */
export async function authContractToken(token: string) {
  if (!token || !token.startsWith("ctr_")) return null;
  const c = await prisma.itContract.findUnique({
    where: { contractToken: token },
    include: { equipment: { where: { removedAt: null }, select: { id: true, serialNumber: true, itemId: true } } },
  });
  if (!c) return null;
  if (c.contractTokenExpiresAt && c.contractTokenExpiresAt < new Date()) return null;
  if (c.deletedAt) return null;
  return c;
}

export function generateContractToken(): string {
  return "ctr_" + randomUUID().replace(/-/g, "");
}
