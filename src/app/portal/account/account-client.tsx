"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export function AccountClient({ lang }: { lang: Lang }) {
  const [me, setMe] = useState<any>(null);
  const [cur, setCur] = useState("");
  const [next1, setNext1] = useState("");
  const [next2, setNext2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function refetch() {
    const r = await fetch("/api/portal/account", { credentials: "same-origin" });
    const j = await r.json();
    setMe(j?.user ?? null);
  }
  useEffect(() => { refetch(); }, []);

  async function submit() {
    setMsg(null);
    if (next1 !== next2) { setMsg({ kind: "error", text: t("portal.acc.pwMismatch", lang) }); return; }
    if (next1.length < 4) { setMsg({ kind: "error", text: t("portal.acc.pwTooShort", lang) }); return; }
    setSubmitting(true);
    try {
      const r = await fetch("/api/portal/account/password", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ currentPassword: cur, newPassword: next1 }),
      });
      const j = await r.json();
      if (!r.ok) {
        const errMap: Record<string, string> = {
          wrong_current_password: t("portal.acc.wrongCurrent", lang),
          password_too_short: t("portal.acc.pwTooShort", lang),
          same_as_current: t("portal.acc.sameAsCurrent", lang),
        };
        setMsg({ kind: "error", text: errMap[j?.error] ?? j?.error ?? t("portal.acc.changeFailed", lang) });
        return;
      }
      setMsg({ kind: "success", text: t("portal.acc.changed", lang) });
      setCur(""); setNext1(""); setNext2("");
      refetch();
    } finally { setSubmitting(false); }
  }

  if (!me) return <div className="p-8 text-[color:var(--tts-muted)]">{t("portal.acc.loading", lang)}</div>;

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-2xl font-extrabold">{t("portal.acc.title", lang)}</h1>

        <Card title={t("portal.acc.infoCard", lang)}>
          <div className="space-y-1 text-[13px]">
            <div><span className="text-[color:var(--tts-muted)]">{t("portal.acc.client", lang)}:</span> <span className="font-bold">{me.clientAccount?.companyNameKo ?? me.clientAccount?.companyNameVi}</span> <span className="text-[color:var(--tts-muted)]">({me.clientAccount?.clientCode})</span></div>
            <div><span className="text-[color:var(--tts-muted)]">{t("portal.acc.portalId", lang)}:</span> <span className="font-mono">{me.username}</span></div>
            <div><span className="text-[color:var(--tts-muted)]">{t("portal.acc.statusLabel", lang)}:</span> {me.isActive ? <span className="text-[color:var(--tts-success)]">{t("portal.acc.active", lang)}</span> : <span className="text-[color:var(--tts-danger)]">{t("portal.acc.inactive", lang)}</span>}</div>
            <div><span className="text-[color:var(--tts-muted)]">{t("portal.acc.lastLogin", lang)}:</span> {me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString(lang === "VI" ? "vi-VN" : lang === "EN" ? "en-US" : "ko-KR") : "—"}</div>
          </div>
        </Card>

        <div className="mt-4">
          <Card title={t("portal.acc.changeCard", lang)}>
            {me.mustChangePassword && (
              <div className="mb-3 rounded bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[13px] font-bold text-[color:var(--tts-danger)]">
                {t("portal.acc.mustChangeNow", lang)}
              </div>
            )}
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-bold text-[color:var(--tts-muted)]">{t("portal.acc.currentPw", lang)}</label>
                <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[color:var(--tts-muted)]">{t("portal.acc.newPw", lang)}</label>
                <input type="password" value={next1} onChange={(e) => setNext1(e.target.value)} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[color:var(--tts-muted)]">{t("portal.acc.newPwConfirm", lang)}</label>
                <input type="password" value={next2} onChange={(e) => setNext2(e.target.value)} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
              </div>
            </div>
            {msg && <div className={`mt-2 rounded px-3 py-2 text-[12px] ${msg.kind === "success" ? "bg-[color:var(--tts-success-dim)] text-[color:var(--tts-success)]" : "bg-[color:var(--tts-danger-dim)] text-[color:var(--tts-danger)]"}`}>{msg.text}</div>}
            <div className="mt-3">
              <button onClick={submit} disabled={submitting || !cur || !next1 || !next2} className="rounded bg-[color:var(--tts-accent)] px-4 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">{submitting ? t("portal.acc.changing", lang) : t("portal.acc.submitBtn", lang)}</button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
