import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  verifyPassword,
  type SessionPayload,
} from "@/lib/auth";
import type { CompanyCode, Language } from "@/generated/prisma/client";

type LoginBody = {
  companyCode?: string;
  username?: string;
  password?: string;
  language?: string; // "VI" | "EN" | "KO"
};

const VALID_COMPANIES: CompanyCode[] = ["TV", "VR"];
const VALID_LANGUAGES: Language[] = ["VI", "EN", "KO"];

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const companyCode = body.companyCode?.toUpperCase() as CompanyCode | undefined;
  const username = body.username?.trim();
  const password = body.password ?? "";
  const language = body.language?.toUpperCase() as Language | undefined;

  if (!username || !password || !language || !VALID_LANGUAGES.includes(language)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      employee: { select: { employeeCode: true } },
      clientAccount: { select: { id: true, clientCode: true, companyNameVi: true } },
    },
  });

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  // CLIENT 는 companyCode 불필요 — clientCode 기반
  if (user.role !== "CLIENT") {
    if (!companyCode || !VALID_COMPANIES.includes(companyCode)) {
      return NextResponse.json({ error: "invalid_input", field: "companyCode" }, { status: 400 });
    }
    if (!user.allowedCompanies.includes(companyCode)) {
      return NextResponse.json({ error: "company_not_allowed" }, { status: 403 });
    }
  }

  // 마지막 선택 언어 + 로그인 시각 갱신
  await prisma.user.update({
    where: { id: user.id },
    data: { preferredLang: language, lastLoginAt: new Date() },
  });

  const payload: SessionPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    // CLIENT 는 거래처 스코프이므로 회사코드가 의미 없음 — 임시로 TV 배정해 두되 proxy 가 경로로 막음.
    companyCode: user.role === "CLIENT" ? "TV" : (companyCode as CompanyCode),
    allowedCompanies: user.role === "CLIENT" ? [] : user.allowedCompanies,
    language,
    empCode: user.employee?.employeeCode ?? (user.clientAccount?.clientCode ?? null),
  };

  const token = signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return NextResponse.json({
    ok: true,
    user: {
      username: payload.username,
      role: payload.role,
      companyCode: payload.companyCode,
      allowedCompanies: payload.allowedCompanies,
      language: payload.language,
      empCode: payload.empCode,
    },
  });
}
