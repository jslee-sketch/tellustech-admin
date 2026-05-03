// 역할별 접근 정책 — 재경 모듈 RBAC 가드.
// 호출: const session = await getSession(); requireFinanceRole(session, "manager");

import type { SessionPayload } from "@/lib/auth";

export type FinanceTier =
  | "client"      // 비용 등록/조회 가능 (EMPLOYEE 이상)
  | "manager"    // 자금/원장/재무제표 조회 가능 (MANAGER 이상)
  | "admin";    // 마감/설정 변경 (ADMIN 만)

const ROLE_RANK: Record<string, number> = {
  CLIENT: 0,
  EMPLOYEE: 1,
  MANAGER: 2,
  ADMIN: 3,
};

const TIER_RANK: Record<FinanceTier, number> = {
  client: 1,    // EMPLOYEE+
  manager: 2,   // MANAGER+
  admin: 3,     // ADMIN
};

export function hasFinanceTier(session: SessionPayload, tier: FinanceTier): boolean {
  const r = ROLE_RANK[session.role] ?? 0;
  return r >= TIER_RANK[tier];
}

// 재경 페이지에서 CLIENT 차단 + 필요한 tier 미달 시 false. 호출측에서 redirect.
export function checkFinanceAccess(session: SessionPayload, tier: FinanceTier): { ok: boolean; redirectTo?: string } {
  if (session.role === "CLIENT") return { ok: false, redirectTo: "/portal" };
  if (!hasFinanceTier(session, tier)) return { ok: false, redirectTo: "/" };
  return { ok: true };
}
