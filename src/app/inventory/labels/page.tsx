import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { LabelsClient } from "./labels-client";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ purchaseId?: string }> };

export default async function LabelsPage({ searchParams }: PageProps) {
  const session = await getSession();
  const L = session.language;
  const { purchaseId } = await searchParams;

  // 매입 ID 가 오면 해당 매입의 품목+S/N 자동 프리필
  let prefill: { itemCode: string; itemName: string; serialNumber: string | null }[] = [];
  if (purchaseId) {
    const pur = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: { include: { item: { select: { itemCode: true, name: true } } } } },
    });
    if (pur) {
      prefill = pur.items.map((i) => ({
        itemCode: i.item.itemCode,
        itemName: i.item.name,
        serialNumber: i.serialNumber,
      }));
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
            크기 3종 (대/중/소) · A4 자동 배치 · 절취선 표시. 품목과 S/N 을 추가한 후 [인쇄] 로 OS 프린트 다이얼로그를 엽니다.
          </p>
        </div>
        <Card className="print:border-0 print:shadow-none">
          <LabelsClient
            items={items.map((i) => ({ value: i.id, label: `${i.itemCode} · ${i.name}`, itemCode: i.itemCode, itemName: i.name }))}
            prefill={prefill}
          />
        </Card>
      </div>
    </main>
  );
}
