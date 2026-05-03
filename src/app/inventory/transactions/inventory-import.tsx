"use client";

import { useRouter } from "next/navigation";
import { ExcelUploader } from "@/components/ui";
import type { UploaderColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type ItemRef = { id: string; itemCode: string; name: string };
type WhRef = { id: string; code: string; warehouseType: string };
type ClRef = { id: string; clientCode: string; companyNameVi: string };

type Props = {
  items: ItemRef[];
  warehouses: WhRef[];
  clients: ClRef[];
  lang: Lang;
};

const TYPES = new Set(["IN", "OUT", "TRANSFER"]);
const REASONS_BY_TYPE: Record<string, Set<string>> = {
  IN: new Set(["PURCHASE", "RETURN_IN", "OTHER_IN"]),
  OUT: new Set(["SALE", "CONSUMABLE_OUT"]),
  TRANSFER: new Set(["CALIBRATION", "REPAIR", "RENTAL", "DEMO"]),
};

function buildColumns(items: ItemRef[], warehouses: WhRef[], clients: ClRef[], lang: Lang): UploaderColumn[] {
  const itemCodeSet = new Set(items.map((i) => i.itemCode));
  const whByCode = new Map(warehouses.map((w) => [w.code, w]));
  const clientByCode = new Map(clients.map((c) => [c.clientCode, c]));
  const whCodeSet = new Set(warehouses.map((w) => w.code));

  return [
    {
      key: "txnType", header: t("header.txnType", lang), required: true, validate: (raw) => {
        const v = raw.trim().toUpperCase();
        if (!TYPES.has(v)) return { error: t("msg.typeOneOf", lang) };
        return { normalized: v };
      },
    },
    {
      key: "reason", header: t("header.reasonH", lang), required: true, validate: (raw, row) => {
        const v = raw.trim().toUpperCase();
        const type = String(row[t("header.txnType", lang)] ?? row[t("invImport.headerFallbackType", lang)] ?? "").trim().toUpperCase();
        if (!type || !TYPES.has(type)) return { error: t("msg.typeFirstValid", lang) };
        const allowed = REASONS_BY_TYPE[type];
        if (!allowed.has(v)) return { error: t("msg.reasonOnlyAllowed", lang).replace("{type}", type).replace("{allowed}", Array.from(allowed).join("/")) };
        return { normalized: v };
      },
    },
    {
      key: "itemCode", header: t("header.itemCode", lang), required: true, validate: (raw) => {
        if (itemCodeSet.has(raw)) return { normalized: raw };
        return { error: t("msg.itemCodeNoMatch", lang) };
      },
    },
    { key: "serialNumber", header: t("header.serial", lang), validate: (raw) => ({ normalized: raw }) },
    {
      key: "fromWarehouseCode", header: t("header.fromWh", lang), validate: (raw, row) => {
        const type = String(row[t("header.txnType", lang)] ?? row[t("invImport.headerFallbackType", lang)] ?? "").trim().toUpperCase();
        if (!raw) {
          if (type === "OUT" || type === "TRANSFER") return { error: t("msg.requiredFor", lang).replace("{type}", type) };
          return { normalized: "" };
        }
        if (!whCodeSet.has(raw)) return { error: t("msg.whCodeNoMatch", lang) };
        return { normalized: raw };
      },
    },
    {
      key: "toWarehouseCode", header: t("header.toWh", lang), validate: (raw, row) => {
        const type = String(row[t("header.txnType", lang)] ?? row[t("invImport.headerFallbackType", lang)] ?? "").trim().toUpperCase();
        if (!raw) {
          if (type === "IN" || type === "TRANSFER") return { error: t("msg.requiredFor", lang).replace("{type}", type) };
          return { normalized: "" };
        }
        if (!whCodeSet.has(raw)) return { error: t("msg.whCodeNoMatch", lang) };
        return { normalized: raw };
      },
    },
    {
      key: "clientCode", header: t("header.clientCode", lang), validate: (raw, row) => {
        if (!raw) return { normalized: "" };
        if (!clientByCode.has(raw)) return { error: t("msg.clientCodeNoMatch", lang) };
        // External 창고 검증은 선택적 — 입고창고가 External 일 때만 필수이지만 엄격화는 생략
        return { normalized: raw };
      },
    },
    {
      key: "targetEquipmentSN", header: t("header.targetEquipSn", lang), validate: (raw, row) => {
        const reason = String(row[t("header.reasonH", lang)] ?? row[t("invImport.headerFallbackReason", lang)] ?? "").trim().toUpperCase();
        if (reason === "CONSUMABLE_OUT" && !raw) return { error: t("msg.consumableOutTargetReq", lang) };
        return { normalized: raw };
      },
    },
    { key: "note", header: t("header.noteH", lang), validate: (raw) => ({ normalized: raw }) },
  ];
}

export function InventoryImport({ items, warehouses, clients, lang }: Props) {
  const router = useRouter();
  const itemMap = new Map(items.map((i) => [i.itemCode, i.id]));
  const whMap = new Map(warehouses.map((w) => [w.code, w.id]));
  const clientMap = new Map(clients.map((c) => [c.clientCode, c.id]));

  return (
    <ExcelUploader
      title={t("title.invImport", lang)}
      templateName="inventory-transactions-template.xlsx"
      columns={buildColumns(items, warehouses, clients, lang)}
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
        return { ok: false, message: `${t("msg.uploadResultPartial", lang).replace("{ok}", String(ok)).replace("{failed}", String(failed))} · ${errors.slice(0, 3).join(" / ")}` };
      }}
    />
  );
}
