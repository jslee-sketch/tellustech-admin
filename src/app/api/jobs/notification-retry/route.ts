// 매시간 — FAILED 상태 + retryCount<3 인 NotificationDelivery 재시도.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, wrapBrandHtml } from "@/lib/notify/email-sender";
import { sendZaloMessage } from "@/lib/notify/zalo-sender";
import { sendChatMessage } from "@/lib/notify/chat-sender";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
  const failed = await prisma.notificationDelivery.findMany({
    where: { status: "FAILED", retryCount: { lt: 3 } },
    include: { notification: true },
    take: 100,
  });

  let retried = 0, succeeded = 0;
  for (const d of failed) {
    const n = d.notification;
    const body = n.bodyKo ?? n.titleKo ?? "(no body)";
    const subject = n.titleKo ?? "ERP Notification";

    let result: { ok: boolean; error?: string } = { ok: false };
    if (d.channel === "EMAIL") {
      result = await sendEmail({
        to: d.recipientAddress, subject,
        html: wrapBrandHtml({ title: subject, bodyHtml: body.replace(/\n/g, "<br/>"), linkUrl: n.linkUrl ?? undefined, linkLabel: "View in ERP" }),
        text: body,
      });
    } else if (d.channel === "ZALO") {
      result = await sendZaloMessage({ zaloId: d.recipientAddress, text: body });
    } else if (d.channel === "CHAT") {
      result = await sendChatMessage({
        recipientEmployeeId: d.recipientId,
        contentKo: n.bodyKo ?? "", contentVi: n.bodyVi ?? "", contentEn: n.bodyEn ?? "",
        companyCode: (d.companyCode as "TV" | "VR"),
      });
    }

    await prisma.notificationDelivery.update({
      where: { id: d.id },
      data: {
        retryCount: d.retryCount + 1,
        status: result.ok ? "SENT" : "FAILED",
        sentAt: result.ok ? new Date() : null,
        errorMessage: result.error ?? null,
      },
    });
    retried++;
    if (result.ok) succeeded++;
  }

    return NextResponse.json({ ok: true, retried, succeeded });
  } catch (err) {
    console.error("[notification-retry] failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
