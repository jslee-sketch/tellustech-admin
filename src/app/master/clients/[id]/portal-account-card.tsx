"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Note } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type PortalUser = {
  id: string;
  username: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
};

export function PortalAccountCard({
  clientId,
  clientCode,
  portalUser,
  lang,
}: {
  clientId: string;
  clientCode: string;
  portalUser: PortalUser | null;
  lang: Lang;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function issue() {
    if (!window.confirm(t("portalAcc.issueConfirm", lang).replace("{code}", clientCode))) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/clients/${clientId}/portal-account`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) { setMsg(`${t("portalAcc.issueFailed", lang)}: ${j?.error}`); return; }
      setMsg(t("portalAcc.issued", lang).replace("{code}", clientCode));
      router.refresh();
    } finally { setBusy(false); }
  }

  async function reset() {
    if (!window.confirm(t("portalAcc.resetConfirm", lang))) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/clients/${clientId}/portal-account`, {
        method: "PATCH", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ action: "reset_password" }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(`${t("portalAcc.resetFailed", lang)}: ${j?.error}`); return; }
      setMsg(t("portalAcc.resetTo", lang).replace("{pw}", j.resetTo));
      router.refresh();
    } finally { setBusy(false); }
  }

  async function toggleActive() {
    setBusy(true);
    try {
      await fetch(`/api/admin/clients/${clientId}/portal-account`, {
        method: "PATCH", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ action: "toggle_active" }),
      });
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <Card title={`🔐 ${t("portalAcc.cardTitle", lang)}`}>
      {!portalUser ? (
        <>
          <Note tone="warn">{t("portalAcc.noAccount", lang)}</Note>
          <div className="mt-3">
            <Button onClick={issue} disabled={busy} variant="accent">
              {busy ? "..." : t("portalAcc.issueBtn", lang).replace("{code}", clientCode)}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <div className="text-[10px] font-bold text-[color:var(--tts-muted)]">{t("portalAcc.username", lang)}</div>
              <div className="font-mono text-[14px] text-[color:var(--tts-primary)]">{portalUser.username}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[color:var(--tts-muted)]">{t("portalAcc.status", lang)}</div>
              <div>
                {portalUser.isActive
                  ? <span className="text-[color:var(--tts-success)] font-bold">{t("portalAcc.active", lang)}</span>
                  : <span className="text-[color:var(--tts-danger)] font-bold">{t("portalAcc.inactive", lang)}</span>}
                {portalUser.mustChangePassword && <span className="ml-2 text-[10px] text-[color:var(--tts-warn)]">⚠️ {t("portalAcc.defaultPw", lang)}</span>}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[color:var(--tts-muted)]">{t("portalAcc.lastLogin", lang)}</div>
              <div>{portalUser.lastLoginAt ? new Date(portalUser.lastLoginAt).toLocaleString("vi-VN") : "—"}</div>
            </div>
          </div>
          <Note tone="info">
            {t("portalAcc.howTo", lang)}
            <br />
            <span className="font-mono text-[11px]">URL: <span className="text-[color:var(--tts-primary)]">/login</span> · ID: <span className="text-[color:var(--tts-primary)]">{portalUser.username}</span> · PW (default): <span className="text-[color:var(--tts-primary)]">1234</span></span>
          </Note>
          <div className="mt-3 flex gap-2">
            <Button onClick={reset} disabled={busy}>{busy ? "..." : `🔑 ${t("portalAcc.resetBtn", lang)}`}</Button>
            <Button variant="ghost" onClick={toggleActive} disabled={busy}>
              {portalUser.isActive ? `🚫 ${t("portalAcc.deactivate", lang)}` : `✅ ${t("portalAcc.activate", lang)}`}
            </Button>
          </div>
          {msg && <div className="mt-2 rounded bg-[color:var(--tts-success-dim)] px-2 py-1 text-[11px] text-[color:var(--tts-success)]">{msg}</div>}
        </>
      )}
    </Card>
  );
}
