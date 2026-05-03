"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Rule = {
  id: string;
  eventType: string;
  targetType: string;
  targetRoleId: string | null;
  channelEmail: boolean;
  channelZalo: boolean;
  channelChat: boolean;
  isActive: boolean;
  companyCode: string;
  templateKo: string;
  templateVi: string;
  templateEn: string;
};

export function NotificationRulesClient({ rules, lang }: { rules: Rule[]; lang: Lang }) {
  const [filterCompany, setFilterCompany] = useState<string>("ALL");
  const [filterChannel, setFilterChannel] = useState<string>("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Rule>>({});

  async function toggle(id: string, key: "channelEmail" | "channelZalo" | "channelChat" | "isActive", value: boolean) {
    const r = await fetch("/api/admin/notification-rules", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [key]: value }),
    });
    if (r.ok) location.reload();
    else alert(`failed: ${(await r.json())?.error ?? "unknown"}`);
  }

  async function saveTemplate(id: string) {
    const r = await fetch("/api/admin/notification-rules", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, templateKo: editForm.templateKo, templateVi: editForm.templateVi, templateEn: editForm.templateEn }),
    });
    if (r.ok) { setEditingId(null); location.reload(); }
    else alert(`failed: ${(await r.json())?.error ?? "unknown"}`);
  }

  const visible = rules.filter((r) => {
    if (filterCompany !== "ALL" && r.companyCode !== filterCompany) return false;
    if (filterChannel === "EMAIL" && !r.channelEmail) return false;
    if (filterChannel === "ZALO" && !r.channelZalo) return false;
    if (filterChannel === "CHAT" && !r.channelChat) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]">
          <option value="ALL">{t("common.all", lang)}</option>
          <option value="TV">TV</option>
          <option value="VR">VR</option>
        </select>
        <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]">
          <option value="ALL">{t("common.all", lang)}</option>
          <option value="EMAIL">Email</option>
          <option value="ZALO">Zalo</option>
          <option value="CHAT">Chat</option>
        </select>
        <span className="ml-auto text-[12px] text-[color:var(--tts-sub)]">{visible.length} / {rules.length}</span>
      </div>

      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
          <tr>
            <th className="py-2 text-left">{t("notify.event", lang)}</th>
            <th className="text-left">{t("notify.target", lang)}</th>
            <th className="text-center">📧</th>
            <th className="text-center">💬</th>
            <th className="text-center">💻</th>
            <th className="text-center">{t("common.status", lang)}</th>
            <th className="text-center">Co.</th>
            <th className="text-center">{t("common.actions", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <>
              <tr key={r.id} className="border-b border-[color:var(--tts-border)]/40">
                <td className="py-1.5 font-mono text-[10px]">{r.eventType}</td>
                <td className="text-[11px]">{r.targetType}{r.targetRoleId ? `:${r.targetRoleId}` : ""}</td>
                <td className="text-center">
                  <input type="checkbox" checked={r.channelEmail} onChange={(e) => toggle(r.id, "channelEmail", e.target.checked)} />
                </td>
                <td className="text-center">
                  <input type="checkbox" checked={r.channelZalo} onChange={(e) => toggle(r.id, "channelZalo", e.target.checked)} />
                </td>
                <td className="text-center">
                  <input type="checkbox" checked={r.channelChat} onChange={(e) => toggle(r.id, "channelChat", e.target.checked)} />
                </td>
                <td className="text-center">
                  <input type="checkbox" checked={r.isActive} onChange={(e) => toggle(r.id, "isActive", e.target.checked)} />
                </td>
                <td className="text-center font-mono text-[10px]">{r.companyCode}</td>
                <td className="text-center">
                  <Button variant="ghost" onClick={() => {
                    if (editingId === r.id) { setEditingId(null); }
                    else { setEditingId(r.id); setEditForm({ templateKo: r.templateKo, templateVi: r.templateVi, templateEn: r.templateEn }); }
                  }}>{editingId === r.id ? t("common.cancel", lang) : t("common.edit", lang)}</Button>
                </td>
              </tr>
              {editingId === r.id && (
                <tr key={`${r.id}-edit`} className="border-b border-[color:var(--tts-border)]/40 bg-[color:var(--tts-bg)]/40">
                  <td colSpan={8} className="px-3 py-2">
                    <div className="grid grid-cols-3 gap-2">
                      <textarea value={editForm.templateKo ?? ""} onChange={(e) => setEditForm({ ...editForm, templateKo: e.target.value })} rows={4} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] p-2 text-[11px]" placeholder="KO template" />
                      <textarea value={editForm.templateVi ?? ""} onChange={(e) => setEditForm({ ...editForm, templateVi: e.target.value })} rows={4} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] p-2 text-[11px]" placeholder="VI template" />
                      <textarea value={editForm.templateEn ?? ""} onChange={(e) => setEditForm({ ...editForm, templateEn: e.target.value })} rows={4} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] p-2 text-[11px]" placeholder="EN template" />
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button variant="primary" onClick={() => saveTemplate(r.id)}>{t("common.save", lang)}</Button>
                    </div>
                    <div className="mt-1 text-[10px] text-[color:var(--tts-muted)]">{t("notify.templateHint", lang)}</div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
