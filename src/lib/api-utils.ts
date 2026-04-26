import "server-only";
import { NextResponse } from "next/server";
import type { CompanyCode } from "@/generated/prisma/client";
import type { SessionPayload } from "./auth";

// Phase 1-4 CRUD 라우트 전반에서 반복되는 응답/권한 패턴을 모아두는 유틸.
// 목표: Route Handler 본문이 도메인 로직만 남고 보일러플레이트는 여기로.

// ─── 응답 헬퍼 ──────────────────────────────────────────────────────────

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(error: string, details?: unknown) {
  return NextResponse.json({ error, details }, { status: 400 });
}

export function notFound(error = "not_found") {
  return NextResponse.json({ error }, { status: 404 });
}

export function conflict(error: string, details?: unknown) {
  return NextResponse.json({ error, details }, { status: 409 });
}

export function forbidden(error = "forbidden") {
  return NextResponse.json({ error }, { status: 403 });
}

export function serverError(error: unknown) {
  console.error("[api] server error:", error);
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}

// ─── 회사 스코프 ────────────────────────────────────────────────────────
// 업무 테이블에서 WHERE company_code = session.companyCode 를 명시적으로 주입.
// 공유 마스터(Client/Item/Warehouse)에는 사용하지 않음.

export function companyScope(session: SessionPayload): { companyCode?: CompanyCode | { in: CompanyCode[] } } {
  // 통합조회 모드 (companyCode='ALL' 가상값): allowedCompanies 전체로 IN 절.
  if ((session.companyCode as unknown as string) === "ALL") {
    return { companyCode: { in: session.allowedCompanies } };
  }
  return { companyCode: session.companyCode };
}

// ─── Prisma 에러 매핑 ───────────────────────────────────────────────────

type PrismaError = { code?: string; meta?: { target?: string[] | string } };

export function isUniqueConstraintError(err: unknown): err is PrismaError {
  return Boolean(err && typeof err === "object" && (err as PrismaError).code === "P2002");
}

export function isRecordNotFoundError(err: unknown): err is PrismaError {
  return Boolean(err && typeof err === "object" && (err as PrismaError).code === "P2025");
}

export function isForeignKeyError(err: unknown): err is PrismaError {
  return Boolean(err && typeof err === "object" && (err as PrismaError).code === "P2003");
}

// ─── 입력 필드 공통 트리머/검증 ─────────────────────────────────────────

export function trimNonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length === 0 ? null : v;
}

export function requireString(value: unknown, field: string): string {
  const v = trimNonEmpty(value);
  if (!v) throw new FieldError(field, "required");
  return v;
}

export function requireEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  const v = trimNonEmpty(value);
  if (!v || !(allowed as readonly string[]).includes(v)) {
    throw new FieldError(field, "invalid");
  }
  return v as T;
}

export function optionalEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const v = trimNonEmpty(value);
  if (!v) return null;
  if (!(allowed as readonly string[]).includes(v)) return null;
  return v as T;
}

export class FieldError extends Error {
  constructor(public field: string, public reason: string) {
    super(`${field}: ${reason}`);
  }
}

export function handleFieldError(err: unknown) {
  if (err instanceof FieldError) {
    return badRequest("invalid_input", { field: err.field, reason: err.reason });
  }
  return null;
}
