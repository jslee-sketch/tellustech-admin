"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Banner = { id: string; slot: string; textVi: string; textEn: string; textKo: string; linkUrl: string; isActive: boolean };

export function BannersClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<Banner[]>([]);
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function refetch() {
    const r = await fetch("/api/admin/portal-banners", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function save(slot: string, b: Banner) {
    setSavingSlot(slot); setMsg(null);
    try {
      const r = await fetch(`/api/admin/portal-banners/${slot}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(b) });
      if (r.ok) { setMsg(`${slot}: ${t("common.saved", lang)}`); refetch(); }
      else setMsg("error");
    } finally { setSavingSlot(null); }
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-extrabold">📣 {t("admin.banners.title", lang)}</h1>
        {items.map((b, idx) => (
          <div key={b.slot} className="mb-4">
            <Card title={`Slot: ${b.slot}`}>
              <div className="grid grid-cols-1 gap-2">
                <div><label className="text-[11px] text-[color:var(--tts-muted)]">KO</label><input value={b.textKo} onChange={(e) => setItems([...items.slice(0, idx), { ...b, textKo: e.target.value }, ...items.slice(idx + 1)])} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" /></div>
                <div><label className="text-[11px] text-[color:var(--tts-muted)]">VI</label><input value={b.textVi} onChange={(e) => setItems([...items.slice(0, idx), { ...b, textVi: e.target.value }, ...items.slice(idx + 1)])} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" /></div>
                <div><label className="text-[11px] text-[color:var(--tts-muted)]">EN</label><input value={b.textEn} onChange={(e) => setItems([...items.slice(0, idx), { ...b, textEn: e.target.value }, ...items.slice(idx + 1)])} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" /></div>
                <div><label className="text-[11px] text-[color:var(--tts-muted)]">{t("admin.banners.linkUrl", lang)}</label><input value={b.linkUrl} onChange={(e) => setItems([...items.slice(0, idx), { ...b, linkUrl: e.target.value }, ...items.slice(idx + 1)])} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" /></div>
                <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={b.isActive} onChange={(e) => setItems([...items.slice(0, idx), { ...b, isActive: e.target.checked }, ...items.slice(idx + 1)])} /> {t("admin.banners.active", lang)}</label>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => save(b.slot, b)} disabled={savingSlot === b.slot} className="rounded bg-[color:var(--tts-accent)] px-4 py-1.5 text-[12px] font-bold text-white">{savingSlot === b.slot ? "..." : t("common.save", lang)}</button>
              </div>
            </Card>
          </div>
        ))}
        {msg && <div className="text-[12px] text-[color:var(--tts-success)]">{msg}</div>}
      </div>
    </main>
  );
}
