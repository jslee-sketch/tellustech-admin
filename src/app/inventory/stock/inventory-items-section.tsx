"use client";

import { useMemo, useState } from "react";
import { Badge, Card, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";

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
};

type Props = {
  initialItems: InvItem[];
  companyName: string;
};

const STATUS_TONE: Record<string, BadgeTone> = {
  NORMAL: "success",
  NEEDS_REPAIR: "warn",
  PARTS_USED: "accent",
  IRREPARABLE: "danger",
};
const STATUS_KO: Record<string, string> = {
  NORMAL: "🟢 정상",
  NEEDS_REPAIR: "🟡 수리필요",
  PARTS_USED: "🟣 부품사용",
  IRREPARABLE: "🔴 수리불가",
};

export function InventoryItemsSection({ initialItems, companyName }: Props) {
  const [items, setItems] = useState<InvItem[]>(initialItems);
  const [q, setQ] = useState("");
  const [whFilter, setWhFilter] = useState<"all" | "INTERNAL" | "EXTERNAL">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null); // groupKey
  const [editing, setEditing] = useState<string | null>(null); // inv item id
  const [newRemark, setNewRemark] = useState("");
  const [newStatus, setNewStatus] = useState<string>("NORMAL");

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
      body: JSON.stringify({ status: newStatus, remarkContent: newRemark || null, remarkLang: "KO" }),
    });
    if (res.ok) {
      const { item } = await res.json();
      setItems((cur) => cur.map((it) => it.id === id ? { ...it, status: item.status, lastRemark: { date: item.remarks?.[0]?.date ?? new Date().toISOString(), content: newRemark || `상태 변경 → ${newStatus}` } } : it));
      setEditing(null);
      setNewRemark("");
    }
  }

  async function printQR(item: InvItem) {
    const url = `/inventory/labels?itemCode=${encodeURIComponent(item.itemCode)}&sn=${encodeURIComponent(item.serialNumber)}`;
    window.open(url, "_blank");
  }

  return (
    <Card title={`S/N별 재고 (${filtered.length}개)`} action={
      <ExcelDownload
        rows={filtered}
        columns={[
          { key: "warehouseCode", header: "창고" },
          { key: "itemCode", header: "품목코드" },
          { key: "itemName", header: "품목명" },
          { key: "serialNumber", header: "S/N" },
          { key: "status", header: "상태" },
          { key: "acquiredAt", header: "입고일" },
        ]}
        filename="inventory-items.xlsx"
      />
    }>
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="창고/품목/S/N 검색..." />
        <select value={whFilter} onChange={(e) => setWhFilter(e.target.value as "all" | "INTERNAL" | "EXTERNAL")} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px]">
          <option value="all">전체 창고</option>
          <option value="INTERNAL">Internal</option>
          <option value="EXTERNAL">External</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px]">
          <option value="all">전체 상태</option>
          <option value="NORMAL">정상</option>
          <option value="NEEDS_REPAIR">수리필요</option>
          <option value="PARTS_USED">부품사용</option>
          <option value="IRREPARABLE">수리불가</option>
        </select>
      </div>

      {grouped.length === 0 ? (
        <div className="py-6 text-center text-[12px] text-[color:var(--tts-muted)]">등록된 S/N 재고가 없습니다.</div>
      ) : (
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
              <th className="py-2 text-left">창고</th>
              <th className="py-2 text-left">품목</th>
              <th className="py-2 text-left">코드</th>
              <th className="py-2 text-left">구분</th>
              <th className="py-2 text-left">소속</th>
              <th className="py-2 text-right">수량</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(([key, g]) => {
              const isOpen = expanded === key;
              const owner = g.warehouse.type === "EXTERNAL" ? "(고객)" : companyName;
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
                              <th className="py-1 text-left">S/N</th>
                              <th className="py-1 text-left">상태</th>
                              <th className="py-1 text-left">QR</th>
                              <th className="py-1 text-left">최근 비고</th>
                              <th className="py-1 text-left">입고일</th>
                              <th className="py-1 text-right">변경</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.entries.map((e) => (
                              <tr key={e.id} className="border-t border-[color:var(--tts-border)]/30">
                                <td className="py-1 font-mono">{e.serialNumber}</td>
                                <td className="py-1"><Badge tone={STATUS_TONE[e.status]}>{STATUS_KO[e.status]}</Badge></td>
                                <td className="py-1"><button onClick={(ev) => { ev.stopPropagation(); printQR(e); }} className="rounded bg-[color:var(--tts-accent)] px-2 py-0.5 text-white">🏷</button></td>
                                <td className="py-1 text-[color:var(--tts-sub)]">{e.lastRemark ? `${e.lastRemark.date.slice(0, 10)}: ${e.lastRemark.content.slice(0, 50)}` : "—"}</td>
                                <td className="py-1 font-mono text-[10px]">{e.acquiredAt ? e.acquiredAt.slice(0, 10) : "—"}</td>
                                <td className="py-1 text-right">
                                  <button onClick={() => { setEditing(editing === e.id ? null : e.id); setNewStatus(e.status); }} className="text-[color:var(--tts-primary)] hover:underline">상태/비고</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {editing && g.entries.find((e) => e.id === editing) && (
                          <div className="mt-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-3">
                            <div className="mb-2 text-[11px] font-bold">상태 변경 + 비고 추가</div>
                            <div className="flex gap-2">
                              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[11px]">
                                <option value="NORMAL">정상</option>
                                <option value="NEEDS_REPAIR">수리필요</option>
                                <option value="PARTS_USED">부품사용</option>
                                <option value="IRREPARABLE">수리불가</option>
                              </select>
                              <input type="text" value={newRemark} onChange={(e) => setNewRemark(e.target.value)} placeholder="비고 (한국어 입력 → 자동번역)" className="flex-1 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[11px]" />
                              <button onClick={() => changeStatus(editing)} className="rounded bg-[color:var(--tts-primary)] px-3 py-1 text-[11px] font-bold text-white">저장</button>
                              <button onClick={() => setEditing(null)} className="text-[11px] text-[color:var(--tts-sub)]">취소</button>
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
