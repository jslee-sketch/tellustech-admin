import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Sidebar } from "@/components/ui";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { SESSION_HEADER_USER, type SessionPayload } from "@/lib/auth";
import type { Lang } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tellustech ERP",
  description: "Tellustech Vina / Vietrental — ERP",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TTS Portal" },
  themeColor: "#5b9bd5",
};

// SSR 시점에 미들웨어가 주입한 세션 헤더에서 언어를 꺼내 Sidebar 의 초기값으로 전달.
// 그래야 클라이언트 hydration 전에 이미 올바른 언어로 렌더링되어 깜빡임이 사라진다.
async function getInitialLang(): Promise<Lang> {
  try {
    const h = await headers();
    const raw = h.get(SESSION_HEADER_USER);
    if (!raw) return "KO";
    const s = JSON.parse(raw) as SessionPayload;
    return s.language;
  } catch {
    return "KO";
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLang = await getInitialLang();
  return (
    <html
      lang={initialLang.toLowerCase()}
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-tts-bg text-tts-text">
        <OfflineBanner lang={initialLang} />
        <div className="flex min-h-full">
          <Sidebar initialLang={initialLang} />
          <div className="flex min-h-full flex-1 flex-col">{children}</div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          if ("serviceWorker" in navigator) {
            var isPortal = location.pathname.startsWith("/portal");
            var isLogin = location.pathname.startsWith("/login");
            if (isPortal) {
              navigator.serviceWorker.register("/sw.js", { scope: "/portal", updateViaCache: "none" }).then((reg) => {
                try { reg.update(); } catch (_) {}
              }).catch(() => undefined);
            } else if (!isLogin) {
              // ERP 본체 — root scope SW. 인증 필요한 화면이라 로그인 페이지는 제외.
              navigator.serviceWorker.register("/sw-erp.js", { scope: "/", updateViaCache: "none" }).then((reg) => {
                try { reg.update(); } catch (_) {}
              }).catch(() => undefined);
            }
            navigator.serviceWorker.addEventListener("controllerchange", () => {
              if (!window.__tts_reloaded) { window.__tts_reloaded = true; location.reload(); }
            });
          }
          try {
            if (screen.orientation && typeof screen.orientation.unlock === "function") {
              screen.orientation.unlock();
            }
          } catch (_) {}
        `}} />
      </body>
    </html>
  );
}
