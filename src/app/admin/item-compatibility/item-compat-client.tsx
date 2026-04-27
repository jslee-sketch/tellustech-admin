"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Select, Badge } from "@/components/ui";

type Item = { id: string; itemCode: string; name: string; itemType: string; category: string|null };
type Compat = { id: string; productItemId: string; consumableItemId: string; product: Item; consumable: Item };

export function ItemCompatClient({ items }: { items: Item[] }) {
  const products = useMemo(() => items.filter(i => i.itemType === "PRODUCT"), [items]);
  const consumables = useMemo(() => items.filter(i => i.itemType === "CONSUMABLE" || i.itemType === "PART"), [items]);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [list, setList] = useState<Compat[]>([]);
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(pid: string) {
    if (!pid) return;
    const r = await fetch(`/api/admin/item-compatibility?productItemId=${pid}`).then(r => r.json());
    setList(r?.compatibilities ?? []);
  }
  useEffect(() => { load(productId); }, [productId]);

  async function add() {
    if (!productId || !adding) return;
    setBusy(true);
    try {
      await fetch('/api/admin/item-compatibility', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ productItemId: productId, consumableItemId: adding }),
      });
      setAdding("");
      await load(productId);
    } finally { setBusy(false); }
  }
  async function remove(consId: string) {
    if (!confirm("이 매핑 제거?")) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/item-compatibility?productItemId=${productId}&consumableItemId=${consId}`, { method:'DELETE' });
      await load(productId);
    } finally { setBusy(false); }
  }

  const usedIds = new Set(list.map(c => c.consumableItemId));
  const candidates = consumables.filter(c => !usedIds.has(c.id));

  return (
    <div className="grid grid-cols-12 gap-4">
      <Card title="본체 장비 선택 / Chọn thiết bị" className="col-span-4">
        <Field label="장비 (PRODUCT)" required>
          <Select value={productId} onChange={(e)=>setProductId(e.target.value)}
            options={products.map(p => ({ value: p.id, label: `${p.itemCode} · ${p.name}` }))} />
        </Field>
      </Card>

      <Card title={`호환 소모품/부품 (${list.length})`} className="col-span-8">
        <div className="mb-3 flex items-end gap-2">
          <div className="flex-1">
            <Field label="추가할 소모품/부품 / Thêm vật tư">
              <Select value={adding} onChange={(e)=>setAdding(e.target.value)}
                options={[
                  { value:"", label:"선택 / Chọn" },
                  ...candidates.map(c => ({ value: c.id, label: `[${c.itemType}] ${c.itemCode} · ${c.name}${c.category ? ` (${c.category})` : ""}` })),
                ]} />
            </Field>
          </div>
          <Button onClick={add} disabled={!adding || busy}>+ 추가 / Thêm</Button>
        </div>

        {list.length === 0 ? (
          <div className="text-[12px] text-[color:var(--tts-sub)]">아직 매핑 없음 — 위에서 추가</div>
        ) : (
          <ul className="space-y-1.5">
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded border border-[color:var(--tts-border)] px-3 py-2 text-[13px]">
                <span>
                  <Badge tone={c.consumable.itemType === "CONSUMABLE" ? "primary" : "accent"}>{c.consumable.itemType}</Badge>
                  <span className="ml-2 font-mono">{c.consumable.itemCode}</span>
                  <span className="ml-2">{c.consumable.name}</span>
                  {c.consumable.category && <span className="ml-2 text-[11px] text-[color:var(--tts-muted)]">[{c.consumable.category}]</span>}
                </span>
                <Button size="sm" variant="ghost" onClick={()=>remove(c.consumableItemId)} disabled={busy}>제거</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
