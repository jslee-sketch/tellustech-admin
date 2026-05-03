"use client";
import { useEffect, useState } from "react";
import { Button, Field, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Settings = {
  personalEmail: string | null;
  zaloId: string | null;
  notifyEmail: boolean;
  notifyZalo: boolean;
  notifyChat: boolean;
};

export function NotifySettingsClient({ lang }: { lang: Lang }) {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/user/notification-settings").then((r) => r.json()).then((j) => {
      if (j.error) setError(j.error);
      else setS(j.settings);
    });
  }, []);

  async function save() {
    if (!s) return;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/user/notification-settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setBusy(false);
    if (r.ok) setMsg(t("common.save", lang) + " ✓");
    else setMsg(`failed: ${(await r.json())?.error ?? "unknown"}`);
  }

  if (error === "not_employee") return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-[13px] text-amber-700 dark:text-amber-400">
      {t("notify.notEmployee", lang)}
    </div>
  );
  if (!s) return <div className="text-[color:var(--tts-muted)]">…loading</div>;

  return (
    <div className="space-y-4">
      <div className="text-[12px] text-[color:var(--tts-sub)]">{t("notify.settingsHint", lang)}</div>

      <Field label={t("notify.personalEmail", lang)}>
        <TextInput value={s.personalEmail ?? ""} onChange={(e) => setS({ ...s, personalEmail: e.target.value })} placeholder="example@gmail.com" />
      </Field>
      <Field label={t("notify.zaloId", lang)}>
        <TextInput value={s.zaloId ?? ""} onChange={(e) => setS({ ...s, zaloId: e.target.value })} placeholder="0911XXXXXX" />
      </Field>

      <div className="rounded-md border border-[color:var(--tts-border)] p-3">
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={s.notifyEmail} onChange={(e) => setS({ ...s, notifyEmail: e.target.checked })} />
          📧 {t("notify.channel.email", lang)}
        </label>
        <label className="mt-2 flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={s.notifyZalo} onChange={(e) => setS({ ...s, notifyZalo: e.target.checked })} />
          💬 {t("notify.channel.zalo", lang)}
        </label>
        <label className="mt-2 flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={s.notifyChat} onChange={(e) => setS({ ...s, notifyChat: e.target.checked })} />
          💻 {t("notify.channel.chat", lang)}
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={save} disabled={busy}>{busy ? "..." : t("common.save", lang)}</Button>
        {msg && <span className="text-[12px] text-[color:var(--tts-sub)]">{msg}</span>}
      </div>
    </div>
  );
}
