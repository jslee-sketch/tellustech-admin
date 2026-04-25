import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeReceivableBlocking } from "@/lib/finance-recompute";
import { createTranslatedNotification } from "@/lib/notifications";
import { runWithRequestContext } from "@/lib/request-context";
import type { CompanyCode, NotificationType } from "@/generated/prisma/client";

// 일일 알림 cron — Railway cron 또는 외부 호출자가 POST 한다.
// Bearer CRON_SECRET 일치해야 동작 (없으면 401).
//
// 처리 항목:
//  1) IT계약 만기 30일 이내 → CONTRACT_EXPIRING (영업담당 / ADMIN)
//  2) 라이선스 만기 alertBeforeDays 이내 → LICENSE_EXPIRING (소유자 / ADMIN)
//  3) 교정 차기일자(SalesItem.nextDueAt) 30일 이내, alertedAt null → CALIBRATION_DUE (영업담당)
//  4) RECEIVABLE 연체 (kind=RECEIVABLE, status in OPEN/PARTIAL, dueDate < now) → RECEIVABLE_OVERDUE
//  5) 재고부족 (Item.reorderPoint 설정 + 합계 < 임계치) → STOCK_LOW (창고별 ADMIN)
//  6) recomputeReceivableBlocking 호출 → BLOCKED 자동 갱신
//
// 알림 중복 방지: 7일 동안 같은 (userId, type, linkUrl) 이미 있으면 skip.

const COOLDOWN_DAYS = 7;

async function alreadySent(userId: string, type: NotificationType, linkUrl: string): Promise<boolean> {
  const since = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const found = await prisma.notification.findFirst({
    where: { userId, type, linkUrl, createdAt: { gte: since } },
    select: { id: true },
  });
  return !!found;
}

async function adminUserIds(companyCode: CompanyCode | null): Promise<string[]> {
  const where = companyCode
    ? { role: "ADMIN" as const, isActive: true, allowedCompanies: { has: companyCode } }
    : { role: "ADMIN" as const, isActive: true };
  const admins = await prisma.user.findMany({ where, select: { id: true } });
  return admins.map((u) => u.id);
}

async function sendOnce(params: {
  userId: string;
  companyCode: CompanyCode | null;
  type: NotificationType;
  titleKo: string;
  bodyKo: string;
  linkUrl: string;
}): Promise<boolean> {
  if (await alreadySent(params.userId, params.type, params.linkUrl)) return false;
  await createTranslatedNotification({
    userId: params.userId,
    companyCode: params.companyCode,
    type: params.type,
    originalLang: "KO",
    title: params.titleKo,
    body: params.bodyKo,
    linkUrl: params.linkUrl,
  });
  return true;
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Audit 컨텍스트 — cron 은 시스템 사용자로 기록 (없으면 audit 자체 skip).
  const sysUser = await prisma.user.findFirst({
    where: { username: { in: ["system", "cron", "admin"] } },
    select: { id: true, username: true, allowedCompanies: true },
  });

  const runJob = async () => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const counts: Record<string, number> = {
      contract_expiring: 0,
      license_expiring: 0,
      calibration_due: 0,
      receivable_overdue: 0,
      stock_low: 0,
    };

    // ── 1) IT계약 만기 30일 이내 ──────────────────────────────
    const expiringContracts = await prisma.itContract.findMany({
      where: {
        status: "ACTIVE",
        endDate: { gte: now, lte: in30 },
      },
      select: { id: true, contractNumber: true, endDate: true, client: { select: { companyNameVi: true } } },
    });
    for (const c of expiringContracts) {
      const company: CompanyCode = c.contractNumber.startsWith("TLS-") ? "TV" : "VR";
      const admins = await adminUserIds(company);
      const days = Math.ceil((c.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const link = `/rental/it-contracts/${c.id}`;
      for (const uid of admins) {
        if (await sendOnce({
          userId: uid,
          companyCode: company,
          type: "CONTRACT_EXPIRING",
          titleKo: `IT계약 만기 임박 — ${c.contractNumber}`,
          bodyKo: `${c.client.companyNameVi} · ${days}일 후 만료 (${c.endDate.toISOString().slice(0, 10)})`,
          linkUrl: link,
        })) counts.contract_expiring++;
      }
    }

    // ── 2) 라이선스 만기 alertBeforeDays 이내 (기본 30일) ─────
    const expiringLicenses = await prisma.license.findMany({
      where: { expiresAt: { gte: now, lte: in30 } },
      select: {
        id: true, licenseCode: true, name: true, expiresAt: true, alertBeforeDays: true, companyCode: true,
        owner: { select: { user: { select: { id: true } } } },
      },
    });
    for (const l of expiringLicenses) {
      const threshold = l.alertBeforeDays ?? 30;
      const daysLeft = Math.ceil((l.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      if (daysLeft > threshold) continue;
      const recipients = new Set<string>();
      if (l.owner?.user?.id) recipients.add(l.owner.user.id);
      for (const uid of await adminUserIds(l.companyCode)) recipients.add(uid);
      const link = `/master/licenses`;
      for (const uid of recipients) {
        if (await sendOnce({
          userId: uid,
          companyCode: l.companyCode,
          type: "LICENSE_EXPIRING",
          titleKo: `라이선스 만기 임박 — ${l.name} (${l.licenseCode})`,
          bodyKo: `${daysLeft}일 후 만료 (${l.expiresAt.toISOString().slice(0, 10)})`,
          linkUrl: link,
        })) counts.license_expiring++;
      }
    }

    // ── 3) 교정 차기일자 30일 이내 (alertedAt null) ──────────
    const calibrationItems = await prisma.salesItem.findMany({
      where: {
        nextDueAt: { not: null, gte: now, lte: in30 },
        alertedAt: null,
      },
      select: {
        id: true, certNumber: true, nextDueAt: true,
        sales: { select: { id: true, salesEmployeeId: true, client: { select: { companyNameVi: true } } } },
      },
      take: 500,
    });
    for (const s of calibrationItems) {
      if (!s.nextDueAt) continue;
      const days = Math.ceil((s.nextDueAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      // 영업담당 user 찾기
      const recipients = new Set<string>();
      if (s.sales.salesEmployeeId) {
        const emp = await prisma.employee.findUnique({
          where: { id: s.sales.salesEmployeeId },
          select: { user: { select: { id: true } } },
        });
        if (emp?.user?.id) recipients.add(emp.user.id);
      }
      const link = `/sales/${s.sales.id}`;
      for (const uid of recipients) {
        if (await sendOnce({
          userId: uid,
          companyCode: null,
          type: "CALIBRATION_DUE",
          titleKo: `교정 차기일 임박 — ${s.certNumber ?? "N/A"}`,
          bodyKo: `${s.sales.client?.companyNameVi ?? ""} · ${days}일 후 (${s.nextDueAt.toISOString().slice(0, 10)})`,
          linkUrl: link,
        })) counts.calibration_due++;
      }
      // alertedAt 표기 — 다시 알리지 않게 (필요 시 매뉴얼 reset)
      await prisma.salesItem.update({ where: { id: s.id }, data: { alertedAt: now } });
    }

    // ── 4) 미수금 연체 ────────────────────────────────────────
    const overdueReceivables = await prisma.payableReceivable.findMany({
      where: {
        kind: "RECEIVABLE",
        status: { in: ["OPEN", "PARTIAL"] },
        dueDate: { lt: now },
      },
      select: {
        id: true, dueDate: true, amount: true, paidAmount: true,
        sales: { select: { salesNumber: true, salesEmployeeId: true, client: { select: { companyNameVi: true } } } },
        companyCode: true,
      },
      take: 500,
    });
    for (const pr of overdueReceivables) {
      if (!pr.dueDate) continue;
      const days = Math.floor((now.getTime() - pr.dueDate.getTime()) / (24 * 60 * 60 * 1000));
      const recipients = new Set<string>();
      if (pr.sales?.salesEmployeeId) {
        const emp = await prisma.employee.findUnique({
          where: { id: pr.sales.salesEmployeeId },
          select: { user: { select: { id: true } } },
        });
        if (emp?.user?.id) recipients.add(emp.user.id);
      }
      for (const uid of await adminUserIds(pr.companyCode ?? null)) recipients.add(uid);
      const link = `/finance/payables`;
      const remaining = (Number(pr.amount) - Number(pr.paidAmount)).toFixed(0);
      for (const uid of recipients) {
        if (await sendOnce({
          userId: uid,
          companyCode: pr.companyCode ?? null,
          type: "RECEIVABLE_OVERDUE",
          titleKo: `미수금 연체 ${days}일 — ${pr.sales?.salesNumber ?? pr.id.slice(-6)}`,
          bodyKo: `${pr.sales?.client?.companyNameVi ?? ""} · 잔액 ${remaining} VND`,
          linkUrl: link,
        })) counts.receivable_overdue++;
      }
    }

    // ── 5) 재고부족 (Item.reorderPoint 설정된 것만) ─────────────
    const itemsWithThreshold = await prisma.item.findMany({
      where: { reorderPoint: { not: null } },
      select: { id: true, itemCode: true, name: true, reorderPoint: true },
    });
    for (const it of itemsWithThreshold) {
      if (it.reorderPoint == null) continue;
      // 단순화: InventoryItem(NORMAL) 개수로 현 재고 계산. S/N 없는 소모품은 스킵.
      const count = await prisma.inventoryItem.count({
        where: { itemId: it.id, status: "NORMAL" },
      });
      if (count >= it.reorderPoint) continue;
      // 양사 ADMIN 모두 통보 (재고는 마스터 공유)
      const admins = await adminUserIds(null);
      const link = `/inventory/stock?item=${it.id}`;
      for (const uid of admins) {
        if (await sendOnce({
          userId: uid,
          companyCode: null,
          type: "STOCK_LOW",
          titleKo: `재고부족 — ${it.name} (${it.itemCode})`,
          bodyKo: `재고 ${count} / 임계 ${it.reorderPoint}`,
          linkUrl: link,
        })) counts.stock_low++;
      }
    }

    // ── 6) 미수금 차단 자동 재평가 ─────────────────────────────
    const recompute = await recomputeReceivableBlocking();

    return NextResponse.json({
      ok: true,
      counts,
      recompute_blocking: {
        scanned: recompute.scanned,
        affected_clients: recompute.affectedClients,
        updated: recompute.updated.length,
      },
      ts: now.toISOString(),
    });
  };

  if (sysUser) {
    return runWithRequestContext(
      {
        userId: sysUser.id,
        username: sysUser.username,
        role: "ADMIN",
        companyCode: sysUser.allowedCompanies[0] ?? "TV",
        empCode: null,
        language: "KO",
      },
      runJob,
    );
  }
  return runJob();
}

// 헬스체크
export async function GET() {
  return NextResponse.json({ ok: true, route: "_jobs/expiring-alerts" });
}
