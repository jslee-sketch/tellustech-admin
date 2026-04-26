import { cookies } from "next/headers";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import { signSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth";
import type { CompanyCode } from "@/generated/prisma/client";

// PUT /api/auth/company  body: { companyCode: 'TV' | 'VR' | 'ALL' }
//   세션의 활성 회사를 변경. ALL 은 통합조회 모드 (allowedCompanies 가 2개 이상인 ADMIN/MANAGER 만).
//   결과: 새 JWT 발행 + tts_session 쿠키 갱신.

const VALID = new Set(["TV", "VR", "ALL"]);

export async function PUT(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const target = (body as { companyCode?: string }).companyCode;
    if (!target || !VALID.has(target)) return badRequest("invalid_input", { field: "companyCode" });

    if (target === "ALL") {
      if (session.role !== "ADMIN" && session.role !== "MANAGER") return badRequest("forbidden");
      if (session.allowedCompanies.length < 2) return badRequest("not_enough_companies");
    } else {
      if (!session.allowedCompanies.includes(target as CompanyCode)) return badRequest("not_allowed");
    }

    try {
      const newSession = { ...session, companyCode: target as CompanyCode };
      const token = signSession(newSession);
      const c = await cookies();
      c.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_TTL_SECONDS,
        path: "/",
      });
      return ok({ ok: true, companyCode: target });
    } catch (err) { return serverError(err); }
  });
}
