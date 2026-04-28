// TELLUSTECH ERP 홈 대시보드.
// KPI 카드 + 모듈 네비 (버튼형) — 모듈별 고유 색상 + 섹션별 강조 테두리.

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import LogoutButton from "./logout-button";
import { DashboardCalendarHero } from "./dashboard-calendar-hero";

export const dynamic = "force-dynamic";

type AccentKey = "primary" | "accent" | "success" | "warn" | "danger" | "purple";
type NavItem = { href: string; label: string; icon?: string };

const ACCENTS: Record<AccentKey, { border: string; bar: string; text: string; bg: string; hover: string }> = {
  primary: {
    border: "border-[color:var(--tts-primary)]",
    bar: "bg-[color:var(--tts-primary)]",
    text: "text-[color:var(--tts-primary)]",
    bg: "bg-[color:var(--tts-primary-dim)]",
    hover: "hover:border-[color:var(--tts-primary)] hover:bg-[color:var(--tts-primary-dim)]",
  },
  accent: {
    border: "border-[color:var(--tts-accent)]",
    bar: "bg-[color:var(--tts-accent)]",
    text: "text-[color:var(--tts-accent)]",
    bg: "bg-[color:var(--tts-accent-dim)]",
    hover: "hover:border-[color:var(--tts-accent)] hover:bg-[color:var(--tts-accent-dim)]",
  },
  success: {
    border: "border-[color:var(--tts-success)]",
    bar: "bg-[color:var(--tts-success)]",
    text: "text-[color:var(--tts-success)]",
    bg: "bg-[color:var(--tts-success-dim)]",
    hover: "hover:border-[color:var(--tts-success)] hover:bg-[color:var(--tts-success-dim)]",
  },
  warn: {
    border: "border-[color:var(--tts-warn)]",
    bar: "bg-[color:var(--tts-warn)]",
    text: "text-[color:var(--tts-warn)]",
    bg: "bg-[color:var(--tts-warn-dim)]",
    hover: "hover:border-[color:var(--tts-warn)] hover:bg-[color:var(--tts-warn-dim)]",
  },
  danger: {
    border: "border-[color:var(--tts-danger)]",
    bar: "bg-[color:var(--tts-danger)]",
    text: "text-[color:var(--tts-danger)]",
    bg: "bg-[color:var(--tts-danger-dim)]",
    hover: "hover:border-[color:var(--tts-danger)] hover:bg-[color:var(--tts-danger-dim)]",
  },
  purple: {
    border: "border-[color:var(--tts-purple)]",
    bar: "bg-[color:var(--tts-purple)]",
    text: "text-[color:var(--tts-purple)]",
    bg: "bg-[color:var(--tts-purple-dim)]",
    hover: "hover:border-[color:var(--tts-purple)] hover:bg-[color:var(--tts-purple-dim)]",
  },
};

export default async function Home() {
  const session = await getSession();
  const L = session.language;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [salesRows, purchaseRows, openReceivable, openPayable, asPending, expiringContracts, certExpiring] = await Promise.all([
    prisma.sales.findMany({
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
      select: { totalAmount: true, fxRate: true },
    }),
    prisma.purchase.findMany({
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
      select: { totalAmount: true, fxRate: true },
    }),
    prisma.payableReceivable.aggregate({
      where: { kind: "RECEIVABLE", status: { in: ["OPEN", "PARTIAL"] } },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    }),
    prisma.payableReceivable.aggregate({
      where: { kind: "PAYABLE", status: { in: ["OPEN", "PARTIAL"] } },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    }),
    prisma.asTicket.count({ where: { status: { in: ["RECEIVED", "IN_PROGRESS", "DISPATCHED"] } } }),
    prisma.itContract.count({
      where: { status: "ACTIVE", endDate: { gte: now, lt: thirtyDaysLater } },
    }),
    // 성적서 만료 임박 (30일 이내 + 이미 만료) — 매출·매입 라인 각각
    prisma.salesItem.count({
      where: { nextDueAt: { lte: thirtyDaysLater } },
    }).then(async (s) => s + (await prisma.purchaseItem.count({ where: { nextDueAt: { lte: thirtyDaysLater } } }))),
  ]);

  // 월 매출/매입은 fxRate 적용해 VND 환산값 집계
  const monthSalesVnd = salesRows.reduce((s, r) => s + Number(r.totalAmount) * Number(r.fxRate), 0);
  const monthPurchaseVnd = purchaseRows.reduce((s, r) => s + Number(r.totalAmount) * Number(r.fxRate), 0);
  const salesCount = salesRows.length;
  const purchaseCount = purchaseRows.length;

  // PayableReceivable.amount 는 이미 VND 본위로 저장되므로 단순 합산
  const outstanding = (Number(openReceivable._sum.amount ?? 0) - Number(openReceivable._sum.paidAmount ?? 0)).toFixed(0);
  const payable = (Number(openPayable._sum.amount ?? 0) - Number(openPayable._sum.paidAmount ?? 0)).toFixed(0);

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="text-[12px] font-black tracking-[0.22em] text-[color:var(--tts-accent)]" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>TELLUSTECH · ERP</div>
            <h1 className="mt-2 text-[30px] font-black leading-none tracking-tight text-[color:var(--tts-text)]">
              {t("dash.title", L)}
              <span className="ml-3 rounded-lg bg-[color:var(--tts-primary)] px-3 py-1 align-middle text-[14px] font-extrabold text-white">{session.companyCode}</span>
              <a
                href="/login?portal=1"
                target="_blank"
                rel="noopener"
                title="고객 포탈 로그인 / Đăng nhập cổng khách hàng"
                className="ml-2 inline-block rounded-lg border border-[color:var(--tts-accent)] bg-[color:var(--tts-accent-dim)] px-3 py-1 align-middle text-[14px] font-extrabold text-[color:var(--tts-accent)] hover:bg-[color:var(--tts-accent)] hover:text-white"
              >
                🛒 고객포탈 / Cổng KH
              </a>
              <span className="ml-3 align-middle text-[16px] font-medium text-[color:var(--tts-sub)]">{session.username}</span>
            </h1>
          </div>
          <LogoutButton />
        </div>

        {/* 캘린더 히어로 — 좌: 오늘 캘린더 미니 카드, 우: 다가오는 일정 자동 캐러셀 */}
        <DashboardCalendarHero lang={L} />

        {/* KPI */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label={t("dash.kpi.salesMonth", L)}    value={`${new Intl.NumberFormat("vi-VN").format(monthSalesVnd)} ₫`}    sub={`${salesCount} ${t("dash.kpi.cases", L)}`} accent="primary" />
          <KpiCard label={t("dash.kpi.purchaseMonth", L)} value={`${new Intl.NumberFormat("vi-VN").format(monthPurchaseVnd)} ₫`} sub={`${purchaseCount} ${t("dash.kpi.cases", L)}`} accent="accent" />
          <KpiCard label={t("dash.kpi.outstanding", L)}   value={`${new Intl.NumberFormat("vi-VN").format(Number(outstanding))} ₫`} sub={`${openReceivable._count} ${t("dash.kpi.cases", L)}`} accent="danger" />
          <KpiCard label={t("dash.kpi.payable", L)}       value={`${new Intl.NumberFormat("vi-VN").format(Number(payable))} ₫`}    sub={`${openPayable._count} ${t("dash.kpi.cases", L)}`} accent="warn" />
          <KpiCard label={t("dash.kpi.asPending", L)}     value={String(asPending)} sub="" accent="warn" />
          <KpiCard label={t("dash.kpi.expiring", L)}      value={String(expiringContracts + certExpiring)} sub={`${t("dash.kpi.expiringSub", L)} · ${expiringContracts}/${certExpiring}`} accent="danger" />
        </div>

        {/* 모듈 네비 */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <NavCard title={t("dash.card.master", L)} subtitle="Master Data" accent="primary" items={[
            { href: "/master/departments", label: t("nav.departments", L), icon: "🏢" },
            { href: "/master/employees",   label: t("nav.employees", L),   icon: "👤" },
            { href: "/master/clients",     label: t("nav.clients", L),     icon: "🤝" },
            { href: "/master/items",       label: t("nav.items", L),       icon: "📦" },
            { href: "/admin/item-compatibility", label: t("nav.itemCompat", L), icon: "🔗" },
            { href: "/master/warehouses",  label: t("nav.warehouses", L),  icon: "🏬" },
            { href: "/master/projects",    label: t("nav.projects", L),    icon: "🗂️" },
            { href: "/master/schedules",   label: t("nav.schedules", L),   icon: "🗓️" },
            { href: "/master/licenses",    label: t("nav.licenses", L),    icon: "📜" },
          ]} />
          <NavCard title={t("dash.card.contracts", L)} subtitle="Contracts" accent="accent" items={[
            { href: "/rental/it-contracts", label: t("nav.itContract", L), icon: "🖨️" },
            { href: "/rental/tm-rentals",   label: t("nav.tmRental", L),   icon: "🔧" },
            { href: "/admin/snmp", label: t("nav.adminSnmp", L), icon: "📡" },
            { href: "/admin/usage-confirmations", label: t("nav.adminUsageConfirm", L), icon: "📋" },
            { href: "/admin/yield-analysis", label: t("nav.adminYield", L), icon: "🧪" },
          ]} />
          <NavCard title={t("dash.card.salesPurchase", L)} subtitle="Sales / Purchase" accent="purple" items={[
            { href: "/sales",     label: t("nav.salesOrder", L), icon: "💵" },
            { href: "/purchases", label: t("nav.purchase", L),   icon: "🛒" },
            { href: "/admin/quotes", label: t("nav.adminQuotes", L), icon: "💬" },
          ]} />
          <NavCard title={t("dash.card.service", L)} subtitle="Service" accent="warn" items={[
            { href: "/as/tickets",     label: t("nav.asTickets", L), icon: "🛠️" },
            { href: "/as/dispatches",  label: t("nav.dispatches", L), icon: "🚚" },
          ]} />
          <NavCard title={t("dash.card.inventory", L)} subtitle="Inventory" accent="success" items={[
            { href: "/inventory/stock",        label: t("nav.stock", L),  icon: "📊" },
            { href: "/inventory/transactions", label: t("nav.invTxn", L), icon: "🔄" },
            { href: "/inventory/scan",         label: t("nav.qrScan", L), icon: "📷" },
            { href: "/inventory/labels",       label: t("nav.qrLabel", L), icon: "🏷️" },
            { href: "/inventory/depreciation", label: t("nav.depreciation", L), icon: "📉" },
          ]} />
          <NavCard title={t("dash.card.hr", L)} subtitle="Human Resources" accent="primary" items={[
            { href: "/hr/onboarding",  label: t("nav.onboarding", L),  icon: "📝" },
            { href: "/hr/offboarding", label: t("nav.offboarding", L), icon: "🏷️" },
            { href: "/hr/incidents",   label: t("nav.incidents", L),   icon: "⚡" },
            { href: "/hr/evaluations", label: t("nav.evaluations", L), icon: "⭐" },
            { href: "/hr/leave",       label: t("nav.leave", L),       icon: "🏖️" },
          ]} />
          <NavCard title={t("dash.card.finance", L)} subtitle="Finance" accent="danger" items={[
            { href: "/finance/payables", label: t("nav.payables", L), icon: "💰" },
            { href: "/finance/expenses", label: t("nav.expenses", L), icon: "🧾" },
            { href: "/admin/closings", label: t("nav.closings", L), icon: "🔒" },
          ]} />
          <NavCard title={t("dash.card.collab", L)} subtitle="Collaboration" accent="accent" items={[
            { href: "/chat", label: t("nav.chat", L), icon: "💬" },
          ]} />
          <NavCard title={t("dash.card.meeting", L)} subtitle="Weekly Meeting" accent="purple" items={[
            { href: "/weekly-report", label: t("nav.weeklyReport", L), icon: "📋" },
            { href: "/calendar",      label: t("nav.calendar", L),     icon: "📅" },
          ]} />
          <NavCard title={t("nav.portalOps", L)} subtitle="Customer Portal" accent="accent" items={[
            { href: "/admin/portal-points", label: t("nav.portalPoints", L), icon: "🏆" },
            { href: "/admin/portal-banners", label: t("nav.portalBanners", L), icon: "📣" },
            { href: "/admin/portal-posts", label: t("nav.adminPosts", L), icon: "📰" },
            { href: "/admin/feedback", label: t("nav.adminFeedback", L), icon: "🌟" },
            { href: "/admin/surveys", label: t("nav.adminSurveys", L), icon: "📊" },
            { href: "/admin/referrals", label: t("nav.adminReferrals", L), icon: "🤝" },
          ]} />
          <NavCard title={t("nav.analytics", L)} subtitle="Analytics" accent="success" items={[
            { href: "/stats", label: t("nav.stats", L), icon: "📈" },
          ]} />
          <NavCard title={t("nav.admin", L)} subtitle="Administration" accent="danger" items={[
            { href: "/admin/audit-logs", label: t("nav.audit", L), icon: "🧾" },
            { href: "/admin/permissions", label: t("nav.permissions", L), icon: "🔐" },
            { href: "/admin/trash", label: t("nav.trash", L), icon: "🗑" },
          ]} />
        </div>
      </div>
    </main>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: AccentKey }) {
  const c = ACCENTS[accent];
  return (
    <div className={`relative overflow-hidden rounded-xl border-2 border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-4 transition hover:shadow-lg ${c.hover}`}>
      <div className={`absolute left-0 top-0 h-full w-1 ${c.bar}`} />
      <div className="text-[13px] font-bold text-[color:var(--tts-sub)]" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>{label}</div>
      <div className={`mt-2 font-mono text-[22px] font-black tracking-tight ${c.text}`} style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
        {value}
      </div>
      <div className="mt-1 text-[12px] text-[color:var(--tts-muted)]">{sub}</div>
    </div>
  );
}

function NavCard({ title, subtitle, accent, items }: { title: string; subtitle: string; accent: AccentKey; items: NavItem[] }) {
  const c = ACCENTS[accent];
  return (
    <div className={`rounded-xl border-2 ${c.border} bg-[color:var(--tts-card)] p-4 shadow-sm transition hover:shadow-md`}>
      <div className="mb-3 border-b border-dashed border-[color:var(--tts-border)] pb-2">
        <h3 className={`text-[19px] font-black tracking-tight ${c.text}`} style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
          {title}
        </h3>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--tts-muted)]" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
          {subtitle}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`group flex items-center gap-2 rounded-lg border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] px-3 py-2.5 text-[14px] font-bold text-[color:var(--tts-text)] transition ${c.hover}`}
          >
            {i.icon && <span className="text-[16px] transition group-hover:scale-110">{i.icon}</span>}
            <span className="flex-1 truncate">{i.label}</span>
            <span className={`text-[13px] font-black opacity-0 transition group-hover:opacity-100 ${c.text}`}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
