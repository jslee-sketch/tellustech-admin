"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

export default function LogoutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [lang, setLang] = useState<Lang>("KO");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      const l = d?.user?.language;
      if (l === "VI" || l === "EN" || l === "KO") setLang(l);
    }).catch(() => undefined);
  }, []);

  async function handleLogout() {
    setSubmitting(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={submitting}
      className="rounded-md border border-[color:var(--tts-border)] bg-transparent px-4 py-2 text-[12px] font-semibold text-[color:var(--tts-sub)] hover:text-[color:var(--tts-text)] disabled:opacity-60"
    >
      {submitting ? t("auth.loggingOut", lang) : t("auth.logout", lang)}
    </button>
  );
}
