import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  optionalEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import { getKoreaHolidays, getVietnamHolidays } from "@/lib/holidays";
import { fillTranslations } from "@/lib/translate";
import { t } from "@/lib/i18n";
import type { CalendarEventType, Language } from "@/generated/prisma/client";

const TYPES: readonly CalendarEventType[] = [
  "SCHEDULE_DEADLINE", "WEEKLY_REPORT", "CONTRACT_EXPIRY", "CERT_EXPIRY",
  "LICENSE_EXPIRY", "AR_DUE", "LEAVE", "AS_DISPATCH", "RENTAL_ORDER",
  "BIRTHDAY", "HOLIDAY_VN", "HOLIDAY_KR", "CUSTOM",
] as const;
const LANGS: readonly Language[] = ["VI", "EN", "KO"] as const;

type Badge = "GREEN" | "YELLOW" | "RED" | null;

type AggEvent = {
  id: string;
  title: string;
  start: string;
  end?: string | null;
  allDay: boolean;
  type: CalendarEventType;
  color?: string | null;
  linkedUrl?: string | null;
  module?: string;
  assignee?: string | null; // 표시용 — 직원명/거래처명/null
  badge?: Badge;            // 🟢🟡🔴 (뱃지 의미가 있는 type 만)
};

const DAY_MS = 24 * 60 * 60 * 1000;

function calcBadge(deadline: Date, now: Date): Badge {
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS);
  if (diffDays < 0) return "RED";
  if (diffDays <= 3) return "YELLOW";
  return "GREEN";
}

const COLORS: Record<CalendarEventType, string> = {
  SCHEDULE_DEADLINE: "#3b82f6", // blue
  WEEKLY_REPORT:     "#a855f7", // purple
  CONTRACT_EXPIRY:   "#f97316", // orange
  CERT_EXPIRY:       "#a16207", // brown
  LICENSE_EXPIRY:    "#ef4444", // red
  AR_DUE:            "#eab308", // gold
  LEAVE:             "#22c55e", // green
  AS_DISPATCH:       "#6b7280", // gray
  RENTAL_ORDER:      "#7dd3fc", // sky
  BIRTHDAY:          "#ec4899", // pink
  HOLIDAY_VN:        "#dc2626", // red bg
  HOLIDAY_KR:        "#2563eb", // blue bg
  CUSTOM:            "#a3a3a3",
};

function parseRange(req: Request): { start: Date; end: Date } {
  const url = new URL(req.url);
  const startStr = url.searchParams.get("start");
  const endStr = url.searchParams.get("end");
  const start = startStr ? new Date(startStr) : new Date(new Date().setDate(1));
  const end = endStr ? new Date(endStr) : new Date(start.getFullYear(), start.getMonth() + 1, 0);
  if (end.getHours() === 0 && end.getMinutes() === 0) end.setHours(23, 59, 59, 999);
  return { start, end };
}

function fridaysBetween(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const d = new Date(start);
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  while (d <= end) {
    const fri = new Date(d);
    fri.setUTCHours(11, 0, 0, 0); // 18:00 ICT
    out.push(fri);
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    try {
      const { start, end } = parseRange(request);
      const now = new Date();
      const events: AggEvent[] = [];

      // 1) Schedule 마감
      const schedules = await prisma.schedule.findMany({
        where: { companyCode: session.companyCode, dueAt: { gte: start, lte: end } },
        select: {
          id: true, title: true, dueAt: true,
          targets: { select: { nameVi: true }, take: 3 },
        },
      });
      for (const s of schedules) {
        events.push({
          id: `sch:${s.id}`, title: `📋 ${s.title}`, start: s.dueAt.toISOString(), allDay: false,
          type: "SCHEDULE_DEADLINE", color: COLORS.SCHEDULE_DEADLINE,
          linkedUrl: `/master/schedules/${s.id}`,
          assignee: s.targets.map((t) => t.nameVi).join(", ") || null,
          badge: calcBadge(s.dueAt, now),
        });
      }

      // 2) 주간회의 마감 (매주 금요일)
      const weeklyTitle = t("calendarEvt.weeklyDeadline", session.language);
      for (const fri of fridaysBetween(start, end)) {
        events.push({
          id: `wr:${fri.toISOString().slice(0, 10)}`, title: weeklyTitle,
          start: fri.toISOString(), allDay: false,
          type: "WEEKLY_REPORT", color: COLORS.WEEKLY_REPORT,
          linkedUrl: "/weekly-report",
          badge: calcBadge(fri, now),
        });
      }

      // 3) IT 계약 만료
      const contracts = await prisma.itContract.findMany({
        where: { endDate: { gte: start, lte: end } },
        select: { id: true, contractNumber: true, endDate: true, client: { select: { companyNameVi: true } } },
      });
      for (const c of contracts) {
        events.push({
          id: `cn:${c.id}`, title: `${t("calendarEvt.contractExpiry", session.language)} — ${c.contractNumber}`,
          start: c.endDate.toISOString(), allDay: true,
          type: "CONTRACT_EXPIRY", color: COLORS.CONTRACT_EXPIRY,
          linkedUrl: `/rental/it-contracts/${c.id}`,
          assignee: c.client.companyNameVi,
          badge: calcBadge(c.endDate, now),
        });
      }

      // 4) 성적서 만료
      const certs = await prisma.salesItem.findMany({
        where: { nextDueAt: { gte: start, lte: end } },
        select: {
          id: true, certNumber: true, nextDueAt: true, salesId: true,
          sales: { select: { salesEmployeeId: true, client: { select: { companyNameVi: true } } } },
        },
      });
      const certEmpIds = Array.from(new Set(certs.map((c) => c.sales.salesEmployeeId).filter((x): x is string => !!x)));
      const certEmps = certEmpIds.length > 0
        ? await prisma.employee.findMany({ where: { id: { in: certEmpIds } }, select: { id: true, nameVi: true } })
        : [];
      const certEmpMap = new Map(certEmps.map((e) => [e.id, e.nameVi]));
      for (const ci of certs) {
        if (!ci.nextDueAt) continue;
        const empName = ci.sales.salesEmployeeId ? certEmpMap.get(ci.sales.salesEmployeeId) ?? null : null;
        events.push({
          id: `ct:${ci.id}`, title: `${t("calendarEvt.certExpiry", session.language)} — ${ci.certNumber ?? ci.id.slice(-6)}`,
          start: ci.nextDueAt.toISOString(), allDay: true,
          type: "CERT_EXPIRY", color: COLORS.CERT_EXPIRY,
          linkedUrl: `/sales/${ci.salesId}`,
          assignee: empName ?? ci.sales.client?.companyNameVi ?? null,
          badge: calcBadge(ci.nextDueAt, now),
        });
      }

      // 5) 라이선스 만료
      const licenses = await prisma.license.findMany({
        where: { companyCode: session.companyCode, expiresAt: { gte: start, lte: end } },
        select: { id: true, licenseCode: true, name: true, expiresAt: true, owner: { select: { nameVi: true } } },
      });
      for (const l of licenses) {
        events.push({
          id: `lc:${l.id}`, title: `${t("calendarEvt.licenseExpiry", session.language)} — ${l.name} (${l.licenseCode})`,
          start: l.expiresAt.toISOString(), allDay: true,
          type: "LICENSE_EXPIRY", color: COLORS.LICENSE_EXPIRY,
          linkedUrl: `/master/licenses`,
          assignee: l.owner?.nameVi ?? null,
          badge: calcBadge(l.expiresAt, now),
        });
      }

      // 6) 미수금 납기
      const receivables = await prisma.payableReceivable.findMany({
        where: {
          kind: "RECEIVABLE",
          status: { in: ["OPEN", "PARTIAL"] },
          dueDate: { gte: start, lte: end },
        },
        select: {
          id: true, amount: true, dueDate: true,
          sales: { select: { salesNumber: true, salesEmployeeId: true, client: { select: { companyNameVi: true } } } },
        },
      });
      const arEmpIds = Array.from(new Set(receivables.map((r) => r.sales?.salesEmployeeId).filter((x): x is string => !!x)));
      const arEmps = arEmpIds.length > 0
        ? await prisma.employee.findMany({ where: { id: { in: arEmpIds } }, select: { id: true, nameVi: true } })
        : [];
      const arEmpMap = new Map(arEmps.map((e) => [e.id, e.nameVi]));
      for (const r of receivables) {
        if (!r.dueDate) continue;
        const empName = r.sales?.salesEmployeeId ? arEmpMap.get(r.sales.salesEmployeeId) ?? null : null;
        events.push({
          id: `ar:${r.id}`, title: `${t("calendarEvt.arDue", session.language)} — ${r.sales?.salesNumber ?? r.id.slice(-6)}`,
          start: r.dueDate.toISOString(), allDay: true,
          type: "AR_DUE", color: COLORS.AR_DUE,
          linkedUrl: `/finance/payables`,
          assignee: empName ?? r.sales?.client?.companyNameVi ?? null,
          badge: calcBadge(r.dueDate, now),
        });
      }

      // 7) 연차/휴가 (승인된 것)
      const leaves = await prisma.leaveRecord.findMany({
        where: {
          companyCode: session.companyCode,
          status: "APPROVED",
          startDate: { lte: end },
          endDate: { gte: start },
        },
        select: { id: true, leaveCode: true, startDate: true, endDate: true, employee: { select: { nameVi: true } } },
      });
      for (const lv of leaves) {
        events.push({
          id: `lv:${lv.id}`, title: `🟢 ${lv.employee.nameVi} ${t("calendarEvt.leaveSuffix", session.language)}`,
          start: lv.startDate.toISOString(), end: lv.endDate.toISOString(), allDay: true,
          type: "LEAVE", color: COLORS.LEAVE,
          linkedUrl: `/hr/leave`,
          assignee: lv.employee.nameVi,
        });
      }

      // 8) AS 출동
      const dispatches = await prisma.asDispatch.findMany({
        where: { departedAt: { gte: start, lte: end } },
        select: {
          id: true, departedAt: true,
          asTicket: { select: { ticketNumber: true } },
          dispatchEmployee: { select: { nameVi: true } },
        },
      });
      for (const d of dispatches) {
        if (!d.departedAt) continue;
        events.push({
          id: `dp:${d.id}`, title: `${t("calendarEvt.dispatch", session.language)} — ${d.asTicket.ticketNumber}`,
          start: d.departedAt.toISOString(), allDay: false,
          type: "AS_DISPATCH", color: COLORS.AS_DISPATCH,
          linkedUrl: `/as/dispatches/${d.id}`,
          assignee: d.dispatchEmployee?.nameVi ?? null,
        });
      }

      // 9) 렌탈 오더 (월 첫째 날 표기)
      const orders = await prisma.rentalOrder.findMany({
        where: { companyCode: session.companyCode, billingMonth: { gte: start, lte: end } },
        select: {
          id: true, billingMonth: true, amount: true,
          itContract: { select: { contractNumber: true, client: { select: { companyNameVi: true } } } },
        },
      });
      for (const o of orders) {
        events.push({
          id: `ro:${o.id}`, title: `${t("calendarEvt.rentalOrder", session.language)} — ${o.itContract?.contractNumber ?? o.id.slice(-6)}`,
          start: o.billingMonth.toISOString(), allDay: true,
          type: "RENTAL_ORDER", color: COLORS.RENTAL_ORDER,
          linkedUrl: `/rental/it-contracts`,
          assignee: o.itContract?.client?.companyNameVi ?? null,
        });
      }

      // 10) 직원 생일 (월/일 매칭)
      const employees = await prisma.employee.findMany({
        where: { companyCode: session.companyCode, status: "ACTIVE", birthDate: { not: null } },
        select: { id: true, employeeCode: true, nameVi: true, birthDate: true },
      });
      for (const e of employees) {
        if (!e.birthDate) continue;
        for (let y = start.getUTCFullYear(); y <= end.getUTCFullYear(); y++) {
          const d = new Date(Date.UTC(y, e.birthDate.getUTCMonth(), e.birthDate.getUTCDate()));
          if (d >= start && d <= end) {
            events.push({
              id: `bd:${e.id}:${y}`, title: `🎂 ${e.nameVi} ${t("calendarEvt.birthdaySuffix", session.language)}`,
              start: d.toISOString(), allDay: true,
              type: "BIRTHDAY", color: COLORS.BIRTHDAY,
              assignee: e.nameVi,
            });
          }
        }
      }

      // 11) 공휴일 (VN + KR) — 사용자 언어로 표시 + 다른 언어 부제
      for (const h of getVietnamHolidays(start, end, session.language)) {
        const altName = session.language === "VI" ? h.nameKo : session.language === "EN" ? h.nameVi : h.nameVi;
        events.push({
          id: `hvn:${h.date}`, title: `🇻🇳 ${h.name} (${altName})`,
          start: h.date + "T00:00:00", allDay: true,
          type: "HOLIDAY_VN", color: COLORS.HOLIDAY_VN,
        });
      }
      for (const h of getKoreaHolidays(start, end, session.language)) {
        const altName = session.language === "KO" ? h.nameVi : session.language === "EN" ? h.nameKo : h.nameKo;
        events.push({
          id: `hkr:${h.date}`, title: `🇰🇷 ${h.name} (${altName})`,
          start: h.date + "T00:00:00", allDay: true,
          type: "HOLIDAY_KR", color: COLORS.HOLIDAY_KR,
        });
      }

      // 12) 수동 이벤트
      const customs = await prisma.calendarEvent.findMany({
        where: {
          companyCode: session.companyCode,
          startDate: { lte: end },
          OR: [{ endDate: null, startDate: { gte: start } }, { endDate: { gte: start } }],
        },
        select: {
          id: true, title: true, titleKo: true, startDate: true, endDate: true, allDay: true,
          eventType: true, color: true, linkedUrl: true, eventCode: true,
          assignee: { select: { nameVi: true } },
        },
        take: 500,
      });
      for (const c of customs) {
        events.push({
          id: `cu:${c.id}`,
          title: `📝 ${c.titleKo ?? c.title}`,
          start: c.startDate.toISOString(),
          end: c.endDate ? c.endDate.toISOString() : null,
          allDay: c.allDay,
          type: c.eventType,
          color: c.color ?? COLORS[c.eventType],
          linkedUrl: c.linkedUrl,
          assignee: c.assignee?.nameVi ?? null,
        });
      }

      return ok({ events });
    } catch (err) {
      return serverError(err);
    }
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const title = requireString(p.title, "title");
      const startStr = requireString(p.startDate, "startDate");
      const startDate = new Date(startStr);
      if (Number.isNaN(startDate.getTime())) return badRequest("invalid_input", { field: "startDate" });
      const endStr = trimNonEmpty(p.endDate);
      const endDate = endStr ? new Date(endStr) : null;
      if (endDate && Number.isNaN(endDate.getTime())) return badRequest("invalid_input", { field: "endDate" });
      const eventType = optionalEnum(p.eventType, TYPES) ?? "CUSTOM";
      const allDay = p.allDay !== false;

      // 다국어 자동
      const lang = optionalEnum(p.titleLang, LANGS) ?? "KO";
      const filled = await fillTranslations({
        vi: trimNonEmpty(p.titleVi) ?? null,
        en: trimNonEmpty(p.titleEn) ?? null,
        ko: lang === "KO" ? title : (trimNonEmpty(p.titleKo) ?? null),
        originalLang: lang,
      });

      const created = await withUniqueRetry(
        async () => {
          const eventCode = await generateDatedCode({
            prefix: "EVT",
            lookupLast: async (fp) => {
              const last = await prisma.calendarEvent.findFirst({
                where: { deletedAt: undefined, eventCode: { startsWith: fp } },
                orderBy: { eventCode: "desc" },
                select: { eventCode: true },
              });
              return last?.eventCode ?? null;
            },
          });
          return prisma.calendarEvent.create({
            data: {
              companyCode: session.companyCode,
              eventCode,
              title,
              titleVi: filled.vi,
              titleEn: filled.en,
              titleKo: filled.ko,
              startDate,
              endDate,
              allDay,
              eventType,
              color: trimNonEmpty(p.color),
              linkedModule: trimNonEmpty(p.linkedModule),
              linkedId: trimNonEmpty(p.linkedId),
              linkedUrl: trimNonEmpty(p.linkedUrl),
              assigneeId: trimNonEmpty(p.assigneeId),
              description: trimNonEmpty(p.description),
            },
          });
        },
        { isConflict: isUniqueConstraintError },
      );
      return ok({ event: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
