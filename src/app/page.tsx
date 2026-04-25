// TELLUSTECH ERP 홈 대시보드.
// KPI 카드 + 모듈 네비 (버튼형) — 모듈별 고유 색상 + 섹션별 강조 테두리.

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
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
              대시보드
              <span className="ml-3 rounded-lg bg-[color:var(--tts-primary)] px-3 py-1 align-middle text-[14px] font-extrabold text-white">{session.companyCode}</span>
              <span className="ml-3 align-middle text-[16px] font-medium text-[color:var(--tts-sub)]">{session.username}</span>
            </h1>
          </div>
          <LogoutButton />
        </div>

        {/* 캘린더 히어로 — 좌: 오늘 캘린더 미니 카드, 우: 다가오는 일정 자동 캐러셀 */}
        <DashboardCalendarHero />

        {/* KPI */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="이번달 매출" value={`${new Intl.NumberFormat("vi-VN").format(monthSalesVnd)} ₫`} sub={`${salesCount}건`} accent="primary" />
          <KpiCard label="이번달 매입" value={`${new Intl.NumberFormat("vi-VN").format(monthPurchaseVnd)} ₫`} sub={`${purchaseCount}건`} accent="accent" />
          <KpiCard label="미수금 잔액" value={`${new Intl.NumberFormat("vi-VN").format(Number(outstanding))} ₫`} sub={`${openReceivable._count}건`} accent="danger" />
          <KpiCard label="미지급금 잔액" value={`${new Intl.NumberFormat("vi-VN").format(Number(payable))} ₫`} sub={`${openPayable._count}건`} accent="warn" />
          <KpiCard label="AS 진행중" value={String(asPending)} sub="접수/처리중/출동" accent="warn" />
          <KpiCard label="계약·성적서 만료" value={String(expiringContracts + certExpiring)} sub={`30일 이내 · 계약 ${expiringContracts} · 성적서 ${certExpiring}`} accent="danger" />
        </div>

        {/* 모듈 네비 */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <NavCard title="기초등록" subtitle="Master Data" accent="primary" items={[
            { href: "/master/departments", label: "부서", icon: "🏢" },
            { href: "/master/employees", label: "직원", icon: "👤" },
            { href: "/master/clients", label: "거래처 (CRM)", icon: "🤝" },
            { href: "/master/items", label: "품목", icon: "📦" },
            { href: "/master/warehouses", label: "창고", icon: "🏬" },
            { href: "/master/projects", label: "프로젝트", icon: "🗂️" },
            { href: "/master/schedules", label: "일정·CFM", icon: "🗓️" },
            { href: "/master/licenses", label: "라이선스", icon: "📜" },
          ]} />
          <NavCard title="렌탈 · 계약" subtitle="Contracts" accent="accent" items={[
            { href: "/rental/it-contracts", label: "IT 계약", icon: "🖨️" },
            { href: "/rental/tm-rentals", label: "TM 렌탈", icon: "🔧" },
          ]} />
          <NavCard title="영업" subtitle="Sales / Purchase" accent="purple" items={[
            { href: "/sales", label: "매출", icon: "💵" },
            { href: "/purchases", label: "매입", icon: "🛒" },
          ]} />
          <NavCard title="AS · 서비스" subtitle="Service" accent="warn" items={[
            { href: "/as/tickets", label: "AS 접수", icon: "🛠️" },
            { href: "/as/dispatches", label: "AS 출동", icon: "🚚" },
          ]} />
          <NavCard title="재고" subtitle="Inventory" accent="success" items={[
            { href: "/inventory/stock", label: "재고 현황", icon: "📊" },
            { href: "/inventory/transactions", label: "입출고", icon: "🔄" },
            { href: "/inventory/scan", label: "바코드 스캔", icon: "📷" },
            { href: "/inventory/depreciation", label: "감가상각", icon: "📉" },
          ]} />
          <NavCard title="HR" subtitle="Human Resources" accent="primary" items={[
            { href: "/hr/onboarding", label: "입사카드", icon: "📝" },
            { href: "/hr/offboarding", label: "퇴사카드", icon: "🏷️" },
            { href: "/hr/incidents", label: "사건평가", icon: "⚡" },
            { href: "/hr/evaluations", label: "정기평가", icon: "⭐" },
            { href: "/hr/leave", label: "연차/휴가", icon: "🏖️" },
          ]} />
          <NavCard title="재경" subtitle="Finance" accent="danger" items={[
            { href: "/finance/payables", label: "미수/미지급", icon: "💰" },
            { href: "/finance/expenses", label: "경비/정산", icon: "🧾" },
          ]} />
          <NavCard title="협업" subtitle="Collaboration" accent="accent" items={[
            { href: "/chat", label: "채팅", icon: "💬" },
          ]} />
          <NavCard title="회의" subtitle="Weekly Meeting" accent="purple" items={[
            { href: "/weekly-report", label: "Backlog/업무진행", icon: "📋" },
            { href: "/calendar", label: "캘린더", icon: "📅" },
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
