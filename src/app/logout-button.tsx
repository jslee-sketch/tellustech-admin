"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

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
      {submitting ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
