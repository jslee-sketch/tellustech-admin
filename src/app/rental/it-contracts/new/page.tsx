import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { ItContractNewForm } from "./it-contract-new-form";

export const dynamic = "force-dynamic";

export default async function NewItContractPage() {
  const session = await getSession();

  // 거래처 옵션 — 상위 200 (많아지면 검색 콤보 필요)
  const clients = await prisma.client.findMany({
    orderBy: { clientCode: "desc" },
    take: 200,
    select: { id: true, clientCode: true, companyNameVi: true },
  });

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href="/rental/it-contracts"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            ← IT 계약 목록
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">IT 계약 등록</h1>
        </div>
        <Card>
          <ItContractNewForm
            sessionCompany={session.companyCode}
            clientOptions={clients.map((c) => ({
              value: c.id,
              label: `${c.clientCode} · ${c.companyNameVi}`,
            }))}
          />
        </Card>
      </div>
    </main>
  );
}
