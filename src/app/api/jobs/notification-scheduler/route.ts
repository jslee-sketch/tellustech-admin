// 매일 06:00 KST — 마감/기한 기반 알림 일괄 발송.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notify/dispatcher";

function dateOnly(d: Date): Date { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
function addDays(d: Date, n: number): Date { return new Date(d.getTime() + n * 86400000); }

async function lookupClientWithPic(clientId: string | null) {
  if (!clientId) return null;
  return prisma.client.findUnique({
    where: { id: clientId },
    select: { companyNameKo: true, companyNameVi: true, salesPicId: true },
  });
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
  const today = dateOnly(new Date());
  const counters: Record<string, number> = {
    receivableD7: 0, receivableD3: 0, receivableOverdue: 0,
    payableD3: 0, contractD30: 0, contractD7: 0,
    licenseExpiry: 0, usageNoResponseD3: 0, accountingClose: 0,
  };

  // ── 미수금 D-7 / D-3 ──
  for (const [days, eventType, key] of [
    [7, "RECEIVABLE_DUE_D7", "receivableD7"],
    [3, "RECEIVABLE_DUE_D3", "receivableD3"],
  ] as const) {
    const target = addDays(today, days);
    const targetEnd = addDays(target, 1);
    const prs = await prisma.payableReceivable.findMany({
      where: { kind: "RECEIVABLE", status: { in: ["OPEN", "PARTIAL"] }, dueDate: { gte: target, lt: targetEnd } },
    });
    for (const pr of prs) {
      const client = await lookupClientWithPic(pr.clientId);
      await dispatchNotification({
        eventType, companyCode: (pr.companyCode ?? "TV") as "TV" | "VR",
        data: {
          assigneeId: client?.salesPicId ?? "",
          clientName: client?.companyNameKo ?? client?.companyNameVi ?? "",
          amount: Number(pr.amount).toLocaleString(),
          dueDate: pr.dueDate ? pr.dueDate.toISOString().slice(0, 10) : "",
        },
        linkedModel: "PayableReceivable", linkedId: pr.id, linkUrl: `/finance/payables/${pr.id}`,
      });
      counters[key]++;
    }
  }

  // 미수금 연체
  const overdue = await prisma.payableReceivable.findMany({
    where: { kind: "RECEIVABLE", status: { in: ["OPEN", "PARTIAL"] }, dueDate: { lt: today } },
  });
  for (const pr of overdue) {
    if (!pr.dueDate) continue;
    const overdueDays = Math.floor((today.getTime() - pr.dueDate.getTime()) / 86400000);
    const client = await lookupClientWithPic(pr.clientId);
    await dispatchNotification({
      eventType: "RECEIVABLE_OVERDUE", companyCode: (pr.companyCode ?? "TV") as "TV" | "VR",
      data: {
        assigneeId: client?.salesPicId ?? "",
        clientName: client?.companyNameKo ?? client?.companyNameVi ?? "",
        amount: Number(pr.amount).toLocaleString(),
        dueDate: pr.dueDate.toISOString().slice(0, 10), overdueDays,
      },
      linkedModel: "PayableReceivable", linkedId: pr.id, linkUrl: `/finance/payables/${pr.id}`,
    });
    counters.receivableOverdue++;
  }

  // 미지급금 D-3
  const payD3 = addDays(today, 3); const payD3End = addDays(payD3, 1);
  const payables = await prisma.payableReceivable.findMany({
    where: { kind: "PAYABLE", status: { in: ["OPEN", "PARTIAL"] }, dueDate: { gte: payD3, lt: payD3End } },
  });
  for (const pr of payables) {
    if (!pr.dueDate) continue;
    const client = await lookupClientWithPic(pr.clientId);
    await dispatchNotification({
      eventType: "PAYABLE_DUE_D3", companyCode: (pr.companyCode ?? "TV") as "TV" | "VR",
      data: {
        vendorName: client?.companyNameKo ?? client?.companyNameVi ?? "",
        amount: Number(pr.amount).toLocaleString(), dueDate: pr.dueDate.toISOString().slice(0, 10),
      },
      linkedModel: "PayableReceivable", linkedId: pr.id, linkUrl: `/finance/payables/${pr.id}`,
    });
    counters.payableD3++;
  }

  // 계약 만료 D-30 / D-7
  for (const [days, eventType, key] of [
    [30, "CONTRACT_EXPIRY_D30", "contractD30"],
    [7, "CONTRACT_EXPIRY_D7", "contractD7"],
  ] as const) {
    const target = addDays(today, days); const targetEnd = addDays(target, 1);
    const contracts = await prisma.itContract.findMany({
      where: { deletedAt: null, endDate: { gte: target, lt: targetEnd } },
    });
    for (const c of contracts) {
      const client = await lookupClientWithPic(c.clientId);
      await dispatchNotification({
        eventType, companyCode: (c.companyCode ?? "TV") as "TV" | "VR",
        data: {
          assigneeId: client?.salesPicId ?? "",
          contractCode: c.contractNumber,
          clientName: client?.companyNameKo ?? client?.companyNameVi ?? "",
          expiryDate: c.endDate.toISOString().slice(0, 10),
        },
        linkedModel: "ItContract", linkedId: c.id, linkUrl: `/rental/it-contracts/${c.id}`,
      });
      counters[key]++;
    }
  }

  // 라이선스 만료 D-30
  const licD30 = addDays(today, 30); const licD30End = addDays(licD30, 1);
  const licenses = await prisma.license.findMany({
    where: { deletedAt: null, expiresAt: { gte: licD30, lt: licD30End } },
  });
  for (const l of licenses) {
    await dispatchNotification({
      eventType: "LICENSE_EXPIRY", companyCode: (l.companyCode ?? "TV") as "TV" | "VR",
      data: { licenseName: l.name, expiryDate: l.expiresAt?.toISOString().slice(0, 10) ?? "" },
      linkedModel: "License", linkedId: l.id, linkUrl: `/master/licenses`,
    });
    counters.licenseExpiry++;
  }

  // 회계마감 리마인더 — 매월 5일
  if (today.getUTCDate() === 5) {
    const prev = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const ym = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
    for (const cc of ["TV", "VR"] as const) {
      await dispatchNotification({
        eventType: "ACCOUNTING_CLOSE_REMINDER", companyCode: cc,
        data: { yearMonth: ym, recommendedDate: today.toISOString().slice(0, 10) },
        linkUrl: `/admin/closings`,
      });
      counters.accountingClose++;
    }
  }

  // 사용량 CFM 미응답 D+3 — 고객에게 통보됐으나 3일 경과 미확인 (CUSTOMER_NOTIFIED 상태로 남아있음)
  const d3ago = addDays(today, -3);
  const noResponse = await prisma.usageConfirmation.findMany({
    where: { status: "CUSTOMER_NOTIFIED", createdAt: { lt: d3ago } },
  });
  for (const u of noResponse) {
    const client = await lookupClientWithPic(u.clientId);
    await dispatchNotification({
      eventType: "USAGE_CFM_NO_RESPONSE_D3", companyCode: (u.companyCode ?? "TV") as "TV" | "VR",
      data: {
        assigneeId: client?.salesPicId ?? "",
        clientName: client?.companyNameKo ?? client?.companyNameVi ?? "",
        billingMonth: u.billingMonth ? new Date(u.billingMonth).toISOString().slice(0, 7) : "",
      },
      linkedModel: "UsageConfirmation", linkedId: u.id, linkUrl: `/admin/usage-confirmations/${u.id}`,
    });
    counters.usageNoResponseD3++;
  }

    return NextResponse.json({ ok: true, counters });
  } catch (err) {
    console.error("[notification-scheduler] failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
