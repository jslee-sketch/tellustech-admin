import "server-only";
import { prisma } from "./prisma";
import type { PermissionLevel, PermissionModule } from "@/generated/prisma/client";

// 사용자 권한 조회/검증 헬퍼.
// ADMIN/MANAGER 는 모든 모듈 자동 WRITE. CLIENT 는 portal 외 전부 HIDDEN.
// 일반 사용자는 user_permissions 테이블에서 행별 조회.

const ADMIN_ROLES = new Set(["ADMIN", "MANAGER"]);

export type EffectivePermission = PermissionLevel; // "HIDDEN" | "VIEW" | "WRITE"

export async function getEffectivePermission(
  userId: string,
  role: string,
  module: PermissionModule,
): Promise<EffectivePermission> {
  if (ADMIN_ROLES.has(role)) return "WRITE";
  if (role === "CLIENT") return "HIDDEN";
  const row = await prisma.userPermission.findUnique({
    where: { userId_module: { userId, module } },
    select: { level: true },
  });
  return row?.level ?? "VIEW"; // 미설정 = 기본 VIEW (회사 통상 정책)
}

export async function getAllPermissions(
  userId: string,
  role: string,
): Promise<Record<PermissionModule, EffectivePermission>> {
  const out = {} as Record<PermissionModule, EffectivePermission>;
  if (ADMIN_ROLES.has(role)) {
    // 모든 모듈 WRITE — enum 전부 매핑
    for (const m of ALL_MODULES) out[m] = "WRITE";
    return out;
  }
  if (role === "CLIENT") {
    for (const m of ALL_MODULES) out[m] = "HIDDEN";
    return out;
  }
  const rows = await prisma.userPermission.findMany({
    where: { userId },
    select: { module: true, level: true },
  });
  for (const m of ALL_MODULES) out[m] = "VIEW";
  for (const r of rows) out[r.module] = r.level;
  return out;
}

export const ALL_MODULES: readonly PermissionModule[] = [
  "CLIENTS", "ITEMS", "WAREHOUSES", "EMPLOYEES", "DEPARTMENTS",
  "PROJECTS", "LICENSES", "SCHEDULES",
  "SALES", "PURCHASES", "IT_CONTRACTS", "TM_RENTALS",
  "AS_TICKETS", "AS_DISPATCHES", "CALIBRATIONS",
  "INVENTORY",
  "HR_LEAVE", "HR_ONBOARDING", "HR_OFFBOARDING", "HR_INCIDENT",
  "HR_EVALUATION", "HR_PAYROLL", "HR_INCENTIVE",
  "FINANCE_PAYABLE", "FINANCE_RECEIVABLE", "FINANCE_EXPENSE",
  "STATS", "CHAT", "CALENDAR", "AUDIT", "ADMIN",
];

export function canRead(level: EffectivePermission): boolean {
  return level === "VIEW" || level === "WRITE";
}
export function canWrite(level: EffectivePermission): boolean {
  return level === "WRITE";
}
