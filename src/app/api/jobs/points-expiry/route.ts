// 매일 07:00 KST — 포인트 만료 처리 + 30일 전 알림.
//
// 처리 흐름:
//  1. expiresAt < today + expiredAt IS NULL + 양수 적립행 → FIFO 소진과 동일 패턴으로
//     "POINT_EXPIRED" reason 의 음수 행 생성. 원본 grant 의 expiredAt 셋팅.
//  2. 30일 후 만료 예정 행을 가진 client → PORTAL_POINTS_EXPIRY_SOON 이벤트 발송.
//
// Bearer CRON_SECRET 으로 보호.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notify/dispatcher";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const todayDateOnly = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    // ── 1) 만료 처리 ──
    const expiredGrants = await prisma.portalPoint.findMany({
      where: {
        amount: { gt: 0 },
        expiredAt: null,
        expiresAt: { lt: todayDateOnly, not: null },
      },
      select: { id: true, clientId: true, amount: true, companyCode: true },
    });

    let expiredRows = 0;
    for (const g of expiredGrants) {
      // 누적 소진량 — 이미 사용된 부분
      const consumedAgg = await prisma.portalPoint.aggregate({
        where: { consumedFromId: g.id },
        _sum: { amount: true },
      });
      const alreadyConsumed = Math.abs(Number(consumedAgg._sum.amount ?? 0));
      const remaining = g.amount - alreadyConsumed;
      if (remaining > 0) {
        await prisma.portalPoint.create({
          data: {
            clientId: g.clientId,
            amount: -remaining,
            reason: "POINT_EXPIRED",
            consumedFromId: g.id,
            companyCode: g.companyCode,
            reasonDetail: `Auto-expired ${todayDateOnly.toISOString().slice(0, 10)}`,
          },
        });
        expiredRows++;
      }
      await prisma.portalPoint.update({
        where: { id: g.id },
        data: { expiredAt: new Date() },
      });
    }

    // ── 2) 30일 전 알림 ──
    const cutoff30 = new Date(todayDateOnly); cutoff30.setUTCDate(cutoff30.getUTCDate() + 30);
    const expiringSoon = await prisma.portalPoint.findMany({
      where: {
        amount: { gt: 0 },
        expiredAt: null,
        expiresAt: { gte: todayDateOnly, lte: cutoff30, not: null },
      },
      select: { id: true, clientId: true, amount: true, expiresAt: true, companyCode: true },
    });

    // 거래처별 합산 (FIFO 소비 차감)
    const byClient = new Map<string, { companyCode: string; totalExpiring: number; firstExpireAt: Date | null }>();
    for (const g of expiringSoon) {
      const consumedAgg = await prisma.portalPoint.aggregate({
        where: { consumedFromId: g.id },
        _sum: { amount: true },
      });
      const alreadyConsumed = Math.abs(Number(consumedAgg._sum.amount ?? 0));
      const remaining = g.amount - alreadyConsumed;
      if (remaining <= 0) continue;
      const cur = byClient.get(g.clientId) ?? { companyCode: g.companyCode, totalExpiring: 0, firstExpireAt: g.expiresAt };
      cur.totalExpiring += remaining;
      if (!cur.firstExpireAt || (g.expiresAt && g.expiresAt < cur.firstExpireAt)) cur.firstExpireAt = g.expiresAt;
      byClient.set(g.clientId, cur);
    }

    let notified = 0;
    for (const [clientId, info] of byClient) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { companyNameKo: true, companyNameVi: true, salesPicId: true },
      });
      await dispatchNotification({
        eventType: "PORTAL_POINTS_EXPIRY_SOON",
        companyCode: info.companyCode as "TV" | "VR",
        data: {
          assigneeId: client?.salesPicId ?? "",
          clientName: client?.companyNameKo ?? client?.companyNameVi ?? "",
          totalExpiring: info.totalExpiring.toLocaleString(),
          firstExpireAt: info.firstExpireAt?.toISOString().slice(0, 10) ?? "",
        },
        linkedModel: "Client",
        linkedId: clientId,
        linkUrl: `/admin/portal-points`,
      });
      notified++;
    }

    return NextResponse.json({
      ok: true,
      expiredGrants: expiredGrants.length,
      expiredRows,
      clientsNotified: notified,
    });
  } catch (err) {
    console.error("[points-expiry] failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
