import "server-only";
import { prisma } from "./prisma";

// 자동 코드 생성 유틸 — 가이드의 "코드-YYMMDD-###" 패턴을 전 모듈에서 재사용.
// CodeSequence 테이블 사용 — atomic upsert + increment 로 race condition 0.
// (이전 MAX+1 방식은 100건 동시 시 75% 충돌 — counter 도입으로 해결)

export function formatYyMmDd(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

type GenerateOpts = {
  /** 코드 접두어. 예: "ITM", "CL", "LV" */
  prefix: string;
  /** 날짜 세그먼트의 구분자. 기본 "-". 예: "ITM-260423-001" */
  separator?: string;
  /** 오늘 접두어(예: "ITM-260423-") 로 시작하는 최대 코드 문자열을 반환.
   *  없으면 null. */
  lookupLast: (fullPrefix: string) => Promise<string | null>;
  /** 순번 자릿수. 기본 3 ("001"~"999"). */
  digits?: number;
  /** 기준 날짜 (테스트용 주입). 기본 now. */
  date?: Date;
};

export async function generateDatedCode(opts: GenerateOpts): Promise<string> {
  const sep = opts.separator ?? "-";
  const digits = opts.digits ?? 3;
  const dateSeg = formatYyMmDd(opts.date);
  const fullPrefix = `${opts.prefix}${sep}${dateSeg}${sep}`;
  const seqKey = `${opts.prefix}${sep}${dateSeg}`;

  // CodeSequence atomic counter. lookupLast 는 호환성 위해 보존하지만 시드/마이그레이션용.
  // 1) 첫 호출이면 lookupLast 로 기존 MAX 찾아 seed
  // 2) 이후 atomic upsert + increment 로 race-zero
  const existing = await prisma.codeSequence.findUnique({ where: { key: seqKey } });
  if (!existing) {
    let seedNext = 1;
    const last = await opts.lookupLast(fullPrefix);
    if (last) {
      const tail = last.slice(fullPrefix.length);
      const n = Number(tail);
      if (Number.isInteger(n) && n >= 0) seedNext = n + 1;
    }
    // upsert seed (race-safe — 다른 동시 호출이 먼저 만들었어도 ON CONFLICT DO NOTHING 효과)
    await prisma.codeSequence.upsert({
      where: { key: seqKey },
      create: { key: seqKey, next: seedNext },
      update: {}, // 이미 있으면 건드리지 않음
    });
  }
  // atomic increment
  const updated = await prisma.codeSequence.update({
    where: { key: seqKey },
    data: { next: { increment: 1 } },
    select: { next: true },
  });
  // updated.next 가 새로 increment 된 값. 발급은 그 직전 값 = updated.next - 1
  const issued = updated.next - 1;
  return `${fullPrefix}${String(issued).padStart(digits, "0")}`;
}

type GenerateSequentialOpts = {
  /** 접두어 전체. 예: "TNV-", "VNV-". 구분자 포함. */
  prefix: string;
  /** 접두어로 시작하는 최대 코드 반환(없으면 null). */
  lookupLast: (prefix: string) => Promise<string | null>;
  /** 순번 자릿수. 기본 3. */
  digits?: number;
};

/** 날짜 세그먼트 없이 prefix + 순번만 — 예: "TNV-001". 사원코드 등. */
export async function generateSequentialCode(opts: GenerateSequentialOpts): Promise<string> {
  const digits = opts.digits ?? 3;
  const seqKey = opts.prefix; // "TNV-" 등 prefix 자체

  const existing = await prisma.codeSequence.findUnique({ where: { key: seqKey } });
  if (!existing) {
    let seedNext = 1;
    const last = await opts.lookupLast(opts.prefix);
    if (last) {
      const tail = last.slice(opts.prefix.length);
      const n = Number(tail);
      if (Number.isInteger(n) && n >= 0) seedNext = n + 1;
    }
    await prisma.codeSequence.upsert({
      where: { key: seqKey },
      create: { key: seqKey, next: seedNext },
      update: {},
    });
  }
  const updated = await prisma.codeSequence.update({
    where: { key: seqKey },
    data: { next: { increment: 1 } },
    select: { next: true },
  });
  const issued = updated.next - 1;
  return `${opts.prefix}${String(issued).padStart(digits, "0")}`;
}

/**
 * unique 충돌 시 최대 N 회 재시도하는 래퍼. CRUD POST 에서 `generateDatedCode` /
 * `generateSequentialCode` 호출 → create 호출 패턴을 감쌀 때 사용.
 */
export async function withUniqueRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; isConflict: (err: unknown) => boolean } = {
    isConflict: () => false,
  },
): Promise<T> {
  const attempts = opts.attempts ?? 30; // 100+ 동시 race 대비 (전: 12)
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!opts.isConflict(err)) throw err;
      // 큰 jitter — 동시 시도자가 서로 다른 시점에 retry
      const baseWait = Math.min(30 * Math.pow(1.4, i), 1500);
      const wait = baseWait + Math.random() * 300; // 0~300ms jitter
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}
