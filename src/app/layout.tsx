import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Sidebar } from "@/components/ui";
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
        <div className="flex min-h-full">
          <Sidebar initialLang={initialLang} />
          <div className="flex min-h-full flex-1 flex-col">{children}</div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          if ("serviceWorker" in navigator && location.pathname.startsWith("/portal")) {
            navigator.serviceWorker.register("/sw.js", { scope: "/portal", updateViaCache: "none" }).then((reg) => {
              // 등록 시점에 즉시 업데이트 체크 — 새 SW 가 있으면 다운로드/활성화 유도
              try { reg.update(); } catch (_) {}
            }).catch(() => undefined);
            // 새 SW 가 active 되면 즉시 새로고침해서 새 manifest/리소스 적용
            navigator.serviceWorker.addEventListener("controllerchange", () => {
              if (!window.__tts_reloaded) { window.__tts_reloaded = true; location.reload(); }
            });
          }
          // 화면 회전 잠금 해제 (가능한 브라우저에서) — manifest 가 portrait 였던 경우 잔여 잠금 해제
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
