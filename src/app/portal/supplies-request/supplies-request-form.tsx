"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Note, Select, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Supply = { id: string; itemCode: string; name: string; unit: string|null; description: string; itemType: string; colorChannel?: string|null };
type ProductGroup = { id: string; itemCode: string; name: string; compatibleConsumableIds: string[] };

export function SuppliesRequestForm({ lang }: { clientId?: string; lang: Lang }) {
  const router = useRouter();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [products, setProducts] = useState<ProductGroup[]>([]);
  const [productFilter, setProductFilter] = useState<string>(""); // "" = 전체
  const [items, setItems] = useState<Array<{ itemId: string; quantity: string; note: string }>>([
    { itemId: "", quantity: "1", note: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    fetch("/api/portal/my-supplies").then(r => r.json()).then(j => {
      setSupplies(j?.supplies ?? []);
      setProducts(j?.products ?? []);
    });
  }, []);

  // 선택된 장비에 호환되는 소모품만 필터.
  const visibleSupplies = useMemo(() => {
    if (!productFilter) return supplies;
    const grp = products.find((p) => p.id === productFilter);
    if (!grp) return supplies;
    const allowed = new Set(grp.compatibleConsumableIds);
    return supplies.filter((s) => allowed.has(s.id));
  }, [supplies, products, productFilter]);

  function addRow() { setItems(s => [...s, { itemId:"", quantity:"1", note:"" }]); }
  function removeRow(i: number) { setItems(s => s.filter((_,idx) => idx !== i)); }
  function update(i: number, key: "itemId"|"quantity"|"note", v: string) {
    setItems(s => s.map((row, idx) => idx === i ? { ...row, [key]: v } : row));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const payload = {
        items: items
          .filter(x => x.itemId && Number(x.quantity) > 0)
          .map(x => ({ itemId: x.itemId, quantity: Number(x.quantity), note: x.note || null })),
      };
      if (payload.items.length === 0) { setError("품목을 최소 1개 선택 / Chọn ít nhất 1 vật tư"); return; }
      const res = await fetch("/api/portal/supplies-request", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) { setError(body?.error ?? t("portal.suppliesFailed", lang)); return; }
      setDone(body.ticket?.ticketNumber ?? "OK");
      setItems([{ itemId:"", quantity:"1", note:"" }]);
      router.refresh();
    } finally { setSubmitting(false); }
  }

  function chColor(ch?: string | null): string {
    switch (ch) {
      case "BLACK": return "🖤";
      case "CYAN": return "🩵";
      case "MAGENTA": return "💗";
      case "YELLOW": return "💛";
      case "DRUM": return "🥁";
      case "FUSER": return "🔥";
      default: return "";
    }
  }

  return (
    <Card title={t("page.portal.supplies", lang)}>
      <Note tone="info">
        본인 IT 계약/렌탈 장비에 호환되는 소모품·부품만 표시됩니다.<br/>
        Chỉ hiển thị vật tư tương thích với thiết bị bạn đang thuê.
      </Note>

      {/* 장비별 좁히기 */}
      {products.length > 0 && (
        <div className="mt-3">
          <Field label={lang === "VI" ? "Lọc theo thiết bị" : lang === "EN" ? "Filter by equipment" : "장비별 좁혀보기"}>
            <Select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}
              options={[
                { value: "", label: lang === "VI" ? "Tất cả thiết bị" : lang === "EN" ? "All equipment" : "전체 장비" },
                ...products.map((p) => ({ value: p.id, label: `${p.itemCode} · ${p.name}` })),
              ]}
            />
          </Field>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        {items.map((row, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 rounded border border-[color:var(--tts-border)] p-3">
            <div className="col-span-7">
              <Field label={`#${i+1} 품목 / Vật tư`} required>
                <Select required value={row.itemId} onChange={(e)=>update(i,"itemId",e.target.value)}
                  options={[
                    { value:"", label: t("placeholder.select", lang) },
                    ...visibleSupplies.map(s => ({ value: s.id, label: `${chColor(s.colorChannel)} ${s.itemCode} · ${s.name}${s.unit ? ` (${s.unit})` : ""}${s.description ? ` [${s.description}]` : ""}` })),
                  ]}
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="수량 / SL" required>
                <TextInput type="number" required value={row.quantity} onChange={(e)=>update(i,"quantity",e.target.value)} />
              </Field>
            </div>
            <div className="col-span-3">
              <Field label="메모 / Ghi chú">
                <TextInput value={row.note} onChange={(e)=>update(i,"note",e.target.value)} />
              </Field>
            </div>
            {items.length > 1 && (
              <div className="col-span-12 text-right">
                <Button type="button" size="sm" variant="ghost" onClick={()=>removeRow(i)}>− 행 제거</Button>
              </div>
            )}
          </div>
        ))}
        <Button type="button" variant="ghost" onClick={addRow}>+ 품목 추가 / Thêm vật tư</Button>

        {error && <div className="rounded bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
        {done && <div className="rounded bg-[color:var(--tts-success-dim,rgba(34,197,94,.12))] px-3 py-2 text-[12px] text-[color:var(--tts-success)]">완료 / Hoàn tất — 접수번호 {done}</div>}
        <Button type="submit" disabled={submitting}>{submitting ? "전송 중… / Đang gửi…" : "요청 전송 / Gửi yêu cầu"}</Button>
      </form>
      {visibleSupplies.length === 0 && (
        <div className="mt-3 rounded bg-[color:var(--tts-warn-dim,rgba(250,204,21,.12))] px-3 py-2 text-[12px] text-[color:var(--tts-warn)]">
          {productFilter
            ? (lang === "VI" ? "Không có vật tư tương thích cho thiết bị này." : lang === "EN" ? "No compatible supplies for this equipment." : "선택한 장비의 호환 소모품이 없습니다.")
            : (lang === "VI" ? "Chưa có vật tư tương thích — vui lòng liên hệ quản trị viên." : lang === "EN" ? "No compatible supplies — please contact admin." : "현재 호환 소모품 매핑이 없습니다. 관리자에게 문의해 주세요.")}
        </div>
      )}
    </Card>
  );
}
