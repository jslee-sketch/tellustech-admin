"use client";
import { useEffect, useState } from "react";

// 오프라인 감지 + 마지막 동기화 시각 표시 + PWA 설치 프롬프트.
// SW 가 등록된 컨텍스트 (root + /portal)에서만 의미 있음.
export function OfflineBanner({ lang = "KO" }: { lang?: "KO" | "VI" | "EN" }) {
  const [online, setOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  // beforeinstallprompt 이벤트
  const [installEvent, setInstallEvent] = useState<{ prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    function handleOnline() {
      setOnline(true);
      setLastSync(new Date());
      // 자동 새로고침 (SW 가 stale 페이지 갱신)
      setTimeout(() => { try { location.reload(); } catch { /* ignore */ } }, 500);
    }
    function handleOffline() { setOnline(false); }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 설치 프롬프트 캡처
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallEvent(e as unknown as { prompt: () => void; userChoice: Promise<{ outcome: string }> });
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", () => setInstalled(true));

    // 정상 응답 받을 때마다 lastSync 갱신
    const id = setInterval(() => { if (navigator.onLine) setLastSync(new Date()); }, 60000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearInterval(id);
    };
  }, []);

  const labels = {
    KO: { offline: "오프라인 모드", lastSync: "마지막 동기화", install: "📲 앱 설치" },
    VI: { offline: "Chế độ offline", lastSync: "Đồng bộ gần nhất", install: "📲 Cài đặt ứng dụng" },
    EN: { offline: "Offline mode", lastSync: "Last sync", install: "📲 Install app" },
  }[lang];

  if (!online) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 px-4 py-2 text-center text-[12px] font-bold text-white shadow-lg">
        ⚠ {labels.offline} — {labels.lastSync}: {lastSync.toLocaleTimeString(lang === "KO" ? "ko-KR" : lang === "VI" ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit" })}
      </div>
    );
  }

  if (installEvent && !installed) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] px-4 py-2 shadow-lg">
        <button
          onClick={() => { installEvent.prompt(); installEvent.userChoice.then(() => setInstallEvent(null)); }}
          className="text-[12px] font-bold text-[color:var(--tts-primary)]"
        >{labels.install}</button>
        <button onClick={() => setInstallEvent(null)} className="text-[14px] text-[color:var(--tts-muted)]">×</button>
      </div>
    );
  }

  return null;
}
