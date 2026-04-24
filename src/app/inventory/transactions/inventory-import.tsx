"use client";

import { useRouter } from "next/navigation";
import { ExcelUploader } from "@/components/ui";
import type { UploaderColumn } from "@/components/ui";

type ItemRef = { id: string; itemCode: string; name: string };
type WhRef = { id: string; code: string; warehouseType: string };
type ClRef = { id: string; clientCode: string; companyNameVi: string };

type Props = {
  items: ItemRef[];
  warehouses: WhRef[];
  clients: ClRef[];
};

const TYPES = new Set(["IN", "OUT", "TRANSFER"]);
const REASONS_BY_TYPE: Record<string, Set<string>> = {
  IN: new Set(["PURCHASE", "RETURN_IN", "OTHER_IN"]),
  OUT: new Set(["SALE", "CONSUMABLE_OUT"]),
  TRANSFER: new Set(["CALIBRATION", "REPAIR", "RENTAL", "DEMO"]),
};

function buildColumns(items: ItemRef[], warehouses: WhRef[], clients: ClRef[]): UploaderColumn[] {
  const itemCodeSet = new Set(items.map((i) => i.itemCode));
  const whByCode = new Map(warehouses.map((w) => [w.code, w]));
  const clientByCode = new Map(clients.map((c) => [c.clientCode, c]));
  const whCodeSet = new Set(warehouses.map((w) => w.code));

  return [
    {
      key: "txnType", header: "유형", required: true, validate: (raw) => {
        const v = raw.trim().toUpperCase();
        if (!TYPES.has(v)) return { error: "IN/OUT/TRANSFER 중 하나" };
        return { normalized: v };
      },
    },
    {
      key: "reason", header: "사유", required: true, validate: (raw, row) => {
        const v = raw.trim().toUpperCase();
        const type = String(row["유형"] ?? "").trim().toUpperCase();
        if (!type || !TYPES.has(type)) return { error: "먼저 유형 유효해야" };
        const allowed = REASONS_BY_TYPE[type];
        if (!allowed.has(v)) return { error: `${type}엔 ${Array.from(allowed).join("/")}만 가능` };
        return { normalized: v };
      },
    },
    {
      key: "itemCode", header: "품목코드", required: true, validate: (raw) => {
        if (itemCodeSet.has(raw)) return { normalized: raw };
        return { error: "품목코드 DB 불일치" };
      },
    },
    { key: "serialNumber", header: "S/N", validate: (raw) => ({ normalized: raw }) },
    {
      key: "fromWarehouseCode", header: "출고창고코드", validate: (raw, row) => {
        const type = String(row["유형"] ?? "").trim().toUpperCase();
        if (!raw) {
          if (type === "OUT" || type === "TRANSFER") return { error: `${type} 시 필수` };
          return { normalized: "" };
        }
        if (!whCodeSet.has(raw)) return { error: "창고코드 DB 불일치" };
        return { normalized: raw };
      },
    },
    {
      key: "toWarehouseCode", header: "입고창고코드", validate: (raw, row) => {
        const type = String(row["유형"] ?? "").trim().toUpperCase();
        if (!raw) {
          if (type === "IN" || type === "TRANSFER") return { error: `${type} 시 필수` };
          return { normalized: "" };
        }
        if (!whCodeSet.has(raw)) return { error: "창고코드 DB 불일치" };
        return { normalized: raw };
      },
    },
    {
      key: "clientCode", header: "고객코드", validate: (raw, row) => {
        if (!raw) return { normalized: "" };
        if (!clientByCode.has(raw)) return { error: "거래처코드 DB 불일치" };
        // External 창고 검증은 선택적 — 입고창고가 External 일 때만 필수이지만 엄격화는 생략
        return { normalized: raw };
      },
    },
    {
      key: "targetEquipmentSN", header: "대상장비S/N", validate: (raw, row) => {
        const reason = String(row["사유"] ?? "").trim().toUpperCase();
        if (reason === "CONSUMABLE_OUT" && !raw) return { error: "소모품출고 시 필수" };
        return { normalized: raw };
      },
    },
    { key: "note", header: "비고", validate: (raw) => ({ normalized: raw }) },
  ];
}

export function InventoryImport({ items, warehouses, clients }: Props) {
  const router = useRouter();
  const itemMap = new Map(items.map((i) => [i.itemCode, i.id]));
  const whMap = new Map(warehouses.map((w) => [w.code, w.id]));
  const clientMap = new Map(clients.map((c) => [c.clientCode, c.id]));

  return (
    <ExcelUploader
      title="입출고 일괄 업로드"
      templateName="inventory-transactions-template.xlsx"
      columns={buildColumns(items, warehouses, clients)}
      onSave={async (rows) => {
        let ok = 0, failed = 0;
        const errors: string[] = [];
        for (const r of rows) {
          const itemId = itemMap.get(r.itemCode);
          if (!itemId) { failed++; continue; }
          const fromWh = r.fromWarehouseCode ? whMap.get(r.fromWarehouseCode) : null;
          const toWh = r.toWarehouseCode ? whMap.get(r.toWarehouseCode) : null;
          const clId = r.clientCode ? clientMap.get(r.clientCode) : null;
          const res = await fetch("/api/inventory/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId,
              txnType: r.txnType,
              reason: r.reason,
              quantity: 1,
              serialNumber: r.serialNumber || null,
              fromWarehouseId: fromWh ?? null,
              toWarehouseId: toWh ?? null,
              clientId: clId ?? null,
              targetEquipmentSN: r.targetEquipmentSN || null,
              note: r.note || null,
            }),
          });
          if (res.ok) ok++;
          else {
            failed++;
            const data = await res.json().catch(() => ({}));
            errors.push(`${r.itemCode}/${r.serialNumber ?? "-"}: ${data.error ?? res.status}`);
          }
        }
        if (failed === 0) { router.refresh(); return { ok: true }; }
        return { ok: false, message: `${ok}건 성공 · ${failed}건 실패 · ${errors.slice(0, 3).join(" / ")}` };
      }}
    />
  );
}
