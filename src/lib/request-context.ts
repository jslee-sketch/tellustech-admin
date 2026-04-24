import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { CompanyCode, Language, UserRole } from "@/generated/prisma/client";

// 한 요청 동안의 사용자 컨텍스트. Prisma 감사로그 훅과 비즈니스 로직에서
// AsyncLocalStorage 를 통해 꺼내 쓴다. proxy.ts 가 주입한 세션 헤더를
// Route Handler 진입 시 `withRequestContext` 로 ALS 에 담는다.
//
// ⚠️ HMR 주의: ALS 인스턴스를 globalThis 에 캐시하지 않으면, prisma.ts 처럼
// globalThis 로 캐시되는 다른 모듈이 HMR 에 걸리지 않고 "이전" ALS 를 closure
// 로 붙든 채 남아, `withSessionContext`(HMR 후 "새" ALS)가 설정한 컨텍스트와
// 연결되지 않는 문제가 발생한다. 두 모듈이 같은 ALS 인스턴스를 참조하도록 고정.

export type RequestContext = {
  userId: string;
  username: string;
  role: UserRole;
  companyCode: CompanyCode;
  empCode: string | null;
  language: Language;
};

const globalForRequestContext = globalThis as unknown as {
  _ttsRequestContextStore?: AsyncLocalStorage<RequestContext>;
};

export const requestContextStore: AsyncLocalStorage<RequestContext> =
  globalForRequestContext._ttsRequestContextStore ?? new AsyncLocalStorage<RequestContext>();

if (process.env.NODE_ENV !== "production") {
  globalForRequestContext._ttsRequestContextStore = requestContextStore;
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStore.getStore();
}

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return requestContextStore.run(ctx, fn);
}
