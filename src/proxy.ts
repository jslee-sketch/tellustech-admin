// Next.js 16부터 Middleware는 Proxy로 이름 변경 (node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
// 이 파일은 요청 시점에 쿠키를 검증하여 인증 가드와 세션 헤더 주입을 담당.
// - 미인증 요청이 보호 경로에 닿으면 /login 으로 리다이렉트
// - 인증된 요청은 downstream(Route Handler / Server Component)에 x-session-* 헤더 주입

import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_HEADER_COMPANY,
  SESSION_HEADER_USER,
  verifySession,
} from "@/lib/auth";

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Next.js 내부/정적 파일은 matcher에서 거르지만 한 번 더 방어.
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

// /api/jobs/* 는 외부 cron 호출자용. 라우트 자체에서 Bearer CRON_SECRET 또는 ADMIN
// 세션을 직접 검증하므로 미들웨어 인증 가드(401)를 우회한다. 단, 세션 쿠키가 있으면
// 평소처럼 헤더를 주입해서 ADMIN bypass 가 동작하도록 한다.
function isCronPath(pathname: string): boolean {
  return pathname.startsWith("/api/jobs/");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    // /api/jobs/* 는 라우트가 자체 인증(Bearer or ADMIN session) — 그냥 통과.
    if (isCronPath(pathname)) return NextResponse.next();
    // API 요청은 401 JSON, 페이지 요청은 /login 리다이렉트
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    // 원래 가려던 경로를 next 쿼리로 유지 (로그인 후 돌아가기)
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // CLIENT (고객 포탈) 세션 경로 제한: /portal, /api/portal, /api/auth/*, /login, /api/files 만 허용.
  if (session.role === "CLIENT") {
    const allowed =
      pathname.startsWith("/portal") ||
      pathname.startsWith("/api/portal") ||
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/files") ||
      pathname === "/login";
    if (!allowed) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "forbidden_for_client" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  } else {
    // 직원 세션이 /portal 로 들어가면 본 대시보드로.
    if (pathname.startsWith("/portal")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 인증 성공 — downstream이 현재 사용자/회사를 즉시 알 수 있도록 헤더 주입.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SESSION_HEADER_USER, JSON.stringify(session));
  requestHeaders.set(SESSION_HEADER_COMPANY, session.companyCode);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // 정적 에셋과 Next.js 내부 경로는 제외. 나머지 모든 요청에 대해 실행.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
