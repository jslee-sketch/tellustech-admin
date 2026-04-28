import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Badge, Card } from "@/components/ui";
import { ItContractDetail } from "./it-contract-detail";
import { EquipmentImport } from "./equipment-import";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

function statusLabel(s: string, lang: import("@/lib/i18n").Lang): string {
  switch (s) {
    case "DRAFT": return t("status.itDraft", lang);
    case "ACTIVE": return t("status.itActive", lang);
    case "EXPIRED": return t("status.itExpired", lang);
    case "CANCELED": return t("status.itCanceled", lang);
    default: return s;
  }
}

const statusTone: Record<string, "neutral" | "success" | "warn" | "danger"> = {
  DRAFT: "neutral",
  ACTIVE: "success",
  EXPIRED: "warn",
  CANCELED: "danger",
};

function dateToInput(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function decimalToInput(d: { toString(): string } | null): string {
  return d ? d.toString() : "";
}

export default async function ItContractDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const L = session.language;

  const contract = await prisma.itContract.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, clientCode: true, companyNameVi: true, receivableStatus: true } },
      equipment: {
        orderBy: [{ installedAt: "desc" }, { serialNumber: "asc" }],
        include: { item: { select: { itemCode: true, name: true } } },
      },
      rentalOrders: { orderBy: { billingMonth: "asc" } },
      monthlyBillings: { orderBy: [{ billingMonth: "desc" }, { serialNumber: "asc" }] },
    },
  });
  if (!contract) notFound();

  const warehouses = await prisma.warehouse.findMany({
    where: { warehouseType: "INTERNAL" },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  // 소모품 사용 이력 — 계약 장비 S/N 대상으로 CONSUMABLE_OUT 조회
  const equipmentSNs = contract.equipment.map((e) => e.serialNumber).filter((s): s is string => !!s);
  // 장비별 누적 비용
  const { getEquipmentTotalCost } = await import("@/lib/cost-tracker");
  const equipmentCosts = await Promise.all(equipmentSNs.map((sn) => getEquipmentTotalCost(sn)));
  const validCosts = equipmentCosts.filter((c): c is NonNullable<typeof c> => !!c);
  const contractTotalCost = validCosts.reduce((s, e) => s + e.totalCost, 0);
  const consumables = equipmentSNs.length > 0
    ? await prisma.inventoryTransaction.findMany({
        where: {
          reason: "CONSUMABLE_OUT",
          targetEquipmentSN: { in: equipmentSNs },
        },
        orderBy: { performedAt: "desc" },
        include: { item: { select: { itemCode: true, name: true } } },
        take: 200,
      })
    : [];

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/rental/it-contracts"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            {t("page.itContract.back", L)}
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold text-[color:var(--tts-text)]">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{contract.contractNumber}</span>
            <Badge tone={statusTone[contract.status] ?? "neutral"}>
              {statusLabel(contract.status, L)}
            </Badge>
          </h1>
          <div className="mt-1 text-[13px] text-[color:var(--tts-sub)]">
            {contract.client.companyNameVi}{" "}
            <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">
              {contract.client.clientCode}
            </span>
            {contract.client.receivableStatus !== "NORMAL" && (
              <span className="ml-2">
                <Badge tone={contract.client.receivableStatus === "BLOCKED" ? "danger" : "warn"}>
                  {contract.client.receivableStatus === "BLOCKED" ? t("label.itArBlocked", L) : t("label.itArWarning", L)}
                </Badge>
              </span>
            )}
          </div>
        </div>
        <Card>
          <ItContractDetail
            lang={L}
            contractId={contract.id}
            initial={{
              contractNumber: contract.contractNumber,
              clientCode: contract.client.clientCode,
              clientName: contract.client.companyNameVi,
              status: contract.status,
              installationAddress: contract.installationAddress ?? "",
              startDate: dateToInput(contract.startDate),
              endDate: dateToInput(contract.endDate),
              deposit: decimalToInput(contract.deposit),
              installationFee: decimalToInput(contract.installationFee),
              deliveryFee: decimalToInput(contract.deliveryFee),
              additionalServiceFee: decimalToInput(contract.additionalServiceFee),
              contractMgrName: contract.contractMgrName ?? "",
              contractMgrPhone: contract.contractMgrPhone ?? "",
              contractMgrOffice: contract.contractMgrOffice ?? "",
              contractMgrEmail: contract.contractMgrEmail ?? "",
              technicalMgrName: contract.technicalMgrName ?? "",
              technicalMgrPhone: contract.technicalMgrPhone ?? "",
              technicalMgrOffice: contract.technicalMgrOffice ?? "",
              technicalMgrEmail: contract.technicalMgrEmail ?? "",
              financeMgrName: contract.financeMgrName ?? "",
              financeMgrPhone: contract.financeMgrPhone ?? "",
              financeMgrOffice: contract.financeMgrOffice ?? "",
              financeMgrEmail: contract.financeMgrEmail ?? "",
            }}
            equipment={contract.equipment.map((e) => ({
              id: e.id,
              serialNumber: e.serialNumber,
              itemId: e.itemId,
              itemCode: e.item.itemCode,
              itemName: e.item.name,
              manufacturer: e.manufacturer ?? "",
              installedAt: dateToInput(e.installedAt),
              removedAt: dateToInput(e.removedAt),
              monthlyBaseFee: decimalToInput(e.monthlyBaseFee),
              bwIncludedPages: e.bwIncludedPages?.toString() ?? "",
              bwOverageRate: decimalToInput(e.bwOverageRate),
              colorIncludedPages: e.colorIncludedPages?.toString() ?? "",
              colorOverageRate: decimalToInput(e.colorOverageRate),
              note: e.note ?? "",
              actualCoverage: e.actualCoverage ?? null,
              lastYieldRateBw: e.lastYieldRateBw !== null && e.lastYieldRateBw !== undefined ? e.lastYieldRateBw.toString() : null,
              lastYieldRateColor: e.lastYieldRateColor !== null && e.lastYieldRateColor !== undefined ? e.lastYieldRateColor.toString() : null,
              lastYieldCalcAt: e.lastYieldCalcAt ? e.lastYieldCalcAt.toISOString() : null,
            }))}
            orders={contract.rentalOrders.map((o) => ({
              id: o.id,
              billingMonth: o.billingMonth.toISOString().slice(0, 7),
              amount: o.amount.toString(),
              editable: o.editable,
              canceled: o.canceled,
            }))}
            billings={contract.monthlyBillings.map((b) => ({
              id: b.id,
              billingMonth: b.billingMonth.toISOString().slice(0, 7),
              serialNumber: b.serialNumber,
              counterBw: b.counterBw,
              counterColor: b.counterColor,
              billingMethod: b.billingMethod,
              photoUrl: b.photoUrl ?? "",
              customerSignature: b.customerSignature ?? "",
              yieldVerified: b.yieldVerified,
              computedAmount: b.computedAmount?.toString() ?? "0",
            }))}
            equipmentOptions={contract.equipment.map((e) => ({
              value: e.serialNumber,
              label: `${e.serialNumber} · ${e.item.name}`,
            }))}
            warehouseOptions={warehouses.map((w) => ({ value: w.id, label: `${w.code} · ${w.name}` }))}
          />
        </Card>
        <div className="mt-4">
          <Card title={t("page.itContract.import", L)}>
            <EquipmentImport contractId={contract.id} lang={L} />
          </Card>
        </div>

        {/* 장비별 누적 비용 */}
        {validCosts.length > 0 && (
          <div className="mt-4">
            <Card title={t("label.itEquipCostsTitle", L).replace("{total}", contractTotalCost.toLocaleString("vi-VN"))}>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
                    <th className="py-2 text-left">{t("col.snLabel", L)}</th>
                    <th className="py-2 text-left">{t("col.itemLabel", L)}</th>
                    <th className="py-2 text-right">{t("col.purchaseCost", L)}</th>
                    <th className="py-2 text-right">{t("col.partsCost", L)}</th>
                    <th className="py-2 text-right">{t("col.consumablesCost", L)}</th>
                    <th className="py-2 text-right">{t("col.transportCost", L)}</th>
                    <th className="py-2 text-right">{t("col.totalSum", L)}</th>
                    <th className="py-2 text-left">{t("col.lastService", L)}</th>
                  </tr>
                </thead>
                <tbody>
                  {validCosts.map((c) => (
                    <tr key={c.serialNumber} className="border-b border-[color:var(--tts-border)]/50">
                      <td className="py-2 font-mono text-[11px] text-[color:var(--tts-accent)]">{c.serialNumber}</td>
                      <td className="py-2">{c.itemName} <span className="font-mono text-[10px] text-[color:var(--tts-muted)]">{c.itemCode}</span></td>
                      <td className="py-2 text-right font-mono">{c.purchaseCost.toLocaleString("vi-VN")}</td>
                      <td className="py-2 text-right font-mono">{c.partsCost.toLocaleString("vi-VN")}</td>
                      <td className="py-2 text-right font-mono">{c.consumablesCost.toLocaleString("vi-VN")}</td>
                      <td className="py-2 text-right font-mono">{c.transportCost.toLocaleString("vi-VN")}</td>
                      <td className="py-2 text-right font-mono font-bold text-[color:var(--tts-primary)]">{c.totalCost.toLocaleString("vi-VN")}</td>
                      <td className="py-2 text-[color:var(--tts-sub)]">{c.lastServiceDate ? c.lastServiceDate.toISOString().slice(0, 10) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* 소모품 사용 이력 */}
        <div className="mt-4">
          <Card title={t("label.itConsumablesTitle", L).replace("{count}", String(consumables.length))}>
            {consumables.length === 0 ? (
              <div className="py-4 text-center text-[12px] text-[color:var(--tts-muted)]">
                {t("msg.itNoConsumables", L)}<br />
                <span className="text-[11px]">{t("msg.itConsumableHint", L)}</span>
              </div>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
                    <th className="py-2 text-left">{t("col.outboundDate", L)}</th>
                    <th className="py-2 text-left">{t("col.targetEquipSnHdr", L)}</th>
                    <th className="py-2 text-left">{t("col.consumableName", L)}</th>
                    <th className="py-2 text-left">{t("col.consumableSn", L)}</th>
                    <th className="py-2 text-left">{t("col.noteCol", L)}</th>
                  </tr>
                </thead>
                <tbody>
                  {consumables.map((c) => (
                    <tr key={c.id} className="border-b border-[color:var(--tts-border)]/50">
                      <td className="py-2 font-mono text-[11px]">{c.performedAt.toISOString().slice(0, 10)}</td>
                      <td className="py-2 font-mono text-[11px] text-[color:var(--tts-accent)]">{c.targetEquipmentSN}</td>
                      <td className="py-2">
                        <div className="font-semibold">{c.item.name}</div>
                        <div className="font-mono text-[10px] text-[color:var(--tts-muted)]">{c.item.itemCode}</div>
                      </td>
                      <td className="py-2 font-mono text-[11px]">{c.serialNumber ?? "—"}</td>
                      <td className="py-2 text-[color:var(--tts-sub)]">{c.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
