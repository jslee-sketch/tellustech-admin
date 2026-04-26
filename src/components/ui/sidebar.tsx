"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

// 글로벌 사이드바 — 인증된 ERP 페이지 전역. /login 과 /portal/* 에서는 숨김.
// 홈 + 모듈 아이콘 + 툴팁. 접기/펴기 토글. 라벨은 현재 세션 언어 기준 i18n.

type NavEntry = { href: string; labelKey: string; icon: string; match: (path: string) => boolean };
type NavGroup = { labelKey: string; items: NavEntry[] };

const HOME: NavEntry = { href: "/", labelKey: "nav.home", icon: "🏠", match: (p) => p === "/" };

const GROUPS: NavGroup[] = [
  {
    labelKey: "nav.master",
    items: [
      { href: "/master/clients", labelKey: "nav.clients", icon: "🤝", match: (p) => p.startsWith("/master/clients") },
      { href: "/master/items", labelKey: "nav.items", icon: "📦", match: (p) => p.startsWith("/master/items") },
      { href: "/master/employees", labelKey: "nav.employees", icon: "👤", match: (p) => p.startsWith("/master/employees") },
      { href: "/master/departments", labelKey: "nav.departments", icon: "🏢", match: (p) => p.startsWith("/master/departments") },
      { href: "/master/warehouses", labelKey: "nav.warehouses", icon: "🏬", match: (p) => p.startsWith("/master/warehouses") },
      { href: "/master/projects", labelKey: "nav.projects", icon: "🗂️", match: (p) => p.startsWith("/master/projects") },
      { href: "/master/schedules", labelKey: "nav.schedules", icon: "🗓️", match: (p) => p.startsWith("/master/schedules") },
      { href: "/master/licenses", labelKey: "nav.licenses", icon: "📜", match: (p) => p.startsWith("/master/licenses") },
    ],
  },
  {
    labelKey: "nav.sales",
    items: [
      { href: "/sales", labelKey: "nav.salesOrder", icon: "💵", match: (p) => p.startsWith("/sales") },
      { href: "/purchases", labelKey: "nav.purchase", icon: "🛒", match: (p) => p.startsWith("/purchases") },
    ],
  },
  {
    labelKey: "nav.rental",
    items: [
      { href: "/rental/it-contracts", labelKey: "nav.itContract", icon: "🖨️", match: (p) => p.startsWith("/rental/it-contracts") },
      { href: "/rental/tm-rentals", labelKey: "nav.tmRental", icon: "🔧", match: (p) => p.startsWith("/rental/tm-rentals") },
    ],
  },
  {
    labelKey: "nav.as",
    items: [
      { href: "/as/tickets", labelKey: "nav.asTickets", icon: "🛠️", match: (p) => p.startsWith("/as/tickets") },
      { href: "/as/dispatches", labelKey: "nav.dispatches", icon: "🚚", match: (p) => p.startsWith("/as/dispatches") },
    ],
  },
  {
    labelKey: "nav.inventory",
    items: [
      { href: "/inventory/stock", labelKey: "nav.stock", icon: "📊", match: (p) => p.startsWith("/inventory/stock") },
      { href: "/inventory/transactions", labelKey: "nav.invTxn", icon: "🔁", match: (p) => p.startsWith("/inventory/transactions") },
      { href: "/inventory/scan", labelKey: "nav.qrScan", icon: "📷", match: (p) => p.startsWith("/inventory/scan") },
      { href: "/inventory/labels", labelKey: "nav.qrLabel", icon: "🏷️", match: (p) => p.startsWith("/inventory/labels") },
    ],
  },
  {
    labelKey: "nav.hr",
    items: [
      { href: "/hr/onboarding", labelKey: "nav.onboarding", icon: "📝", match: (p) => p.startsWith("/hr/onboarding") },
      { href: "/hr/offboarding", labelKey: "nav.offboarding", icon: "🏷️", match: (p) => p.startsWith("/hr/offboarding") },
      { href: "/hr/incidents", labelKey: "nav.incidents", icon: "⚡", match: (p) => p.startsWith("/hr/incidents") },
      { href: "/hr/evaluations", labelKey: "nav.evaluations", icon: "⭐", match: (p) => p.startsWith("/hr/evaluations") },
      { href: "/hr/leave", labelKey: "nav.leave", icon: "🏖️", match: (p) => p.startsWith("/hr/leave") },
    ],
  },
  {
    labelKey: "nav.finance",
    items: [
      { href: "/finance/payables", labelKey: "nav.payables", icon: "💰", match: (p) => p.startsWith("/finance/payables") },
      { href: "/finance/expenses", labelKey: "nav.expenses", icon: "🧾", match: (p) => p.startsWith("/finance/expenses") },
    ],
  },
  {
    labelKey: "nav.meeting",
    items: [
      { href: "/weekly-report", labelKey: "nav.weeklyReport", icon: "📋", match: (p) => p.startsWith("/weekly-report") },
    ],
  },
  {
    labelKey: "nav.calendar",
    items: [
      { href: "/calendar", labelKey: "nav.calendar", icon: "📅", match: (p) => p.startsWith("/calendar") },
    ],
  },
  {
    labelKey: "nav.messaging",
    items: [
      { href: "/chat", labelKey: "nav.chat", icon: "💬", match: (p) => p.startsWith("/chat") },
    ],
  },
  {
    labelKey: "nav.admin",
    items: [
      { href: "/admin/audit-logs", labelKey: "nav.audit", icon: "🧾", match: (p) => p.startsWith("/admin/audit-logs") },
      { href: "/admin/permissions", labelKey: "nav.permissions", icon: "🔐", match: (p) => p.startsWith("/admin/permissions") },
      { href: "/admin/closings", labelKey: "nav.closings", icon: "🔒", match: (p) => p.startsWith("/admin/closings") },
      { href: "/admin/trash", labelKey: "nav.trash", icon: "🗑", match: (p) => p.startsWith("/admin/trash") },
      { href: "/stats", labelKey: "nav.stats", icon: "📈", match: (p) => p.startsWith("/stats") },
    ],
  },
];

export function Sidebar({ initialLang = "KO" }: { initialLang?: Lang }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [changingLang, setChangingLang] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  // SSR 으로 받은 initialLang 을 즉시 적용 — 깜빡임 제거
  const [currentLang, setCurrentLang] = useState<Lang>(initialLang);
  // Phase 2.B+ 권한 가림 — /api/auth/me 응답 캐시
  const [perms, setPerms] = useState<Record<string, "HIDDEN" | "VIEW" | "WRITE">>({});
  const [companyCode, setCompanyCode] = useState<string>("");
  const [allowedCompanies, setAllowedCompanies] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" }).then((r) => r.json()).then((j) => {
      if (j?.permissions) setPerms(j.permissions);
      if (j?.user?.companyCode) setCompanyCode(j.user.companyCode);
      if (j?.user?.allowedCompanies) setAllowedCompanies(j.user.allowedCompanies);
    }).catch(() => undefined);
  }, []);
  async function switchCompany(code: string) {
    if (code === companyCode) return;
    const r = await fetch("/api/auth/company", {
      method: "PUT", headers: {"Content-Type":"application/json"}, credentials: "same-origin",
      body: JSON.stringify({ companyCode: code }),
    });
    if (r.ok) location.reload();
  }
  // labelKey → PermissionModule 매핑. sidebar 실제 키와 일치해야 가림 작동.
  const KEY_TO_MODULE: Record<string, string> = {
    "nav.clients":"CLIENTS","nav.items":"ITEMS","nav.warehouses":"WAREHOUSES","nav.employees":"EMPLOYEES",
    "nav.departments":"DEPARTMENTS","nav.projects":"PROJECTS","nav.licenses":"LICENSES","nav.schedules":"SCHEDULES",
    "nav.salesOrder":"SALES","nav.sales":"SALES",
    "nav.purchase":"PURCHASES","nav.purchases":"PURCHASES",
    "nav.itContract":"IT_CONTRACTS","nav.itContracts":"IT_CONTRACTS",
    "nav.tmRental":"TM_RENTALS","nav.tmRentals":"TM_RENTALS",
    "nav.asTickets":"AS_TICKETS",
    "nav.dispatches":"AS_DISPATCHES","nav.asDispatches":"AS_DISPATCHES",
    "nav.calibrations":"CALIBRATIONS",
    "nav.stock":"INVENTORY","nav.invTxn":"INVENTORY","nav.txns":"INVENTORY",
    "nav.qrScan":"INVENTORY","nav.qrLabel":"INVENTORY","nav.qrPrint":"INVENTORY",
    "nav.leave":"HR_LEAVE","nav.onboarding":"HR_ONBOARDING","nav.offboarding":"HR_OFFBOARDING",
    "nav.incidents":"HR_INCIDENT","nav.evaluations":"HR_EVALUATION","nav.payroll":"HR_PAYROLL","nav.incentive":"HR_INCENTIVE",
    "nav.payables":"FINANCE_PAYABLE","nav.expenses":"FINANCE_EXPENSE","nav.receivables":"FINANCE_RECEIVABLE",
    "nav.stats":"STATS","nav.chat":"CHAT","nav.calendar":"CALENDAR","nav.audit":"AUDIT",
    "nav.weeklyReport":"STATS",
    "nav.permissions":"ADMIN","nav.closings":"ADMIN","nav.trash":"ADMIN",
  };
  function isHidden(labelKey: string): boolean {
    const mod = KEY_TO_MODULE[labelKey];
    if (!mod) return false;
    return perms[mod] === "HIDDEN";
  }

  // 최초 마운트 시 로컬 저장 theme 복원
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("tts-theme") : null;
    const next = saved === "light" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("light", next === "light");
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("light", next === "light");
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("tts-theme", next);
  }

  async function changeLang(lang: "VI" | "EN" | "KO") {
    setChangingLang(true);
    try {
      const res = await fetch("/api/auth/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ language: lang }),
      });
      if (res.ok) {
        setCurrentLang(lang);
        // JWT 가 재발급되어 쿠키가 갱신됐으므로 전체 페이지를 다시 로드
        // (router.refresh 만으로는 미들웨어가 새 JWT 를 주입하지 못함)
        window.location.reload();
        return;
      }
    } finally {
      setChangingLang(false);
    }
  }

  // 로그인 · 포털 · 루트 아닌 공개 페이지에서는 숨김
  if (pathname.startsWith("/login") || pathname.startsWith("/portal")) return null;

  const width = collapsed ? "w-[56px]" : "w-[200px]";

  return (
    <aside
      className={`${width} sticky top-0 flex h-screen flex-col border-r border-[color:var(--tts-border)] bg-[color:var(--tts-card)] transition-[width] duration-150`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-[color:var(--tts-border)] px-3 py-3">
        {!collapsed && (
          <Link href="/" className="font-black tracking-[0.15em] text-[color:var(--tts-accent)]" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
            TTS
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded p-1 text-[color:var(--tts-muted)] hover:bg-[color:var(--tts-card-hover)] hover:text-[color:var(--tts-text)]"
          aria-label={collapsed ? t("sidebar.expand", currentLang) : t("sidebar.collapse", currentLang)}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* 언어 선택 — 상단, 동그란 국기, 활성 시 발광 테두리 */}
      <div className="border-b border-[color:var(--tts-border)] px-2 py-3">
        {!collapsed && (
          <div className="mb-2 px-1 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--tts-muted)]">
            {t("sidebar.langSelect", currentLang)}
          </div>
        )}
        <div className={`flex ${collapsed ? "flex-col items-center gap-2" : "justify-center gap-2"}`}>
          {(["VI", "EN", "KO"] as const).map((l) => {
            const active = currentLang === l;
            const flagSrc = l === "VI" ? "/flags/vn.svg" : l === "EN" ? "/flags/us.svg" : "/flags/kr.svg";
            const title = l === "VI" ? "Tiếng Việt" : l === "EN" ? "English" : "한국어";
            return (
              <button
                key={l}
                type="button"
                onClick={() => changeLang(l)}
                disabled={changingLang}
                title={title}
                aria-label={title}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 p-0 overflow-hidden transition disabled:opacity-50 ${
                  active
                    ? "border-[color:var(--tts-accent)]"
                    : "border-[color:var(--tts-border)] opacity-60 hover:opacity-100"
                }`}
                style={active ? {
                  boxShadow: "0 0 12px 2px var(--tts-accent), 0 0 4px 1px rgba(232,148,58,0.6) inset",
                } : undefined}
              >
                <img src={flagSrc} alt={title} aria-hidden className="h-full w-full rounded-full object-cover" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 회사 선택 — 2개 이상 권한이 있을 때만 노출 (ADMIN/MANAGER 통합조회 ALL 포함) */}
      {allowedCompanies.length >= 2 && (
        <div className="border-b border-[color:var(--tts-border)] px-2 py-2">
          {!collapsed && (
            <div className="mb-1 px-1 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--tts-muted)]">
              회사
            </div>
          )}
          <div className={`flex ${collapsed ? "flex-col items-center gap-1" : "justify-center gap-1"}`}>
            {[...allowedCompanies, "ALL"].map((c) => {
              const active = companyCode === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => switchCompany(c)}
                  title={c === "ALL" ? "통합조회" : c}
                  className={`rounded px-2 py-1 text-[11px] font-bold ${active ? "bg-[color:var(--tts-primary)] text-white" : "border border-[color:var(--tts-border)] text-[color:var(--tts-sub)] hover:text-[color:var(--tts-text)]"}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 네비 */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5 px-2">
          <NavItem entry={HOME} active={HOME.match(pathname)} collapsed={collapsed} lang={currentLang} />
        </ul>
        {GROUPS.map((g, gi) => (
          <div
            key={g.labelKey}
            className={
              collapsed
                ? "mt-2 border-t border-[color:var(--tts-border)] pt-2"
                : gi === 0
                  ? "mt-3"
                  : "mt-4 border-t border-[color:var(--tts-border)] pt-3"
            }
          >
            {!collapsed && (
              <div className="mb-1 flex items-center gap-2 px-3">
                <span className="h-3.5 w-1 rounded-full bg-[color:var(--tts-accent)]" aria-hidden />
                <span className="text-[13px] font-extrabold tracking-[0.05em] text-[color:var(--tts-text)]">
                  {t(g.labelKey, currentLang)}
                </span>
              </div>
            )}
            <ul className="space-y-0.5 px-2">
              {g.items.filter((n) => !isHidden(n.labelKey)).map((n) => (
                <NavItem key={n.href} entry={n} active={n.match(pathname)} collapsed={collapsed} lang={currentLang} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — 테마만 (언어 셀렉터는 상단으로 이동) */}
      <div className="border-t border-[color:var(--tts-border)] px-2 py-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full rounded px-2 py-1 text-[11px] font-bold text-[color:var(--tts-muted)] hover:bg-[color:var(--tts-card-hover)] hover:text-[color:var(--tts-text)]"
          title={theme === "dark" ? t("sidebar.toLightMode", currentLang) : t("sidebar.toDarkMode", currentLang)}
        >
          {theme === "dark" ? (collapsed ? "☀" : `☀ ${t("sidebar.lightShort", currentLang)}`) : (collapsed ? "🌙" : `🌙 ${t("sidebar.darkShort", currentLang)}`)}
        </button>
        {!collapsed && <div className="mt-1 text-center text-[9px] text-[color:var(--tts-muted)]">TELLUSTECH ERP</div>}
      </div>
    </aside>
  );
}

function NavItem({ entry, active, collapsed, lang }: { entry: NavEntry; active: boolean; collapsed: boolean; lang: Lang }) {
  const label = t(entry.labelKey, lang);
  return (
    <li>
      <Link
        href={entry.href}
        title={label}
        className={`flex items-center gap-2 rounded-md px-2 py-2 text-[13px] font-semibold transition ${
          active
            ? "bg-[color:var(--tts-primary-dim)] text-[color:var(--tts-primary)]"
            : "text-[color:var(--tts-sub)] hover:bg-[color:var(--tts-card-hover)] hover:text-[color:var(--tts-text)]"
        }`}
      >
        <span className="text-[18px] leading-none">{entry.icon}</span>
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    </li>
  );
}
