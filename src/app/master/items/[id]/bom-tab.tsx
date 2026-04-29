"use client";

import { useEffect, useState } from "react";
import { Button, Field, ItemCombobox, Note, Row, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Node = {
  item: { id: string; itemCode: string; name: string; itemType: string; description: string; bomLevel: number | null };
  quantity: number;
  note: string | null;
  children: Node[];
};

export function BomTab({ itemId, itemType, bomLevel, lang }: { itemId: string; itemType: string; bomLevel: number; lang: Lang }) {
  const [tree, setTree] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickId, setPickId] = useState("");
  const [pickQty, setPickQty] = useState("1");
  const [pickNote, setPickNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    try {
      const r = await fetch(`/api/items/${itemId}/bom`, { credentials: "same-origin" });
      const j = await r.json();
      setTree(j?.children ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refetch(); }, [itemId]);

  const canAdd = itemType !== "PRODUCT" && bomLevel < 3;

  async function addChild() {
    if (!pickId) return;
    setErr(null);
    const r = await fetch(`/api/items/${itemId}/bom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ childItemId: pickId, quantity: Number(pickQty) || 1, note: pickNote || null }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      const reason = j?.details?.reason ?? j?.error;
      setErr(mapBomError(reason, lang));
      return;
    }
    setPickId(""); setPickQty("1"); setPickNote("");
    refetch();
  }

  async function removeChild(childId: string) {
    if (!window.confirm(lang === "VI" ? "Bỏ liên kết này?" : lang === "EN" ? "Unlink this part?" : "이 BOM 관계를 해제할까요?")) return;
    const r = await fetch(`/api/items/${itemId}/bom/${childId}`, { method: "DELETE" });
    if (r.ok) refetch();
  }

  return (
    <div>
      {!canAdd && itemType === "PRODUCT" && (
        <Note tone="info">{lang === "VI" ? "PRODUCT không thể có BOM." : lang === "EN" ? "PRODUCT cannot have BOM." : "PRODUCT 는 BOM 부모가 될 수 없습니다."}</Note>
      )}
      {!canAdd && bomLevel >= 3 && (
        <Note tone="warn">{t("item.bomMaxDepth", lang)}</Note>
      )}

      {/* 트리 표시 */}
      <div className="my-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)]/40 p-3 font-mono text-[12px]">
        {loading && <div className="text-[color:var(--tts-muted)]">…</div>}
        {!loading && tree.length === 0 && <div className="text-[color:var(--tts-muted)]">{lang === "VI" ? "Chưa có linh kiện con." : lang === "EN" ? "No sub-parts yet." : "하위 부품 없음"}</div>}
        <ul className="space-y-1">
          {tree.map((n) => <BomNode key={n.item.id} node={n} depth={0} onRemove={removeChild} parentId={itemId} lang={lang} />)}
        </ul>
      </div>

      {canAdd && (
        <div className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-3">
          <div className="mb-2 text-[12px] font-bold text-[color:var(--tts-sub)]">
            {t("item.bomAddChild", lang)} <span className="ml-2 text-[10px] text-[color:var(--tts-muted)]">(Level {bomLevel + 1})</span>
          </div>
          <Row>
            <Field label={lang === "KO" ? "부품 검색" : lang === "VI" ? "Tìm linh kiện" : "Search part"} width="100%">
              <ItemCombobox value={pickId} onChange={setPickId} itemType="PART" lang={lang} />
            </Field>
            <Field label={t("item.bomQuantity", lang)} width="100px">
              <TextInput type="number" min="0.01" step="0.01" value={pickQty} onChange={(e) => setPickQty(e.target.value)} />
            </Field>
            <Field label={t("item.bomNote", lang)} width="240px">
              <TextInput value={pickNote} onChange={(e) => setPickNote(e.target.value)} placeholder={lang === "KO" ? "조립 메모" : ""} />
            </Field>
            <Field label="" width="80px">
              <Button onClick={addChild} disabled={!pickId}>+</Button>
            </Field>
          </Row>
          {err && <div className="mt-2 text-[12px] text-[color:var(--tts-danger)]">{err}</div>}
        </div>
      )}
    </div>
  );
}

function BomNode({ node, depth, onRemove, parentId, lang }: { node: Node; depth: number; onRemove: (id: string) => void; parentId: string; lang: Lang }) {
  const indent = "  ".repeat(depth);
  const branch = depth === 0 ? "📦" : depth === 1 ? "🔧" : "⚙";
  return (
    <li>
      <div className="flex items-center gap-2">
        <span className="whitespace-pre text-[color:var(--tts-muted)]">{indent}{branch}</span>
        <span className="font-mono text-[10px] text-[color:var(--tts-primary)]">{node.item.itemCode}</span>
        <span className="font-semibold">{node.item.name}</span>
        <span className="text-[10px] text-[color:var(--tts-muted)]">×{node.quantity}</span>
        {node.note && <span className="text-[10px] text-[color:var(--tts-muted)]">— {node.note}</span>}
        <button type="button" onClick={() => onRemove(node.item.id)} className="ml-auto text-[10px] text-[color:var(--tts-danger)] hover:underline">×</button>
      </div>
      {node.children.length > 0 && (
        <ul className="space-y-1">
          {node.children.map((c) => <BomNode key={c.item.id} node={c} depth={depth + 1} onRemove={onRemove} parentId={parentId} lang={lang} />)}
        </ul>
      )}
    </li>
  );
}

function mapBomError(reason: string | undefined, lang: Lang): string {
  switch (reason) {
    case "max_depth_exceeded": return t("item.bomMaxDepth", lang);
    case "self_reference":     return lang === "KO" ? "자기 자신은 하위로 추가할 수 없습니다." : lang === "VI" ? "Không thể tự tham chiếu." : "Cannot self-reference.";
    case "cycle_detected":     return lang === "KO" ? "순환 참조가 발생합니다." : lang === "VI" ? "Tham chiếu vòng lặp." : "Circular reference detected.";
    case "product_cannot_be_part":
    case "product_cannot_have_bom":
      return lang === "KO" ? "PRODUCT 는 BOM 관계에 포함될 수 없습니다." : lang === "VI" ? "PRODUCT không hỗ trợ BOM." : "PRODUCT cannot be part of BOM.";
    case "already_has_parent": return lang === "KO" ? "다른 상위 품목에 이미 등록되어 있습니다." : lang === "VI" ? "Đã có cha khác." : "Already has another parent.";
    default: return lang === "KO" ? "추가 실패" : lang === "VI" ? "Thêm thất bại" : "Failed to add";
  }
}
