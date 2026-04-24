import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@/lib/auth";
import type { Language } from "@/generated/prisma/client";

const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

// PATCH /api/auth/language { language: "VI" | "EN" | "KO" }
// 사용자 기본 언어 변경 → DB 에 저장 + 세션 JWT 재발급.
export async function PATCH(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const lang = p.language;
    if (typeof lang !== "string" || !LANGS.includes(lang as Language)) {
      return badRequest("invalid_input", { field: "language" });
    }
    try {
      await prisma.user.update({
        where: { id: session.sub },
        data: { preferredLang: lang as Language },
      });
      // 세션 토큰에 language 가 박혀있으므로 재발급
      const newToken = signSession({ ...session, language: lang as Language });
      const res = NextResponse.json({ ok: true, language: lang });
      const c = await cookies();
      c.set(SESSION_COOKIE, newToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_TTL_SECONDS,
        path: "/",
      });
      return res;
    } catch (err) {
      return serverError(err);
    }
    return ok({ ok: true });
  });
}
