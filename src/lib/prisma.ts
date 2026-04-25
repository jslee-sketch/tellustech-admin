import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { getRequestContext } from "./request-context";

// Prisma 7 driver adapter 필수 — pg 어댑터로 연결.
// 감사로그: $extends 쿼리 훅으로 모든 CUD를 audit_log에 기록. 재귀 방지를 위해
// audit 쓰기는 base(확장 안 된) client 로 수행. 다른 코드가 import 하는 `prisma`는
// extended 버전이므로 일반 CRUD 는 자동 감사.
//
// 기록 대상: 모든 모델의 INSERT/UPDATE/DELETE/UPSERT.
// 스킵: AuditLog, Notification 모델 자체 / 요청 컨텍스트 없음(시드/마이그레이션) /
//       User 업데이트가 lastLoginAt·preferredLang 만 바꿀 때.
// 참고: audit_log.tableName 에는 Prisma 모델명(PascalCase)을 그대로 저장한다.

const SKIP_MODELS = new Set(["AuditLog", "Notification"]);
const USER_META_FIELDS = new Set(["lastLoginAt", "preferredLang", "updatedAt"]);

type AnyRecord = Record<string, unknown>;

function createBase(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

function extendWithAudit(base: PrismaClient) {
  return base.$extends({
    name: "audit",
    query: {
      $allModels: {
        async create({ model, args, query }) {
          const result = (await query(args)) as AnyRecord;
          await writeAudit({ model, action: "INSERT", before: null, after: result });
          return result;
        },

        async update({ model, args, query }) {
          const before = await fetchBefore(base, model, args);
          const result = (await query(args)) as AnyRecord;
          if (!skipUserMetaOnly(model, args as { data?: AnyRecord })) {
            await writeAudit({ model, action: "UPDATE", before, after: result });
          }
          return result;
        },

        async delete({ model, args, query }) {
          const before = await fetchBefore(base, model, args);
          const result = (await query(args)) as AnyRecord;
          await writeAudit({ model, action: "DELETE", before, after: null });
          return result;
        },

        async upsert({ model, args, query }) {
          // upsert where 절로 사전 조회 → before 가 있으면 UPDATE, 없으면 INSERT.
          const before = await fetchBefore(base, model, { where: (args as { where: unknown }).where });
          const result = (await query(args)) as AnyRecord;
          await writeAudit({
            model,
            action: before ? "UPDATE" : "INSERT",
            before,
            after: result,
          });
          return result;
        },
      },
    },
  });
}

type AuditInput = {
  model: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  before: AnyRecord | null;
  after: AnyRecord | null;
};

async function writeAudit(input: AuditInput): Promise<void> {
  if (SKIP_MODELS.has(input.model)) return;
  const ctx = getRequestContext();
  if (!ctx) return;
  const recordId = extractId(input.after ?? input.before);
  if (!recordId) return;
  try {
    await base.auditLog.create({
      data: {
        companyCode: ctx.companyCode,
        userId: ctx.userId,
        tableName: input.model,
        recordId,
        action: input.action,
        before: (input.before as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        after: (input.after as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
    });
  } catch (err) {
    // 감사 실패가 주 요청을 깨지 않도록 로그만.
    console.error("[audit] write failed", { model: input.model, action: input.action, err });
  }
}

function skipUserMetaOnly(model: string, args: { data?: AnyRecord }): boolean {
  if (model !== "User") return false;
  const data = args.data;
  if (!data || typeof data !== "object") return false;
  const keys = Object.keys(data).filter((k) => !USER_META_FIELDS.has(k));
  return keys.length === 0;
}

async function fetchBefore(
  base: PrismaClient,
  model: string,
  args: unknown,
): Promise<AnyRecord | null> {
  const where = (args as { where?: unknown } | undefined)?.where;
  if (!where) return null;
  const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
  // Prisma delegate 는 string key 로 접근 가능.
  const delegate = (base as unknown as Record<string, { findUnique: (p: { where: unknown }) => Promise<AnyRecord | null> }>)[modelKey];
  if (!delegate || typeof delegate.findUnique !== "function") return null;
  try {
    return await delegate.findUnique({ where });
  } catch {
    return null;
  }
}

function extractId(obj: AnyRecord | null): string | null {
  if (!obj) return null;
  const id = obj.id;
  return typeof id === "string" ? id : null;
}

// ─── 싱글톤 ──────────────────────────────────────────────────────────────
// HMR 시 재생성을 막기 위해 globalThis 캐시.

type ExtendedPrisma = ReturnType<typeof extendWithAudit>;

// $transaction 콜백이 받는 클라이언트 타입(audit 확장 포함). 트랜잭션 안에서 동작하는
// 헬퍼 함수 시그니처에 사용.
export type TxClient = Parameters<Parameters<ExtendedPrisma["$transaction"]>[0]>[0];

const globalForPrisma = globalThis as unknown as {
  _ttsPrismaBase?: PrismaClient;
  _ttsPrisma?: ExtendedPrisma;
};

const base: PrismaClient = globalForPrisma._ttsPrismaBase ?? createBase();
export const prisma: ExtendedPrisma = globalForPrisma._ttsPrisma ?? extendWithAudit(base);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma._ttsPrismaBase = base;
  globalForPrisma._ttsPrisma = prisma;
}
