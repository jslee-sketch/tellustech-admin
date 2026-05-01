"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Field, ItemCombobox, Note, Row, Select, SerialCombobox, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Part = {
  id: string;
  itemCode: string;
  itemName: string;
  serialNumber: string | null;
  quantity: number;
  targetEquipmentSN: string;
  unitCost: number | null;
  totalCost: number | null;
  note: string | null;
};
type Props = {
  dispatchId: string;
  initialParts: Part[];
  defaultEquipmentSN: string;
  warehouses: { id: string; code: string; name: string }[];
  items: { id: string; itemCode: string; name: string; itemType: string }[];
  transportCost: number;
  lang: Lang;
};

const fmt = (n: number | null) => (n === null ? "-" : Number(n).toLocaleString("vi-VN"));

export function DispatchPartsSection({ dispatchId, initialParts, defaultEquipmentSN, warehouses, items, transportCost, lang }: Props) {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>(initialParts);
  const [equipmentSN, setEquipmentSN] = useState(defaultEquipmentSN);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [itemId, setItemId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // BOM 자식 — itemId 가 A'ssy 일 때 표시.
  const [bomTree, setBomTree] = useState<{ item: { id: string; itemCode: string; name: string; bomLevel: number | null }; children: BomNode[] } | null>(null);

  useEffect(() => {
    if (!itemId) { setBomTree(null); return; }
    fetch(`/api/items/${itemId}/bom`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.children?.length > 0) setBomTree({ item: j.item, children: j.children });
        else setBomTree(null);
      })
      .catch(() => setBomTree(null));
  }, [itemId]);

  const partsCost = parts.reduce((s, p) => s + (p.totalCost ?? 0), 0);
  const totalCost = partsCost + transportCost;

  // 부품/소모품 우선 정렬
  const itemOptions = [...items]
    .sort((a, b) => {
      const rank = (t: string) => (t === "PART" ? 0 : t === "CONSUMABLE" ? 1 : 2);
      return rank(a.itemType) - rank(b.itemType);
    })
    .slice(0, 200)
    .map((i) => ({ value: i.id, label: `${i.itemCode} · ${i.name} [${i.itemType}]` }));

  async function addPart() {
    if (!equipmentSN) { setError(t("msg.targetSnRequired", lang)); return; }
    if (!warehouseId) { setError(t("msg.fromWhRequired", lang)); return; }
    if (!itemId) { setError(t("msg.itemRequiredShort", lang)); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/as-dispatches/${dispatchId}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          serialNumber: serialNumber || null,
          quantity: Number(quantity) || 1,
          targetEquipmentSN: equipmentSN,
          fromWarehouseId: warehouseId,
          note: note || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "insufficient_stock") {
          setError(t("msg.outOfStock", lang).replace("{details}", JSON.stringify(data.details ?? {})));
        } else {
          setError(t("msg.saveFailedReason", lang).replace("{reason}", String(data.error ?? res.status)));
        }
        return;
      }
      const { part } = await res.json();
      setParts((cur) => [
        ...cur,
        {
          id: part.id,
          itemCode: part.item?.itemCode ?? "",
          itemName: part.item?.name ?? "",
          serialNumber: part.serialNumber,
          quantity: part.quantity,
          targetEquipmentSN: part.targetEquipmentSN,
          unitCost: part.unitCost ? Number(part.unitCost) : null,
          totalCost: part.totalCost ? Number(part.totalCost) : null,
          note: part.note,
        },
      ]);
      setItemId("");
      setSerialNumber("");
      setQuantity("1");
      setNote("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function removePart(id: string) {
    if (!confirm(t("msg.partRemoveConfirm", lang))) return;
    const res = await fetch(`/api/as-dispatches/${dispatchId}/parts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setParts((cur) => cur.filter((p) => p.id !== id));
      router.refresh();
    }
  }

  return (
    <Card title={t("title.partsUsed", lang).replace("{count}", String(parts.length))}>
      <Note tone="info">
        {t("note.partsAuto", lang)}<br />
        {t("note.partsTargetSN", lang)}
      </Note>

      <div className="mt-3">
        <Row>
          <Field label={t("field.targetEquipSN", lang)} required width="240px">
            <SerialCombobox value={equipmentSN} onChange={setEquipmentSN} lang={lang} />
          </Field>
          <Field label={t("field.warehouseShip", lang)} required width="240px">
            <Select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} options={warehouses.map((w) => ({ value: w.id, label: `${w.code} · ${w.name}` }))} />
          </Field>
        </Row>
        <Row>
          <Field label={t("field.item", lang)} required>
            <ItemCombobox
              value={itemId}
              onChange={setItemId}
              required
              lang={lang}
              compatibleWithSn={equipmentSN || undefined}
            />
          </Field>
          <Field label={t("field.partSerial", lang)} width="180px">
            <SerialCombobox value={serialNumber} onChange={setSerialNumber} itemId={itemId || undefined} lang={lang} />
          </Field>
          <Field label={t("field.qty", lang)} width="80px">
            <TextInput type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
        </Row>
        {bomTree && <BomInfoCard tree={bomTree} lang={lang} />}
        <Row>
          <Field label={t("field.note", lang)}>
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("placeholder.partNoteExample", lang)} />
          </Field>
          <Field label=" " width="120px">
            <Button onClick={addPart} disabled={submitting}>{t("btn.addPart", lang)}</Button>
          </Field>
        </Row>
        {error && <div className="mb-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      </div>

      {parts.length > 0 && (
        <table className="mt-4 w-full text-[12px]">
          <thead>
            <tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
              <th className="py-2 text-left">{t("col.partItem", lang)}</th>
              <th className="py-2 text-left">{t("col.partSerial", lang)}</th>
              <th className="py-2 text-right">{t("col.partQty", lang)}</th>
              <th className="py-2 text-right">{t("col.partUnitCost", lang)}</th>
              <th className="py-2 text-right">{t("col.partSubTotal", lang)}</th>
              <th className="py-2 text-left">{t("col.partTargetSN", lang)}</th>
              <th className="py-2 text-left">{t("col.partNote", lang)}</th>
              <th className="py-2 text-right">{t("col.partCancel", lang)}</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className="border-b border-[color:var(--tts-border)]/50">
                <td className="py-2"><div className="font-semibold">{p.itemName}</div><div className="font-mono text-[10px] text-[color:var(--tts-muted)]">{p.itemCode}</div></td>
                <td className="py-2 font-mono text-[11px]">{p.serialNumber ?? "—"}</td>
                <td className="py-2 text-right font-mono">{p.quantity}</td>
                <td className="py-2 text-right font-mono">{fmt(p.unitCost)}</td>
                <td className="py-2 text-right font-mono font-bold">{fmt(p.totalCost)}</td>
                <td className="py-2 font-mono text-[11px] text-[color:var(--tts-accent)]">{p.targetEquipmentSN}</td>
                <td className="py-2 text-[color:var(--tts-sub)]">{p.note ?? ""}</td>
                <td className="py-2 text-right"><button onClick={() => removePart(p.id)} className="text-[color:var(--tts-danger)] hover:underline">{t("btn.cancelPart", lang)}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 flex flex-col items-end gap-1 border-t border-[color:var(--tts-border)] pt-3 text-[13px]">
        <div>{t("label.partsTotal", lang)}: <span className="font-mono font-bold">{fmt(partsCost)} ₫</span></div>
        <div>{t("label.transportCostSum", lang)}: <span className="font-mono">{fmt(transportCost)} ₫</span></div>
        <div className="text-[15px]">{t("label.dispatchTotalCost", lang)}: <span className="font-mono font-extrabold text-[color:var(--tts-primary)]">{fmt(totalCost)} ₫</span></div>
      </div>
    </Card>
  );
}

// ─── BOM 정보 카드 (참고용) ─────────────────────────────────────
// 선택한 부품이 A'ssy 일 때, 하위 구성 부품을 트리로 표시.
type BomNode = {
  item: { id: string; itemCode: string; name: string; itemType: string; description: string; bomLevel: number | null };
  quantity: number;
  note: string | null;
  children: BomNode[];
};

function BomInfoCard({ tree, lang }: { tree: { item: { id: string; itemCode: string; name: string; bomLevel: number | null }; children: BomNode[] }; lang: Lang }) {
  const headline = t("dispatch.assemblyChildren", lang);
  return (
    <div className="mt-2 rounded-md border border-[color:var(--tts-accent)] bg-[color:var(--tts-accent-dim)]/30 p-3">
      <div className="mb-1.5 text-[12px] font-bold text-[color:var(--tts-accent)]">📦 {headline}</div>
      <ul className="space-y-1 font-mono text-[11px]">
        {tree.children.map((c) => <BomItem key={c.item.id} node={c} depth={0} />)}
      </ul>
      <div className="mt-2 text-[10px] italic text-[color:var(--tts-muted)]">
        {lang === "VI" ? "(Tham khảo — chỉ để xem cấu trúc, không tự động đưa vào kho)" : lang === "EN" ? "(Reference only — not auto-issued from stock)" : "(참고용 — 실제 출고는 위에서 선택한 품목만 처리됩니다)"}
      </div>
    </div>
  );
}

function BomItem({ node, depth }: { node: BomNode; depth: number }) {
  const indent = "  ".repeat(depth);
  const branch = depth === 0 ? "🔧" : "⚙";
  return (
    <li>
      <div className="flex items-center gap-2">
        <span className="whitespace-pre text-[color:var(--tts-muted)]">{indent}{branch}</span>
        <span className="text-[10px] text-[color:var(--tts-primary)]">{node.item.itemCode}</span>
        <span className="font-semibold">{node.item.name}</span>
        <span className="text-[10px] text-[color:var(--tts-muted)]">×{node.quantity}</span>
        {node.note && <span className="text-[10px] text-[color:var(--tts-muted)]">— {node.note}</span>}
      </div>
      {node.children.length > 0 && (
        <ul className="space-y-1">
          {node.children.map((c) => <BomItem key={c.item.id} node={c} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  );
}
