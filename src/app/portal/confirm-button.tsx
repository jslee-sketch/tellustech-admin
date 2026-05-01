"use client";

import { t, type Lang } from "@/lib/i18n";

export function ConfirmButton({ ticketId, lang }: { ticketId: string; lang: Lang }) {
  return (
    <button
      type="button"
      title={t("portal.confirm.btnHint", lang)}
      className="rounded bg-[color:var(--tts-success,#22c55e)] px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90"
      onClick={async () => {
        if (!confirm(t("portal.confirm.confirmPrompt", lang))) return;
        const r = await fetch(`/api/portal/tickets/${ticketId}/confirm`, { method:'POST' });
        if (r.ok) {
          const j = await r.json().catch(() => null);
          if (j?.pointsEarned && j.pointsEarned > 0) {
            const div = document.createElement("div");
            div.textContent = t("portal.confirm.pointsEarned", lang)
              .replace("{n}", j.pointsEarned.toLocaleString("vi-VN"))
              .replace("{b}", (j.pointBalance ?? 0).toLocaleString("vi-VN"));
            div.style.cssText = "position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 20px;border-radius:8px;font-weight:bold;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2)";
            document.body.appendChild(div);
            setTimeout(() => div.remove(), 4000);
          }
          setTimeout(() => location.reload(), 200);
        }
        else alert(t("portal.confirm.failed", lang));
      }}
    >
      {t("portal.confirm.btn", lang)}
    </button>
  );
}
