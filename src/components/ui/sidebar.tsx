"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// 글로벌 사이드바 — 인증된 ERP 페이지 전역. /login 과 /portal/* 에서는 숨김.
// 홈 + 모듈 아이콘 + 툴팁. 접기/펴기 토글.

type NavEntry = { href: string; label: string; icon: string; match: (path: string) => boolean };
type NavGroup = { label: string; items: NavEntry[] };

const HOME: NavEntry = { href: "/", label: "홈", icon: "🏠", match: (p) => p === "/" };

const GROUPS: NavGroup[] = [
  {
    label: "마스터",
    items: [
      { href: "/master/clients", label: "거래처", icon: "🤝", match: (p) => p.startsWith("/master/clients") },
      { href: "/master/items", label: "품목", icon: "📦", match: (p) => p.startsWith("/master/items") },
      { href: "/master/employees", label: "직원", icon: "👤", match: (p) => p.startsWith("/master/employees") },
      { href: "/master/departments", label: "부서", icon: "🏢", match: (p) => p.startsWith("/master/departments") },
      { href: "/master/warehouses", label: "창고", icon: "🏬", match: (p) => p.startsWith("/master/warehouses") },
      { href: "/master/projects", label: "프로젝트", icon: "🗂️", match: (p) => p.startsWith("/master/projects") },
      { href: "/master/schedules", label: "일정·CFM", icon: "🗓️", match: (p) => p.startsWith("/master/schedules") },
      { href: "/master/licenses", label: "라이선스", icon: "📜", match: (p) => p.startsWith("/master/licenses") },
    ],
  },
  {
    label: "영업",
    items: [
      { href: "/sales", label: "매출", icon: "💵", match: (p) => p.startsWith("/sales") },
      { href: "/purchases", label: "매입", icon: "🛒", match: (p) => p.startsWith("/purchases") },
    ],
  },
  {
    label: "렌탈",
    items: [
      { href: "/rental/it-contracts", label: "IT 계약", icon: "🖨️", match: (p) => p.startsWith("/rental/it-contracts") },
      { href: "/rental/tm-rentals", label: "TM 렌탈", icon: "🔧", match: (p) => p.startsWith("/rental/tm-rentals") },
    ],
  },
  {
    label: "AS",
    items: [
      { href: "/as/tickets", label: "접수", icon: "🛠️", match: (p) => p.startsWith("/as/tickets") },
      { href: "/as/dispatches", label: "출동", icon: "🚚", match: (p) => p.startsWith("/as/dispatches") },
    ],
  },
  {
    label: "재고",
    items: [
      { href: "/inventory/stock", label: "재고현황", icon: "📊", match: (p) => p.startsWith("/inventory") },
    ],
  },
  {
    label: "인사",
    items: [
      { href: "/hr/onboarding", label: "입사", icon: "📝", match: (p) => p.startsWith("/hr/onboarding") },
      { href: "/hr/offboarding", label: "퇴사", icon: "🏷️", match: (p) => p.startsWith("/hr/offboarding") },
      { href: "/hr/incidents", label: "사건평가", icon: "⚡", match: (p) => p.startsWith("/hr/incidents") },
      { href: "/hr/evaluations", label: "정기평가", icon: "⭐", match: (p) => p.startsWith("/hr/evaluations") },
      { href: "/hr/leave", label: "연차", icon: "🏖️", match: (p) => p.startsWith("/hr/leave") },
    ],
  },
  {
    label: "재경",
    items: [
      { href: "/finance/payables", label: "미수/미지급", icon: "💰", match: (p) => p.startsWith("/finance/payables") },
      { href: "/finance/expenses", label: "경비", icon: "🧾", match: (p) => p.startsWith("/finance/expenses") },
    ],
  },
  {
    label: "메시징",
    items: [
      { href: "/chat", label: "채팅", icon: "💬", match: (p) => p.startsWith("/chat") },
    ],
  },
  {
    label: "관리",
    items: [
      { href: "/admin/audit-logs", label: "감사로그", icon: "🧾", match: (p) => p.startsWith("/admin/audit-logs") },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [changingLang, setChangingLang] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

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
      await fetch("/api/auth/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      router.refresh();
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
          <NavItem entry={HOME} active={HOME.match(pathname)} collapsed={collapsed} />
        </ul>
        {GROUPS.map((g, gi) => (
          <div key={g.label} className={collapsed ? "mt-1 border-t border-[color:var(--tts-border)] pt-1" : gi === 0 ? "mt-2" : "mt-3"}>
            {!collapsed && (
              <div className="px-3 pb-1.5 pt-1 text-[13px] font-extrabold tracking-[0.05em] text-[color:var(--tts-text)]">
                {g.label}
              </div>
            )}
            <ul className="space-y-0.5 px-2">
              {g.items.map((n) => (
                <NavItem key={n.href} entry={n} active={n.match(pathname)} collapsed={collapsed} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — 언어 + 테마 */}
      <div className="border-t border-[color:var(--tts-border)] px-2 py-2">
        <div className={`flex ${collapsed ? "flex-col items-center gap-1" : "justify-between gap-1"}`}>
          {(["VI", "EN", "KO"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => changeLang(l)}
              disabled={changingLang}
              className="flex-1 rounded px-1 py-1 text-[10px] font-bold text-[color:var(--tts-muted)] hover:bg-[color:var(--tts-card-hover)] hover:text-[color:var(--tts-text)] disabled:opacity-50"
              title={l === "VI" ? "Tiếng Việt" : l === "EN" ? "English" : "한국어"}
            >
              {l}
            </button>
          ))}
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

function NavItem({ entry, active, collapsed }: { entry: NavEntry; active: boolean; collapsed: boolean }) {
  return (
    <li>
      <Link
        href={entry.href}
        title={entry.label}
        className={`flex items-center gap-2 rounded-md px-2 py-2 text-[13px] font-semibold transition ${
          active
            ? "bg-[color:var(--tts-primary-dim)] text-[color:var(--tts-primary)]"
            : "text-[color:var(--tts-sub)] hover:bg-[color:var(--tts-card-hover)] hover:text-[color:var(--tts-text)]"
        }`}
      >
        <span className="text-[18px] leading-none">{entry.icon}</span>
        {!collapsed && <span className="truncate">{entry.label}</span>}
      </Link>
    </li>
  );
}
