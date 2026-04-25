"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, Note, Row, Select, TextInput } from "@/components/ui";

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
};

const fmt = (n: number | null) => (n === null ? "-" : Number(n).toLocaleString("vi-VN"));

export function DispatchPartsSection({ dispatchId, initialParts, defaultEquipmentSN, warehouses, items, transportCost }: Props) {
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
    if (!equipmentSN) { setError("대상 장비 S/N 필수"); return; }
    if (!warehouseId) { setError("출고 창고 필수"); return; }
    if (!itemId) { setError("품목 필수"); return; }
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
          setError(`재고 부족: ${JSON.stringify(data.details ?? {})}`);
        } else {
          setError(`저장 실패: ${data.error ?? res.status}`);
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
    if (!confirm("부품 사용을 취소합니다 (재고 복원). 진행할까요?")) return;
    const res = await fetch(`/api/as-dispatches/${dispatchId}/parts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setParts((cur) => cur.filter((p) => p.id !== id));
      router.refresh();
    }
  }

  return (
    <Card title={`🔧 사용 부품 (${parts.length}건)`}>
      <Note tone="info">
        부품 입력 시 자동: 재고 OUT(소모품출고) + 매입원가 자동조회 + 대상 장비 S/N에 비용 누적.<br />
        대상 장비 S/N 은 AS 티켓에서 자동 채움 — 변경 가능합니다.
      </Note>

      <div className="mt-3">
        <Row>
          <Field label="대상 장비 S/N" required width="240px">
            <TextInput value={equipmentSN} onChange={(e) => setEquipmentSN(e.target.value)} placeholder="SN-..." />
          </Field>
          <Field label="출고 창고" required width="240px">
            <Select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} options={warehouses.map((w) => ({ value: w.id, label: `${w.code} · ${w.name}` }))} />
          </Field>
        </Row>
        <Row>
          <Field label="품목" required>
            <Select required value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="선택" options={itemOptions} />
          </Field>
          <Field label="부품 S/N" width="180px">
            <TextInput value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="(선택)" />
          </Field>
          <Field label="수량" width="80px">
            <TextInput type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
        </Row>
        <Row>
          <Field label="비고">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: D330 토너 교체" />
          </Field>
          <Field label=" " width="120px">
            <Button onClick={addPart} disabled={submitting}>+ 부품 추가</Button>
          </Field>
        </Row>
        {error && <div className="mb-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      </div>

      {parts.length > 0 && (
        <table className="mt-4 w-full text-[12px]">
          <thead>
            <tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
              <th className="py-2 text-left">품목</th>
              <th className="py-2 text-left">부품 S/N</th>
              <th className="py-2 text-right">수량</th>
              <th className="py-2 text-right">매입단가</th>
              <th className="py-2 text-right">소계</th>
              <th className="py-2 text-left">대상 장비 S/N</th>
              <th className="py-2 text-left">비고</th>
              <th className="py-2 text-right">취소</th>
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
                <td className="py-2 text-right"><button onClick={() => removePart(p.id)} className="text-[color:var(--tts-danger)] hover:underline">취소</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 flex flex-col items-end gap-1 border-t border-[color:var(--tts-border)] pt-3 text-[13px]">
        <div>부품 비용 합계: <span className="font-mono font-bold">{fmt(partsCost)} ₫</span></div>
        <div>교통비: <span className="font-mono">{fmt(transportCost)} ₫</span></div>
        <div className="text-[15px]">이번 출동 총 비용: <span className="font-mono font-extrabold text-[color:var(--tts-primary)]">{fmt(totalCost)} ₫</span></div>
      </div>
    </Card>
  );
}
