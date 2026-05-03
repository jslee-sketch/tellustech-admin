import "server-only";
import { headers } from "next/headers";
import { SESSION_HEADER_USER, type SessionPayload } from "./auth";
import { requestContextStore, runWithRequestContext, type RequestContext } from "./request-context";

// Route Handler / Server Component 에서 현재 세션을 꺼내는 표준 경로.
// proxy.ts 가 JWT 검증 후 x-session-user 헤더에 세션 JSON 을 실어 보내므로
// 여기서는 헤더에서 꺼내서 파싱만 한다.

export async function getSession(): Promise<SessionPayload> {
  const h = await headers();
  const raw = h.get(SESSION_HEADER_USER);
  if (!raw) {
    throw new Error(
      "세션 헤더 누락 — 이 핸들러는 인증된 경로에서만 호출되어야 합니다 (proxy.ts 확인).",
    );
  }
  const session = JSON.parse(raw) as SessionPayload;
  // Server Component 가 getSession() 만 호출해도 이후 prisma 호출에서
  // companyCode 자동 필터/주입이 동작하도록 ALS 컨텍스트를 sticky 로 설정.
  // (Route Handler 는 withSessionContext 로 별도 wrap — 그쪽이 우선이라 무관)
  if (!requestContextStore.getStore()) {
    const ctx: RequestContext = {
      userId: session.sub,
      username: session.username,
      role: session.role,
      companyCode: session.companyCode,
      empCode: session.empCode,
      language: session.language,
    };
    requestContextStore.enterWith(ctx);
  }
  return session;
}

/**
 * 감사로그용 ALS 컨텍스트를 설정한 상태로 비동기 작업을 실행.
 * 인증이 필요한 Route Handler 의 본문은 전부 이 안에서 동작해야 Prisma 쓰기가
 * 자동으로 감사됨.
 */
export async function withSessionContext<T>(fn: (session: SessionPayload) => Promise<T>): Promise<T> {
  const session = await getSession();
  const ctx: RequestContext = {
    userId: session.sub,
    username: session.username,
    role: session.role,
    companyCode: session.companyCode,
    empCode: session.empCode,
    language: session.language,
  };
  return runWithRequestContext(ctx, () => fn(session));
}
