import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Badge, Card } from "@/components/ui";
import { ItContractDetail } from "./it-contract-detail";
import { EquipmentImport } from "./equipment-import";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

const statusLabel: Record<string, string> = {
  DRAFT: "작성중",
  ACTIVE: "활성",
  EXPIRED: "만료",
  CANCELED: "취소",
};

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
  await getSession();

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

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/rental/it-contracts"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            ← IT 계약 목록
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold text-[color:var(--tts-text)]">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{contract.contractNumber}</span>
            <Badge tone={statusTone[contract.status] ?? "neutral"}>
              {statusLabel[contract.status] ?? contract.status}
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
                  미수금 {contract.client.receivableStatus === "BLOCKED" ? "차단" : "경고"}
                </Badge>
              </span>
            )}
          </div>
        </div>
        <Card>
          <ItContractDetail
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
          />
        </Card>
        <div className="mt-4">
          <Card title="📥 장비 엑셀 일괄 업로드">
            <EquipmentImport contractId={contract.id} />
          </Card>
        </div>
      </div>
    </main>
  );
}
