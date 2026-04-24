import "server-only";
import jwt, { type JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { CompanyCode, Language, UserRole } from "@/generated/prisma/client";

export const SESSION_COOKIE = "tts_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8시간

export type SessionPayload = {
  sub: string;               // user.id
  username: string;
  role: UserRole;
  companyCode: CompanyCode;  // 로그인 시 선택된 회사 (세션 동안 고정)
  allowedCompanies: CompanyCode[];
  language: Language;        // UI 표시 언어 + 채팅 번역 기본
  empCode: string | null;    // 직원 연결된 경우 사원코드, 아니면 null
};

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

export function hashPassword(pw: string): string {
  return bcrypt.hashSync(pw, 10);
}

export function verifyPassword(pw: string, hash: string): boolean {
  return bcrypt.compareSync(pw, hash);
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: SESSION_TTL_SECONDS });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as JwtPayload & Partial<SessionPayload>;
    if (
      typeof decoded.sub !== "string" ||
      typeof decoded.username !== "string" ||
      typeof decoded.role !== "string" ||
      typeof decoded.companyCode !== "string" ||
      !Array.isArray(decoded.allowedCompanies) ||
      typeof decoded.language !== "string"
    ) {
      return null;
    }
    return {
      sub: decoded.sub,
      username: decoded.username,
      role: decoded.role as UserRole,
      companyCode: decoded.companyCode as CompanyCode,
      allowedCompanies: decoded.allowedCompanies as CompanyCode[],
      language: decoded.language as Language,
      empCode: (decoded.empCode ?? null) as string | null,
    };
  } catch {
    return null;
  }
}

export const PROTECTED_PATH_PREFIXES = ["/dashboard", "/app"];
export const PUBLIC_PATHS = ["/login"];

// proxy.ts가 쿠키만 검증하고 주입할 세션 헤더 이름.
// 서버 컴포넌트/Route Handler에서 이 헤더로 현재 사용자를 신속히 식별.
export const SESSION_HEADER_USER = "x-session-user";
export const SESSION_HEADER_COMPANY = "x-session-company";
