"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

// 고객 포탈 사이드바 — 3그룹 (OA / TM / 소통하기) + 배너 + 포인트 + 언어/테마.
// 사내 사이드바와 분리. 톤은 좀 더 친근(밝은 강조).

type Banner = { slot: string; text: string; linkUrl: string };

type NavItem = { href: string; labelKey: string; icon?: string; comingSoon?: boolean };

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
  { href: "/portal/quotes", labelKey: "portal.sidebar.quoteRequest", icon: "💬", comingSoon: true },
  { href: "/portal/referrals", labelKey: "portal.sidebar.referral", icon: "🤝", comingSoon: true },
  { href: "/portal/feedback", labelKey: "portal.sidebar.feedback", icon: "🌟", comingSoon: true },
  { href: "/portal/posts", labelKey: "portal.sidebar.posts", icon: "📰", comingSoon: true },
  { href: "/portal/surveys", labelKey: "portal.sidebar.surveys", icon: "📊", comingSoon: true },
];

export function PortalSidebar({ initialLang = "KO", clientName }: { initialLang?: Lang; clientName: string }) {
  const pathname = usePathname() ?? "/portal";
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(initialLang);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [balance, setBalance] = useState<number>(0);
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    fetch("/api/portal/points", { credentials: "same-origin" }).then((r) => r.json()).then((j) => {
      if (typeof j?.balance === "number") setBalance(j.balance);
    }).catch(() => undefined);
    fetch("/api/portal/banners", { credentials: "same-origin" }).then((r) => r.json()).then((j) => {
      if (Array.isArray(j?.banners)) setBanners(j.banners);
    }).catch(() => undefined);
    if (typeof document !== "undefined") {
      const cur = document.documentElement.classList.contains("dark") ? "dark" : "light";
      setTheme(cur);
    }
  }, []);

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

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[color:var(--tts-border)] bg-[color:var(--tts-card)] md:flex">
      <div className="px-4 py-4">
        <Link href="/portal" className="block text-[11px] font-bold tracking-[0.18em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH PORTAL</Link>
        <div className="mt-1 truncate text-[14px] font-bold">{clientName}</div>
        <Link href="/portal/points" className="mt-2 inline-flex items-center gap-1 text-[12px] font-mono text-[color:var(--tts-warn)] hover:underline">🏆 {new Intl.NumberFormat("vi-VN").format(balance)}d</Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <SectionHeader>{t("portal.sidebar.oaDivision", lang)}</SectionHeader>
        {oaBanner && (
          <a href={oaBanner.linkUrl} target="_blank" rel="noopener noreferrer" className="mx-1 mb-1 block rounded-md bg-[color:var(--tts-primary-dim)] px-2 py-1.5 text-[11px] font-medium text-[color:var(--tts-primary)] hover:opacity-90" title={oaBanner.text}>📠 {oaBanner.text}</a>
        )}
        <ul className="space-y-0.5">
          {OA_ITEMS.map((it) => (
            <li key={it.href}><Link href={it.href} className={itemCls(isActive(it.href))}>{t(it.labelKey, lang)}</Link></li>
          ))}
        </ul>

        <SectionHeader>{t("portal.sidebar.tmDivision", lang)}</SectionHeader>
        {tmBanner && (
          <a href={tmBanner.linkUrl} target="_blank" rel="noopener noreferrer" className="mx-1 mb-1 block rounded-md bg-[color:var(--tts-primary-dim)] px-2 py-1.5 text-[11px] font-medium text-[color:var(--tts-primary)] hover:opacity-90" title={tmBanner.text}>🔬 {tmBanner.text}</a>
        )}
        <ul className="space-y-0.5">
          {TM_ITEMS.map((it) => (
            <li key={it.href}><Link href={it.href} className={itemCls(isActive(it.href))}>{t(it.labelKey, lang)}</Link></li>
          ))}
        </ul>

        <SectionHeader>{t("portal.sidebar.communication", lang)}</SectionHeader>
        <ul className="space-y-0.5">
          {COMM_ITEMS.map((it) => (
            <li key={it.href}>
              <Link href={it.href} className={itemCls(isActive(it.href))}>
                <span className="text-[14px] leading-none">{it.icon}</span>
                <span>{t(it.labelKey, lang)}</span>
                {it.comingSoon && <span className="ml-auto rounded bg-[color:var(--tts-border)] px-1.5 py-0.5 text-[9px] font-bold text-[color:var(--tts-muted)]">soon</span>}
              </Link>
            </li>
          ))}
        </ul>
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
      </div>
    </aside>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 mb-1 flex items-center gap-2 px-3">
      <div className="h-px flex-1 bg-[color:var(--tts-border)]" />
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--tts-muted)]">{children}</div>
      <div className="h-px flex-1 bg-[color:var(--tts-border)]" />
    </div>
  );
}
