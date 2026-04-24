import "server-only";

// 자동 코드 생성 유틸 — 가이드의 "코드-YYMMDD-###" 패턴을 전 모듈에서 재사용.
// MAX+1 방식 (별도 counters 테이블 없음). 드물게 발생할 동시 생성 경합은
// DB unique 제약 + 호출자의 재시도 루프로 방어.

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

  const last = await opts.lookupLast(fullPrefix);
  let next = 1;
  if (last) {
    const tail = last.slice(fullPrefix.length);
    const n = Number(tail);
    if (Number.isInteger(n) && n >= 0) next = n + 1;
  }
  return `${fullPrefix}${String(next).padStart(digits, "0")}`;
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
  const last = await opts.lookupLast(opts.prefix);
  let next = 1;
  if (last) {
    const tail = last.slice(opts.prefix.length);
    const n = Number(tail);
    if (Number.isInteger(n) && n >= 0) next = n + 1;
  }
  return `${opts.prefix}${String(next).padStart(digits, "0")}`;
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
  const attempts = opts.attempts ?? 5;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!opts.isConflict(err)) throw err;
    }
  }
  throw lastErr;
}
