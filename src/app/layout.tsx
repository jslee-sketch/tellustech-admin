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
            navigator.serviceWorker.register("/sw.js", { scope: "/portal" }).catch(() => undefined);
          }
        `}} />
      </body>
    </html>
  );
}
