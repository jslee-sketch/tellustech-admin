import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { LabelsClient } from "./labels-client";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    purchaseId?: string;
    sns?: string;
    items?: string;
    itemCode?: string;
    sn?: string;
  }>;
};

export type LabelPrefill = {
  itemCode: string;
  itemName: string;
  serialNumber: string | null;
  ownerType?: "COMPANY" | "EXTERNAL_CLIENT";
  ownerLabel?: string | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  source?: string | null;
};

export default async function LabelsPage({ searchParams }: PageProps) {
  const session = await getSession();
  const L = session.language;
  const sp = await searchParams;

  let prefill: LabelPrefill[] = [];
  let printHeader: { supplierName: string; purchaseDate: string; purchaseNumber: string } | null = null;

  // ── ① 매입 ID 프리필 ──────────────────────────────────────────
  if (sp.purchaseId) {
    const pur = await prisma.purchase.findUnique({
      where: { id: sp.purchaseId },
      include: {
        supplier: { select: { companyNameVi: true, companyNameKo: true, clientCode: true } },
        items: {
          include: {
            item: { select: { itemCode: true, name: true } },
          },
        },
      },
    });
    if (pur) {
      const supplierLabel = pur.supplier?.companyNameKo ?? pur.supplier?.companyNameVi ?? pur.supplier?.clientCode ?? "-";
      prefill = pur.items.map((i) => ({
        itemCode: i.item.itemCode,
        itemName: i.item.name,
        serialNumber: i.serialNumber,
        source: supplierLabel,
      }));
      printHeader = {
        supplierName: supplierLabel,
        purchaseDate: pur.createdAt ? new Date(pur.createdAt).toISOString().slice(0, 10) : "-",
        purchaseNumber: pur.purchaseNumber ?? "-",
      };
    }
  }

  // ── ② S/N 다건 프리필 (sns=SN1,SN2,...) ─────────────────────
  if (sp.sns) {
    const snList = sp.sns.split(",").map((s) => s.trim()).filter(Boolean);
    if (snList.length > 0) {
      const invs = await prisma.inventoryItem.findMany({
        where: { serialNumber: { in: snList } },
        include: {
          item: { select: { itemCode: true, name: true } },
          warehouse: { select: { code: true, name: true } },
          ownerClient: { select: { clientCode: true, companyNameVi: true, companyNameKo: true } },
        },
      });
      prefill = invs.map((iv) => ({
        itemCode: iv.item.itemCode,
        itemName: iv.item.name,
        serialNumber: iv.serialNumber,
        ownerType: iv.ownerType,
        ownerLabel: iv.ownerClient
          ? `${iv.ownerClient.clientCode} · ${iv.ownerClient.companyNameKo ?? iv.ownerClient.companyNameVi}`
          : null,
        warehouseCode: iv.warehouse?.code ?? null,
        warehouseName: iv.warehouse?.name ?? null,
      }));
    }
  }

  // ── ③ Item ID 다건 프리필 (items=ITM1,ITM2,...) ─────────────
  if (sp.items) {
    const itemIds = sp.items.split(",").map((s) => s.trim()).filter(Boolean);
    if (itemIds.length > 0) {
      const its = await prisma.item.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, itemCode: true, name: true },
      });
      const fromItems: LabelPrefill[] = its.map((it) => ({
        itemCode: it.itemCode,
        itemName: it.name,
        serialNumber: null,
      }));
      prefill = [...prefill, ...fromItems];
    }
  }

  // ── ④ 단건 itemCode + sn 프리필 (레거시 호환) ────────────────
  if (sp.itemCode && prefill.length === 0) {
    const it = await prisma.item.findFirst({
      where: { itemCode: sp.itemCode },
      select: { itemCode: true, name: true },
    });
    if (it) {
      prefill = [{
        itemCode: it.itemCode,
        itemName: it.name,
        serialNumber: sp.sn ?? null,
      }];
    }
  }

  const items = await prisma.item.findMany({
    orderBy: { itemCode: "desc" },
    take: 1000,
    select: { id: true, itemCode: true, name: true },
  });

  return (
    <main className="flex-1 p-8 print:p-0">
      <div className="mx-auto max-w-5xl print:max-w-none">
        <div className="mb-6 print:hidden">
          <Link href="/inventory/transactions" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">{t("page.invTxn.back", L)}</Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.qrLabel.title", L)}</h1>
          <p className="mt-1 text-[12px] text-[color:var(--tts-sub)]">
            {t("label.qrLabelDescription", L)}
          </p>
        </div>
        <Card className="print:border-0 print:shadow-none">
          <LabelsClient
            lang={L}
            items={items.map((i) => ({ value: i.id, label: `${i.itemCode} · ${i.name}`, itemCode: i.itemCode, itemName: i.name }))}
            prefill={prefill}
            printHeader={printHeader}
          />
        </Card>
      </div>
    </main>
  );
}
