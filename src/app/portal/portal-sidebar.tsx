"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

// 고객 포탈 사이드바 — 3그룹(OA/TM/소통하기) + 배너 + 포인트 + 언어/테마.
// Phase 추가: collapse 토글 + 그룹 탭(헤더 클릭 → 펼침/접힘, localStorage 저장)

type Banner = { slot: string; text: string; linkUrl: string };

type NavItem = { href: string; labelKey: string; icon?: string };

const OA_ITEMS: NavItem[] = [
  { href: "/portal/oa/rentals", labelKey: "portal.sidebar.rentalStatus" },
  { href: "/portal/as-request", labelKey: "portal.sidebar.asRequest" },
  { href: "/portal/supplies-request", labelKey: "portal.sidebar.suppliesRequest" },
  { href: "/portal/usage-confirm", labelKey: "portal.sidebar.usageConfirm" },
];
const TM_ITEMS: NavItem[] = [
  { href: "/portal/tm/rentals", labelKey: "portal.sidebar.rentalStatus" },
  { href: "/portal/tm/repairs", labelKey: "portal.sidebar.repairStatus" },
  { href: "/portal/tm/calibrations", labelKey: "portal.sidebar.calibrationStatus" },
  { href: "/portal/tm/maintenance", labelKey: "portal.sidebar.maintenanceStatus" },
  { href: "/portal/tm/purchases", labelKey: "portal.sidebar.purchaseStatus" },
  { href: "/portal/cal-certs", labelKey: "portal.sidebar.calCerts" },
];
const COMM_ITEMS: NavItem[] = [
  { href: "/portal/quotes", labelKey: "portal.sidebar.quoteRequest", icon: "💬" },
  { href: "/portal/referrals", labelKey: "portal.sidebar.referral", icon: "🤝" },
  { href: "/portal/feedback", labelKey: "portal.sidebar.feedback", icon: "🌟" },
  { href: "/portal/posts", labelKey: "portal.sidebar.posts", icon: "📰" },
  { href: "/portal/surveys", labelKey: "portal.sidebar.surveys", icon: "📊" },
  { href: "/portal/account", labelKey: "portal.sidebar.account", icon: "🔐" },
];

type GroupKey = "oa" | "tm" | "comm";
const STORAGE_COLLAPSED = "portal_sidebar_collapsed";
const STORAGE_OPEN_GROUPS = "portal_sidebar_open_groups";

export function PortalSidebar({ initialLang = "KO", clientName }: { initialLang?: Lang; clientName: string }) {
  const pathname = usePathname() ?? "/portal";
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(initialLang);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [balance, setBalance] = useState<number>(0);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [openGroups, setOpenGroups] = useState<Record<GroupKey, boolean>>({ oa: true, tm: true, comm: true });
  // 모바일 drawer
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/portal/points", { credentials: "same-origin" }).then((r) => r.json()).then((j) => { if (typeof j?.balance === "number") setBalance(j.balance); }).catch(() => undefined);
    fetch("/api/portal/banners", { credentials: "same-origin" }).then((r) => r.json()).then((j) => { if (Array.isArray(j?.banners)) setBanners(j.banners); }).catch(() => undefined);
    if (typeof document !== "undefined") {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }
    if (typeof window !== "undefined") {
      const c = localStorage.getItem(STORAGE_COLLAPSED);
      if (c === "1") setCollapsed(true);
      const og = localStorage.getItem(STORAGE_OPEN_GROUPS);
      if (og) { try { setOpenGroups((prev) => ({ ...prev, ...JSON.parse(og) })); } catch { /* */ } }
      // 현재 경로 기반 자동 열기
      const auto: Partial<Record<GroupKey, boolean>> = {};
      if (pathname.startsWith("/portal/oa") || pathname.includes("/as-request") || pathname.includes("/supplies-request") || pathname.includes("/usage-confirm")) auto.oa = true;
      if (pathname.startsWith("/portal/tm") || pathname.includes("/cal-certs")) auto.tm = true;
      if (["/portal/quotes", "/portal/referrals", "/portal/feedback", "/portal/posts", "/portal/surveys"].some((p) => pathname.startsWith(p))) auto.comm = true;
      if (Object.keys(auto).length > 0) setOpenGroups((prev) => ({ ...prev, ...auto }));
    }
  }, [pathname]);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_COLLAPSED, next ? "1" : "0");
  }
  function toggleGroup(g: GroupKey) {
    const next = { ...openGroups, [g]: !openGroups[g] };
    setOpenGroups(next);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_OPEN_GROUPS, JSON.stringify(next));
  }

  async function changeLang(next: Lang) {
    setLang(next);
    await fetch("/api/auth/language", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: next }), credentials: "same-origin" }).catch(() => undefined);
    router.refresh();
  }
  function toggleTheme() {
    if (typeof document === "undefined") return;
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    setTheme(next);
  }

  const oaBanner = banners.find((b) => b.slot === "OA");
  const tmBanner = banners.find((b) => b.slot === "TM");

  function isActive(href: string) { return pathname === href || (href !== "/" && pathname.startsWith(href)); }
  const itemCls = (active: boolean) => `flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition ${active ? "bg-[color:var(--tts-accent)] text-white font-bold" : "text-[color:var(--tts-text)] hover:bg-[color:var(--tts-card-hover)]"}`;

  // 모바일 햄버거 + drawer (md 미만에서만 보임)
  const mobileHeader = (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[color:var(--tts-border)] bg-[color:var(--tts-card)] px-4 py-2 md:hidden">
      <button onClick={() => setMobileOpen(true)} className="rounded border border-[color:var(--tts-border)] px-2 py-1 text-[14px]" title={t("portal.sidebar.menu", lang)}>☰</button>
      <Link href="/portal" className="text-[12px] font-bold tracking-wider text-[color:var(--tts-accent)]">TELLUSTECH</Link>
      <Link href="/portal/points" className="text-[11px] font-mono text-[color:var(--tts-warn)]">🏆 {new Intl.NumberFormat("vi-VN").format(balance)}d</Link>
    </header>
  );
  const mobileDrawer = mobileOpen ? (
    <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
      <div className="absolute inset-0 bg-black/60" />
      <aside className="absolute left-0 top-0 h-full w-[280px] overflow-y-auto bg-[color:var(--tts-card)] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[color:var(--tts-border)] p-4">
          <div className="min-w-0 flex-1">
            <Link href="/portal" onClick={() => setMobileOpen(false)} className="block text-[11px] font-bold tracking-[0.18em] text-[color:var(--tts-accent)]">TELLUSTECH PORTAL</Link>
            <div className="mt-1 truncate text-[14px] font-bold">{clientName}</div>
            <Link href="/portal/points" onClick={() => setMobileOpen(false)} className="mt-2 inline-flex items-center gap-1 text-[12px] font-mono text-[color:var(--tts-warn)]">🏆 {new Intl.NumberFormat("vi-VN").format(balance)}d</Link>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-[18px] text-[color:var(--tts-muted)]">✕</button>
        </div>
        <div className="px-2 pb-3">
          <SectionTab label={t("portal.sidebar.oaDivision", lang)} open={openGroups.oa} onToggle={() => toggleGroup("oa")} />
          {openGroups.oa && (<ul className="space-y-0.5">{OA_ITEMS.map((it) => <li key={it.href}><Link href={it.href} onClick={() => setMobileOpen(false)} className={itemCls(isActive(it.href))}>{t(it.labelKey, lang)}</Link></li>)}</ul>)}
          <SectionTab label={t("portal.sidebar.tmDivision", lang)} open={openGroups.tm} onToggle={() => toggleGroup("tm")} />
          {openGroups.tm && (<ul className="space-y-0.5">{TM_ITEMS.map((it) => <li key={it.href}><Link href={it.href} onClick={() => setMobileOpen(false)} className={itemCls(isActive(it.href))}>{t(it.labelKey, lang)}</Link></li>)}</ul>)}
          <SectionTab label={t("portal.sidebar.communication", lang)} open={openGroups.comm} onToggle={() => toggleGroup("comm")} />
          {openGroups.comm && (<ul className="space-y-0.5">{COMM_ITEMS.map((it) => <li key={it.href}><Link href={it.href} onClick={() => setMobileOpen(false)} className={itemCls(isActive(it.href))}><span>{it.icon}</span><span>{t(it.labelKey, lang)}</span></Link></li>)}</ul>)}
        </div>
        <div className="border-t border-[color:var(--tts-border)] p-3">
          <div className="mb-2 flex items-center gap-1">
            {(["VI","EN","KO"] as const).map((l) => {
              const active = lang === l;
              const flagSrc = l === "VI" ? "/flags/vn.svg" : l === "EN" ? "/flags/us.svg" : "/flags/kr.svg";
              return <button key={l} onClick={() => changeLang(l)} className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 ${active ? "border-[color:var(--tts-accent)]" : "border-[color:var(--tts-border)] opacity-60"}`}><img src={flagSrc} alt={l} className="h-full w-full rounded-full object-cover"/></button>;
            })}
            <button onClick={toggleTheme} className="ml-auto rounded border border-[color:var(--tts-border)] px-2 py-1 text-[11px]">{theme === "dark" ? "☀" : "🌙"}</button>
          </div>
          <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); router.replace("/login"); }} className="w-full rounded border border-[color:var(--tts-border)] px-3 py-1.5 text-[12px]">{t("nav.logout", lang)}</button>
          <Link href="/login" onClick={async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); }} className="mt-2 block w-full rounded border border-[color:var(--tts-accent)] px-3 py-1.5 text-center text-[11px] text-[color:var(--tts-accent)]">{t("portal.sidebar.staffLogin", lang)}</Link>
        </div>
      </aside>
    </div>
  ) : null;

  // 접힌 상태 — 아이콘만
  if (collapsed) {
    const all: Array<{ href: string; emoji: string; label: string }> = [
      { href: "/portal", emoji: "🏠", label: "Home" },
      { href: "/portal/points", emoji: "🏆", label: "Points" },
      ...OA_ITEMS.map((it) => ({ href: it.href, emoji: "📠", label: t(it.labelKey, lang) })),
      ...TM_ITEMS.map((it) => ({ href: it.href, emoji: "🔬", label: t(it.labelKey, lang) })),
      ...COMM_ITEMS.map((it) => ({ href: it.href, emoji: it.icon ?? "•", label: t(it.labelKey, lang) })),
    ];
    return (
      <>
      {mobileHeader}
      {mobileDrawer}
      <aside className="hidden w-[64px] shrink-0 flex-col border-r border-[color:var(--tts-border)] bg-[color:var(--tts-card)] md:flex">
        <button onClick={toggleCollapse} className="m-2 rounded border border-[color:var(--tts-border)] py-1.5 text-[14px] hover:bg-[color:var(--tts-card-hover)]" title={t("portal.sidebar.expand", lang)}>▶</button>
        <Link href="/portal" className="mx-2 mb-2 block rounded text-center text-[10px] font-bold text-[color:var(--tts-accent)]">TTS</Link>
        <Link href="/portal/points" className="mx-2 mb-2 block text-center text-[14px]" title={`${balance.toLocaleString()}d`}>🏆</Link>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-1">
          {all.slice(0, 16).map((x) => (
            <Link key={x.href} href={x.href} title={x.label} className={`flex h-9 w-full items-center justify-center rounded ${isActive(x.href) ? "bg-[color:var(--tts-accent)] text-white" : "hover:bg-[color:var(--tts-card-hover)]"}`}>
              <span className="text-[16px]">{x.emoji}</span>
            </Link>
          ))}
        </div>
        <div className="border-t border-[color:var(--tts-border)] p-2">
          <button onClick={toggleTheme} className="w-full rounded border border-[color:var(--tts-border)] py-1 text-[12px]">{theme === "dark" ? "☀" : "🌙"}</button>
        </div>
      </aside>
      </>
    );
  }

  // 펼친 상태
  return (
    <>
    {mobileHeader}
    {mobileDrawer}
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[color:var(--tts-border)] bg-[color:var(--tts-card)] md:flex">
      <div className="flex items-start justify-between px-4 py-4">
        <div className="min-w-0 flex-1">
          <Link href="/portal" className="block text-[11px] font-bold tracking-[0.18em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH PORTAL</Link>
          <div className="mt-1 truncate text-[14px] font-bold">{clientName}</div>
          <Link href="/portal/points" className="mt-2 inline-flex items-center gap-1 text-[12px] font-mono text-[color:var(--tts-warn)] hover:underline">🏆 {new Intl.NumberFormat("vi-VN").format(balance)}d</Link>
        </div>
        <button onClick={toggleCollapse} className="rounded border border-[color:var(--tts-border)] px-1.5 py-0.5 text-[12px] hover:bg-[color:var(--tts-card-hover)]" title={t("portal.sidebar.collapse", lang)}>◀</button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <SectionTab label={t("portal.sidebar.oaDivision", lang)} open={openGroups.oa} onToggle={() => toggleGroup("oa")} />
        {openGroups.oa && (
          <>
            {oaBanner && (
              <a href={oaBanner.linkUrl} target="_blank" rel="noopener noreferrer" className="mx-1 mb-1 block rounded-md bg-[color:var(--tts-primary-dim)] px-2 py-1.5 text-[11px] font-medium text-[color:var(--tts-primary)] hover:opacity-90" title={oaBanner.text}>📠 {oaBanner.text}</a>
            )}
            <ul className="space-y-0.5">
              {OA_ITEMS.map((it) => (
                <li key={it.href}><Link href={it.href} className={itemCls(isActive(it.href))}>{t(it.labelKey, lang)}</Link></li>
              ))}
            </ul>
          </>
        )}

        <SectionTab label={t("portal.sidebar.tmDivision", lang)} open={openGroups.tm} onToggle={() => toggleGroup("tm")} />
        {openGroups.tm && (
          <>
            {tmBanner && (
              <a href={tmBanner.linkUrl} target="_blank" rel="noopener noreferrer" className="mx-1 mb-1 block rounded-md bg-[color:var(--tts-primary-dim)] px-2 py-1.5 text-[11px] font-medium text-[color:var(--tts-primary)] hover:opacity-90" title={tmBanner.text}>🔬 {tmBanner.text}</a>
            )}
            <ul className="space-y-0.5">
              {TM_ITEMS.map((it) => (
                <li key={it.href}><Link href={it.href} className={itemCls(isActive(it.href))}>{t(it.labelKey, lang)}</Link></li>
              ))}
            </ul>
          </>
        )}

        <SectionTab label={t("portal.sidebar.communication", lang)} open={openGroups.comm} onToggle={() => toggleGroup("comm")} />
        {openGroups.comm && (
          <ul className="space-y-0.5">
            {COMM_ITEMS.map((it) => (
              <li key={it.href}>
                <Link href={it.href} className={itemCls(isActive(it.href))}>
                  <span className="text-[14px] leading-none">{it.icon}</span>
                  <span>{t(it.labelKey, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-[color:var(--tts-border)] px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {(["VI", "EN", "KO"] as const).map((l) => {
              const active = lang === l;
              const flagSrc = l === "VI" ? "/flags/vn.svg" : l === "EN" ? "/flags/us.svg" : "/flags/kr.svg";
              return (
                <button key={l} type="button" onClick={() => changeLang(l)} className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 p-0 ${active ? "border-[color:var(--tts-accent)]" : "border-[color:var(--tts-border)] opacity-60 hover:opacity-100"}`}>
                  <img src={flagSrc} alt={l} className="h-full w-full rounded-full object-cover" />
                </button>
              );
            })}
          </div>
          <button type="button" onClick={toggleTheme} className="rounded border border-[color:var(--tts-border)] px-2 py-1 text-[11px] hover:bg-[color:var(--tts-card-hover)]">{theme === "dark" ? "☀" : "🌙"}</button>
        </div>
        <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); router.replace("/login?portal=1"); }} className="mt-2 w-full rounded border border-[color:var(--tts-border)] px-3 py-1.5 text-[12px] hover:bg-[color:var(--tts-card-hover)]">
          {t("nav.logout", lang)}
        </button>
        <Link href="/login" onClick={async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); }} className="mt-2 block w-full rounded border border-[color:var(--tts-accent)] px-3 py-1.5 text-center text-[11px] text-[color:var(--tts-accent)]">{t("portal.sidebar.staffLogin", lang)}</Link>
      </div>
    </aside>
    </>
  );
}

function SectionTab({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="mt-3 mb-1 flex w-full items-center gap-2 px-3 hover:opacity-80">
      <div className="h-px flex-1 bg-[color:var(--tts-border)]" />
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--tts-muted)]">{label}</div>
      <div className="h-px flex-1 bg-[color:var(--tts-border)]" />
      <span className="text-[10px] text-[color:var(--tts-muted)]">{open ? "▼" : "▶"}</span>
    </button>
  );
}
