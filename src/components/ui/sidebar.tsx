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
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [changingLang, setChangingLang] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [currentLang, setCurrentLang] = useState<"VI" | "EN" | "KO" | null>(null);

  // 최초 마운트 시 로컬 저장 theme 복원 + 현재 언어 조회
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("tts-theme") : null;
    const next = saved === "light" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("light", next === "light");
    document.documentElement.classList.toggle("dark", next === "dark");
    // 현재 세션 언어 조회 (active 표시용)
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      const lang = d?.user?.language;
      if (lang === "VI" || lang === "EN" || lang === "KO") setCurrentLang(lang);
    }).catch(() => undefined);
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
          aria-label={collapsed ? "펼치기" : "접기"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* 네비 */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5 px-2">
          <NavItem entry={HOME} active={HOME.match(pathname)} collapsed={collapsed} lang={currentLang ?? "KO"} />
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
                  {t(g.labelKey, currentLang ?? "KO")}
                </span>
              </div>
            )}
            <ul className="space-y-0.5 px-2">
              {g.items.map((n) => (
                <NavItem key={n.href} entry={n} active={n.match(pathname)} collapsed={collapsed} lang={currentLang ?? "KO"} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — 언어 + 테마 */}
      <div className="border-t border-[color:var(--tts-border)] px-2 py-2">
        <div className={`flex ${collapsed ? "flex-col items-center gap-1" : "justify-between gap-1"}`}>
          {(["VI", "EN", "KO"] as const).map((l) => {
            const active = currentLang === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => changeLang(l)}
                disabled={changingLang}
                style={active
                  ? { backgroundColor: "var(--tts-primary)", color: "#fff", fontWeight: 800 }
                  : undefined}
                className={`flex-1 rounded px-1 py-1 text-[10px] font-bold transition disabled:opacity-50 ${
                  active
                    ? "shadow"
                    : "text-[color:var(--tts-muted)] hover:bg-[color:var(--tts-card-hover)] hover:text-[color:var(--tts-text)]"
                }`}
                title={l === "VI" ? "Tiếng Việt" : l === "EN" ? "English" : "한국어"}
              >
                {l}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="mt-1 w-full rounded px-2 py-1 text-[11px] font-bold text-[color:var(--tts-muted)] hover:bg-[color:var(--tts-card-hover)] hover:text-[color:var(--tts-text)]"
          title={theme === "dark" ? "라이트 모드로" : "다크 모드로"}
        >
          {theme === "dark" ? (collapsed ? "☀" : "☀ 라이트") : (collapsed ? "🌙" : "🌙 다크")}
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
