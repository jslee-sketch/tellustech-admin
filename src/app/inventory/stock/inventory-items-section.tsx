"use client";

import { useMemo, useState } from "react";
import { Badge, Card, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type InvItem = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  serialNumber: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: string;
  status: "NORMAL" | "NEEDS_REPAIR" | "PARTS_USED" | "IRREPARABLE";
  acquiredAt: string | null;
  lastRemark: { date: string; content: string } | null;
  ownerType?: "COMPANY" | "EXTERNAL_CLIENT";
  ownerClientLabel?: string | null;
  inboundReason?: string | null;
};

type Props = {
  initialItems: InvItem[];
  companyName: string;
  lang: Lang;
};

const STATUS_TONE: Record<string, BadgeTone> = {
  NORMAL: "success",
  NEEDS_REPAIR: "warn",
  PARTS_USED: "accent",
  IRREPARABLE: "danger",
};

function statusLabel(s: string, lang: Lang): string {
  switch (s) {
    case "NORMAL": return t("status.invNormal", lang);
    case "NEEDS_REPAIR": return t("status.invNeedsRepair", lang);
    case "PARTS_USED": return t("status.invPartsUsed", lang);
    case "IRREPARABLE": return t("status.invIrreparable", lang);
    default: return s;
  }
}

export function InventoryItemsSection({ initialItems, companyName, lang }: Props) {
  const [items, setItems] = useState<InvItem[]>(initialItems);
  const [q, setQ] = useState("");
  const [whFilter, setWhFilter] = useState<"all" | "INTERNAL" | "EXTERNAL">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null); // groupKey
  const [editing, setEditing] = useState<string | null>(null); // inv item id
  const [newRemark, setNewRemark] = useState("");
  const [newStatus, setNewStatus] = useState<string>("NORMAL");
  const [newStateNote, setNewStateNote] = useState("");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return items.filter((it) => {
      if (whFilter !== "all" && it.warehouseType !== whFilter) return false;
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      if (!qLower) return true;
      return (
        it.serialNumber.toLowerCase().includes(qLower) ||
        it.itemName.toLowerCase().includes(qLower) ||
        it.itemCode.toLowerCase().includes(qLower) ||
        it.warehouseCode.toLowerCase().includes(qLower)
      );
    });
  }, [items, q, whFilter, statusFilter]);

  // 그룹: warehouseId|itemId 별 S/N 묶음
  const grouped = useMemo(() => {
    const m = new Map<string, { warehouse: { code: string; name: string; type: string }; item: { code: string; name: string; type: string }; entries: InvItem[]; }>();
    for (const it of filtered) {
      const k = `${it.warehouseId}|${it.itemId}`;
      const g = m.get(k) ?? {
        warehouse: { code: it.warehouseCode, name: it.warehouseName, type: it.warehouseType },
        item: { code: it.itemCode, name: it.itemName, type: it.itemType },
        entries: [],
      };
      g.entries.push(it);
      m.set(k, g);
    }
    return Array.from(m.entries());
  }, [filtered]);

  async function changeStatus(id: string) {
    const res = await fetch(`/api/inventory/items/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        remarkContent: newRemark || null,
        remarkLang: lang,
        stateNote: newStateNote || null,
      }),
    });
    if (res.ok) {
      const { item } = await res.json();
      setItems((cur) => cur.map((it) => it.id === id ? { ...it, status: item.status, lastRemark: { date: item.remarks?.[0]?.date ?? new Date().toISOString(), content: newRemark || `${t("invItem.statusChange", lang)}${newStatus}` } } : it));
      setEditing(null);
      setNewRemark("");
      setNewStateNote("");
    }
  }

  async function printQR(item: InvItem) {
    const url = `/inventory/labels?itemCode=${encodeURIComponent(item.itemCode)}&sn=${encodeURIComponent(item.serialNumber)}`;
    window.open(url, "_blank");
  }

  return (
    <Card title={`${t("invItem.bySn", lang)} (${filtered.length}${t("invItem.itemsUnit", lang) === "개" ? "" : " "}${t("invItem.itemsUnit", lang)})`} action={
      <ExcelDownload
        rows={filtered}
        columns={[
          { key: "warehouseCode", header: t("col.warehouse", lang) },
          { key: "itemCode", header: t("col.itemCode", lang) },
          { key: "itemName", header: t("col.itemName", lang) },
          { key: "serialNumber", header: t("col.serial", lang) },
          { key: "status", header: t("col.status", lang) },
          { key: "acquiredAt", header: t("field.acquiredAt", lang) },
        ]}
        filename="inventory-items.xlsx"
      />
    }>
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchInv", lang)} />
        <select value={whFilter} onChange={(e) => setWhFilter(e.target.value as "all" | "INTERNAL" | "EXTERNAL")} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px]">
          <option value="all">{t("invItem.allWarehouses", lang)}</option>
          <option value="INTERNAL">Internal</option>
          <option value="EXTERNAL">External</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px]">
          <option value="all">{t("invItem.allStatuses", lang)}</option>
          <option value="NORMAL">{t("status.normalPlain", lang)}</option>
          <option value="NEEDS_REPAIR">{t("status.needsRepair", lang)}</option>
          <option value="PARTS_USED">{t("status.partsUsed", lang)}</option>
          <option value="IRREPARABLE">{t("status.irreparable", lang)}</option>
        </select>
      </div>

      {grouped.length === 0 ? (
        <div className="py-6 text-center text-[12px] text-[color:var(--tts-muted)]">{t("empty.invItems", lang)}</div>
      ) : (
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
              <th className="py-2 text-left">{t("col.warehouse", lang)}</th>
              <th className="py-2 text-left">{t("col.item", lang)}</th>
              <th className="py-2 text-left">{t("field.code", lang)}</th>
              <th className="py-2 text-left">{t("field.kind", lang)}</th>
              <th className="py-2 text-left">{t("field.belongsTo", lang)}</th>
              <th className="py-2 text-right">{t("col.qty", lang)}</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(([key, g]) => {
              const isOpen = expanded === key;
              const owner = g.warehouse.type === "EXTERNAL" ? `(${t("invItem.ownerCustomer", lang)})` : companyName;
              return (
                <>
                  <tr key={key} className="border-b border-[color:var(--tts-border)]/50 cursor-pointer hover:bg-[color:var(--tts-card-hover)]" onClick={() => setExpanded(isOpen ? null : key)}>
                    <td className="py-2 font-mono text-[11px]">{g.warehouse.code}</td>
                    <td className="py-2">{g.item.name}</td>
                    <td className="py-2 font-mono text-[10px] text-[color:var(--tts-muted)]">{g.item.code}</td>
                    <td className="py-2 text-[11px]">{g.item.type}</td>
                    <td className="py-2 text-[11px]">{owner}</td>
                    <td className="py-2 text-right font-mono font-bold">{g.entries.length} {isOpen ? "▼" : "▶"}</td>
                  </tr>
                  {isOpen && (
                    <tr key={`${key}-d`}>
                      <td colSpan={6} className="bg-[color:var(--tts-card-hover)]/50 p-3">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-[color:var(--tts-sub)]">
                              <th className="py-1 text-left">{t("col.serial", lang)}</th>
                              <th className="py-1 text-left">{t("col.status", lang)}</th>
                              <th className="py-1 text-left">{t("col.qrLabel", lang)}</th>
                              <th className="py-1 text-left">{t("field.recentNote", lang)}</th>
                              <th className="py-1 text-left">{t("field.acquiredAt", lang)}</th>
                              <th className="py-1 text-right">{t("field.change", lang)}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.entries.map((e) => (
                              <tr key={e.id} className="border-t border-[color:var(--tts-border)]/30">
                                <td className="py-1 font-mono">
                                  {e.serialNumber}
                                  {e.ownerType === "EXTERNAL_CLIENT" && (
                                    <Badge tone="warn" className="ml-1">🏷 {t("invItem.externalAsset", lang)}</Badge>
                                  )}
                                  {e.ownerType === "EXTERNAL_CLIENT" && e.ownerClientLabel && (
                                    <div className="text-[10px] font-normal text-[color:var(--tts-warn)]">{e.ownerClientLabel}{e.inboundReason ? ` · ${e.inboundReason}` : ""}</div>
                                  )}
                                </td>
                                <td className="py-1"><Badge tone={STATUS_TONE[e.status]}>{statusLabel(e.status, lang)}</Badge></td>
                                <td className="py-1"><button onClick={(ev) => { ev.stopPropagation(); printQR(e); }} className="rounded bg-[color:var(--tts-accent)] px-2 py-0.5 text-white">🏷</button></td>
                                <td className="py-1 text-[color:var(--tts-sub)]">{e.lastRemark ? `${e.lastRemark.date.slice(0, 10)}: ${e.lastRemark.content.slice(0, 50)}` : "—"}</td>
                                <td className="py-1 font-mono text-[10px]">{e.acquiredAt ? e.acquiredAt.slice(0, 10) : "—"}</td>
                                <td className="py-1 text-right">
                                  <button onClick={() => { setEditing(editing === e.id ? null : e.id); setNewStatus(e.status); }} className="text-[color:var(--tts-primary)] hover:underline">{t("btn.statusNote", lang)}</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {editing && g.entries.find((e) => e.id === editing) && (
                          <div className="mt-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-3">
                            <div className="mb-2 text-[11px] font-bold">{t("invItem.changeStatusAddNote", lang)}</div>
                            <div className="flex gap-2">
                              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[11px]">
                                <option value="NORMAL">{t("status.normalPlain", lang)}</option>
                                <option value="NEEDS_REPAIR">{t("status.needsRepair", lang)}</option>
                                <option value="PARTS_USED">{t("status.partsUsed", lang)}</option>
                                <option value="IRREPARABLE">{t("status.irreparable", lang)}</option>
                              </select>
                              <input type="text" value={newRemark} onChange={(e) => setNewRemark(e.target.value)} placeholder={t("placeholder.remarkAuto", lang)} className="flex-1 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[11px]" />
                            </div>
                            <textarea value={newStateNote} onChange={(e) => setNewStateNote(e.target.value)} placeholder={t("invItem.stateNotePh", lang)} rows={2} className="mt-2 w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[11px]" />
                            <div className="mt-2 flex justify-end gap-2">
                              <button onClick={() => changeStatus(editing)} className="rounded bg-[color:var(--tts-primary)] px-3 py-1 text-[11px] font-bold text-white">{t("action.save", lang)}</button>
                              <button onClick={() => setEditing(null)} className="text-[11px] text-[color:var(--tts-sub)]">{t("action.cancel", lang)}</button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}
