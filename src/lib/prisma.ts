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

// Phase 2.A — soft-delete가 적용된 모델 화이트리스트.
// 이 목록의 모델은 findMany/findFirst/count 시 자동으로 deletedAt=null 필터가 주입됨.
// 호출 측이 `where.deletedAt`를 명시(`null` 포함)하면 우회 — 휴지통/관리 모드에서 사용.
const SOFT_DELETE_MODELS = new Set([
  "Client", "Item", "Warehouse", "Employee", "Department", "License", "Project",
  "Sales", "Purchase", "ItContract", "TmRental", "AsTicket", "AsDispatch",
  "Expense", "Payroll", "Incentive", "LeaveRecord", "OnboardingCard",
  "OffboardingCard", "Incident", "Evaluation", "CalendarEvent", "Schedule",
  "Calibration", "PayableReceivable",
  // Layer 1
  "BankAccount",
  // Layer 2
  "CostCenter",
]);

// 회사 분리(TV/VR) 가 적용된 모델 — findMany/findFirst/count 시 자동으로
// companyCode = session.companyCode 필터 주입. ADMIN 통합조회 시에는 우회(session.companyCode = 'ALL').
// create 시에는 data.companyCode 미설정이면 session 값으로 자동 채움.
// 마스터(Client/Item/Warehouse) 와 시스템 테이블(File/User/CodeSequence 등) 은 제외.
// 자식 테이블도 부모 → 자식 자동 propagate 위해 등록.
const COMPANY_SCOPED_MODELS = new Set([
  // Phase A (Critical 9 + CodeSequence)
  "Sales", "Purchase", "Expense", "ItContract", "TmRental",
  "AsTicket", "AsDispatch", "ItContractAmendment", "TmRentalAmendment", "CodeSequence",
  // Phase B (포탈/SNMP/적정율 15)
  "PortalPoint", "PointConfig", "PortalReward", "PortalBanner",
  "QuoteRequest", "PortalFeedback", "PortalPost", "Survey", "Referral",
  "SnmpReading", "UsageConfirmation", "AgentHeartbeat",
  "SnmpUnregisteredDevice", "YieldAnalysis", "YieldConfig",
  // Phase C (자식 9)
  "SalesItem", "PurchaseItem", "TmRentalItem", "ItContractEquipment",
  "ItMonthlyBilling", "ExpenseAllocation", "AsDispatchPart",
  "ItContractAmendmentItem", "TmRentalAmendmentItem",
  // Layer 1 — 자금관리
  "BankAccount", "CashTransaction", "BankAccountMonthlySnapshot",
  // Layer 2 — 비용/원가 관리
  "CostCenter", "AllocationRule", "Budget",
  // Layer 3 — 회계원장
  "ChartOfAccount", "JournalEntry", "JournalLine", "AccountMapping",
  // Layer 4 — 재무제표 + 기간 마감
  "AccountMonthlyBalance", "PeriodClose",
  // Layer 5 — 회계 설정 마스터
  "AccountingConfig",
]);

type AnyRecord = Record<string, unknown>;

function createBase(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// 호출 측이 where.deletedAt 를 명시했는지 확인 (true 면 자동주입 우회).
function callerWantsDeleted(args: unknown): boolean {
  const where = (args as { where?: { deletedAt?: unknown } } | undefined)?.where;
  return !!where && Object.prototype.hasOwnProperty.call(where, "deletedAt");
}

// where 에 { deletedAt: null } 자동 합성. AND/OR 절은 건드리지 않음. args 가 undefined 면 새 객체.
function injectSoftDeleteFilter(args: unknown): unknown {
  const a = (args ?? {}) as { where?: AnyRecord };
  const cur = a.where ?? {};
  return { ...a, where: { ...cur, deletedAt: null } };
}

// 호출 측이 where.companyCode 를 명시했는지 확인 (true 면 자동주입 우회).
function callerWantsCompany(args: unknown): boolean {
  const where = (args as { where?: { companyCode?: unknown } } | undefined)?.where;
  return !!where && Object.prototype.hasOwnProperty.call(where, "companyCode");
}

function injectCompanyFilter(args: unknown, companyCode: string): unknown {
  const a = (args ?? {}) as { where?: AnyRecord };
  const cur = a.where ?? {};
  return { ...a, where: { ...cur, companyCode } };
}

// create.data 에 companyCode 가 없으면 세션 값으로 자동 채움.
function injectCompanyOnCreate(args: unknown, companyCode: string): unknown {
  const a = (args ?? {}) as { data?: AnyRecord };
  const data = a.data ?? {};
  if (Object.prototype.hasOwnProperty.call(data, "companyCode")) return args;
  return { ...a, data: { ...data, companyCode } };
}

// Server Component 의 RSC 동시렌더 환경에서 AsyncLocalStorage 컨텍스트가
// fork·격리될 수 있어 getRequestContext() 만으로는 부족. fallback 으로
// next/headers 의 x-session-user 헤더를 직접 읽어 회사코드를 결정.
// route handler (withSessionContext 로 ALS 가 보장된 경우) 도 동일하게 동작.
async function resolveSessionCompanyCode(): Promise<string | null> {
  const ctx = getRequestContext();
  if (ctx) return ctx.companyCode;
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const raw = h.get("x-session-user");
    if (!raw) return null;
    const session = JSON.parse(raw) as { companyCode?: string };
    return session.companyCode ?? null;
  } catch {
    return null;
  }
}

function extendWithAudit(base: PrismaClient) {
  return base.$extends({
    name: "audit-softdelete",
    query: {
      $allModels: {
        async create({ model, args, query }) {
          // 회사 분리 — 세션 단일회사면 data.companyCode 자동 주입
          let next = args;
          if (COMPANY_SCOPED_MODELS.has(model)) {
            const cc = await resolveSessionCompanyCode();
            if (cc && cc !== "ALL") {
              next = injectCompanyOnCreate(args, cc) as never;
            }
          }
          const result = (await query(next)) as AnyRecord;
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

        async findMany({ model, args, query }) {
          let next: unknown = args;
          if (SOFT_DELETE_MODELS.has(model) && !callerWantsDeleted(next)) {
            next = injectSoftDeleteFilter(next);
          }
          if (COMPANY_SCOPED_MODELS.has(model) && !callerWantsCompany(next)) {
            const cc = await resolveSessionCompanyCode();
            if (cc && cc !== "ALL") {
              next = injectCompanyFilter(next, cc);
            }
          }
          return query(next as never);
        },

        async findFirst({ model, args, query }) {
          let next: unknown = args;
          if (SOFT_DELETE_MODELS.has(model) && !callerWantsDeleted(next)) {
            next = injectSoftDeleteFilter(next);
          }
          if (COMPANY_SCOPED_MODELS.has(model) && !callerWantsCompany(next)) {
            const cc = await resolveSessionCompanyCode();
            if (cc && cc !== "ALL") {
              next = injectCompanyFilter(next, cc);
            }
          }
          return query(next as never);
        },

        async count({ model, args, query }) {
          let next: unknown = args;
          if (SOFT_DELETE_MODELS.has(model) && !callerWantsDeleted(next)) {
            next = injectSoftDeleteFilter(next);
          }
          if (COMPANY_SCOPED_MODELS.has(model) && !callerWantsCompany(next)) {
            const cc = await resolveSessionCompanyCode();
            if (cc && cc !== "ALL") {
              next = injectCompanyFilter(next, cc);
            }
          }
          return query(next as never);
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
