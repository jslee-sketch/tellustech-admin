// 통합 알림 디스패처 — 이벤트 → Rule 매칭 → 대상자 결정 → 채널별 발송 + 이력 저장.
// 실패해도 호출 측 트랜잭션은 영향 없음 (try/catch + 로그만).
import { prisma } from "@/lib/prisma";
import { sendEmail, wrapBrandHtml } from "./email-sender";
import { sendZaloMessage } from "./zalo-sender";
import { sendChatMessage } from "./chat-sender";

export type NotifyEventType =
  | "AS_TICKET_ASSIGNED" | "AS_DISPATCH_COMPLETED"
  | "SALES_FINANCE_CFM_REQUEST" | "SALES_FINANCE_CFM_DONE"
  | "EXPENSE_REIMBURSE_REQUEST" | "EXPENSE_REIMBURSE_APPROVED"
  | "SCHEDULE_ASSIGNED" | "WEEKLY_MEETING_REMINDER"
  | "RECEIVABLE_DUE_D7" | "RECEIVABLE_DUE_D3" | "RECEIVABLE_OVERDUE"
  | "PAYABLE_DUE_D3"
  | "CONTRACT_EXPIRY_D30" | "CONTRACT_EXPIRY_D7"
  | "LICENSE_EXPIRY" | "ACCOUNTING_CLOSE_REMINDER" | "SNMP_COLLECT_DAY"
  | "PORTAL_AS_REQUEST" | "PORTAL_SUPPLY_REQUEST" | "PORTAL_QUOTE_REQUEST"
  | "PORTAL_FEEDBACK" | "USAGE_CFM_COMPLETED" | "USAGE_CFM_NO_RESPONSE_D3"
  | "PORTAL_REFERRAL"
  | "YIELD_FRAUD_SUSPECT_EVENT" | "CASH_SHORTAGE_ALERT_EVENT"
  | "AGENT_DISCONNECTED" | "TOKEN_EXPIRY_SOON"
  | "SYSTEM_DEPLOY" | "SYSTEM_MAINTENANCE";

export type NotifyPayload = {
  eventType: NotifyEventType;
  companyCode: "TV" | "VR";
  data: Record<string, unknown>;  // 템플릿 치환 변수 ({clientName} 등)
  linkedModel?: string;
  linkedId?: string;
  linkUrl?: string;
};

// NotificationType (legacy) 매핑 — 기존 enum 과 호환
function mapToLegacyType(eventType: string): "OTHER" | "AS_NEW" | "RECEIVABLE_OVERDUE" | "CONTRACT_EXPIRING" | "LICENSE_EXPIRING" | "USAGE_CONFIRM_REQUEST" | "YIELD_FRAUD_SUSPECT" | "CASH_SHORTAGE_ALERT" | "BUDGET_OVERRUN" | "SCHEDULE_DUE" {
  if (eventType === "AS_TICKET_ASSIGNED" || eventType === "PORTAL_AS_REQUEST") return "AS_NEW";
  if (eventType === "RECEIVABLE_OVERDUE") return "RECEIVABLE_OVERDUE";
  if (eventType.startsWith("CONTRACT_EXPIRY")) return "CONTRACT_EXPIRING";
  if (eventType === "LICENSE_EXPIRY") return "LICENSE_EXPIRING";
  if (eventType === "USAGE_CFM_COMPLETED" || eventType === "USAGE_CFM_NO_RESPONSE_D3") return "USAGE_CONFIRM_REQUEST";
  if (eventType === "YIELD_FRAUD_SUSPECT_EVENT") return "YIELD_FRAUD_SUSPECT";
  if (eventType === "CASH_SHORTAGE_ALERT_EVENT") return "CASH_SHORTAGE_ALERT";
  if (eventType === "SCHEDULE_ASSIGNED") return "SCHEDULE_DUE";
  return "OTHER";
}

function replaceVars(template: string, data: Record<string, unknown>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const v = value === null || value === undefined ? "" : String(value);
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), v);
  }
  return result;
}

async function resolveRecipients(rule: {
  targetType: string;
  targetEmployeeId: string | null;
  targetDepartmentId: string | null;
  targetRoleId: string | null;
  companyCode: string;
}, payload: NotifyPayload): Promise<string[]> {
  const data = payload.data as Record<string, string | undefined>;
  switch (rule.targetType) {
    case "INDIVIDUAL":
      return rule.targetEmployeeId ? [rule.targetEmployeeId] : [];
    case "TEAM": {
      const emps = await prisma.employee.findMany({
        where: { departmentId: rule.targetDepartmentId ?? undefined, status: "ACTIVE" },
        select: { id: true },
      });
      return emps.map((e) => e.id);
    }
    case "ROLE": {
      // role 은 User 에 있음 — User → employeeId
      const users = await prisma.user.findMany({
        where: { role: rule.targetRoleId as never, isActive: true, employeeId: { not: null } },
        select: { employeeId: true },
      });
      return users.map((u) => u.employeeId!).filter(Boolean);
    }
    case "ALL": {
      const emps = await prisma.employee.findMany({
        where: { companyCode: payload.companyCode as never, status: "ACTIVE" },
        select: { id: true },
      });
      return emps.map((e) => e.id);
    }
    case "ASSIGNEE":
      return data.assigneeId ? [data.assigneeId] : [];
    case "ASSIGNEE_MANAGER": {
      if (!data.assigneeId) return [];
      const emp = await prisma.employee.findUnique({
        where: { id: data.assigneeId },
        select: { departmentId: true },
      });
      if (!emp?.departmentId) return [];
      // 같은 부서의 ADMIN/MANAGER role User 의 employeeId
      const users = await prisma.user.findMany({
        where: {
          role: { in: ["ADMIN", "MANAGER"] },
          isActive: true,
          employee: { departmentId: emp.departmentId },
        },
        select: { employeeId: true },
      });
      return users.map((u) => u.employeeId!).filter(Boolean);
    }
    case "CLIENT_PIC":
      return data.salesEmployeeId ? [data.salesEmployeeId] : [];
    default:
      return [];
  }
}

async function logDelivery(args: {
  notificationId: string;
  recipientEmployeeId: string;
  channel: "EMAIL" | "ZALO" | "CHAT";
  recipientAddress: string;
  ok: boolean;
  error?: string;
  companyCode: "TV" | "VR";
}): Promise<void> {
  await prisma.notificationDelivery.create({
    data: {
      notificationId: args.notificationId,
      channel: args.channel,
      recipientId: args.recipientEmployeeId,
      recipientAddress: args.recipientAddress,
      status: args.ok ? "SENT" : "FAILED",
      sentAt: args.ok ? new Date() : null,
      failedAt: args.ok ? null : new Date(),
      errorMessage: args.error ?? null,
      companyCode: args.companyCode as never,
    },
  });
}

export async function dispatchNotification(payload: NotifyPayload): Promise<void> {
  try {
    const rules = await prisma.notificationRule.findMany({
      where: {
        eventType: payload.eventType as never,
        companyCode: payload.companyCode as never,
        isActive: true,
      },
    });
    if (rules.length === 0) return;

    for (const rule of rules) {
      const recipients = await resolveRecipients(rule, payload);
      if (recipients.length === 0) continue;

      // 템플릿 치환
      const koBody = replaceVars(rule.templateKo, payload.data);
      const viBody = replaceVars(rule.templateVi, payload.data);
      const enBody = replaceVars(rule.templateEn, payload.data);
      const koTitle = koBody.split("\n")[0];
      const viTitle = viBody.split("\n")[0];
      const enTitle = enBody.split("\n")[0];

      // 수신자별 처리
      for (const empId of recipients) {
        const employee = await prisma.employee.findUnique({
          where: { id: empId },
          include: { user: { select: { id: true, preferredLang: true } } },
        });
        if (!employee || employee.status !== "ACTIVE") continue;

        // Notification 생성 (벨 알림 — User 단위)
        const userId = employee.user?.id;
        if (!userId) continue;

        const notification = await prisma.notification.create({
          data: {
            userId,
            type: mapToLegacyType(payload.eventType) as never,
            eventType: payload.eventType as never,
            titleKo: koTitle, titleVi: viTitle, titleEn: enTitle,
            bodyKo: koBody, bodyVi: viBody, bodyEn: enBody,
            linkUrl: payload.linkUrl ?? null,
            linkedModel: payload.linkedModel ?? null,
            linkedId: payload.linkedId ?? null,
            companyCode: payload.companyCode as never,
          },
        });

        // 채널별 발송 (직원 토글 + 룰 채널 + 주소 모두 충족)
        // EMAIL
        if (rule.channelEmail && employee.notifyEmail && employee.personalEmail) {
          const r = await sendEmail({
            to: employee.personalEmail,
            subject: koTitle, // 회사 공통은 KO 제목 사용
            html: wrapBrandHtml({
              title: koTitle,
              bodyHtml: koBody.replace(/\n/g, "<br/>"),
              linkUrl: payload.linkUrl,
              linkLabel: "View in ERP",
            }),
            text: koBody,
          });
          await logDelivery({
            notificationId: notification.id,
            recipientEmployeeId: empId,
            channel: "EMAIL",
            recipientAddress: employee.personalEmail,
            ok: r.ok, error: r.error,
            companyCode: payload.companyCode,
          });
        }
        // ZALO
        if (rule.channelZalo && employee.notifyZalo && employee.zaloId) {
          const r = await sendZaloMessage({ zaloId: employee.zaloId, text: koBody });
          await logDelivery({
            notificationId: notification.id,
            recipientEmployeeId: empId,
            channel: "ZALO",
            recipientAddress: employee.zaloId,
            ok: r.ok, error: r.error,
            companyCode: payload.companyCode,
          });
        }
        // CHAT
        if (rule.channelChat && employee.notifyChat) {
          const r = await sendChatMessage({
            recipientEmployeeId: empId,
            contentKo: koBody, contentVi: viBody, contentEn: enBody,
            companyCode: payload.companyCode,
          });
          await logDelivery({
            notificationId: notification.id,
            recipientEmployeeId: empId,
            channel: "CHAT",
            recipientAddress: empId,
            ok: r.ok, error: r.error,
            companyCode: payload.companyCode,
          });
        }
      }
    }
  } catch (err) {
    console.error("[notify] dispatchNotification failed:", err);
  }
}
