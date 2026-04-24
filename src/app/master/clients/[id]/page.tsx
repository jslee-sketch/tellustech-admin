import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { ClientDetail } from "./client-detail";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  await getSession();

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      referrer: { select: { id: true, clientCode: true, companyNameVi: true } },
      referrerEmployee: { select: { id: true, employeeCode: true, nameVi: true } },
      salesPic: { select: { id: true, employeeCode: true, nameVi: true } },
    },
  });
  if (!client) notFound();

  // 소개자(거래처) 검색용 — 자기 자신 제외, 코드순 상위 200건
  const referrerCandidates = await prisma.client.findMany({
    where: { id: { not: id } },
    orderBy: { clientCode: "desc" },
    take: 200,
    select: { id: true, clientCode: true, companyNameVi: true },
  });

  // 직원(소개자/영업담당) 검색용 — 활성 재직자만, 회사 무관 (거래처는 공유 마스터)
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ companyCode: "asc" }, { employeeCode: "asc" }],
    select: { id: true, employeeCode: true, nameVi: true, companyCode: true },
  });

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/master/clients"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            ← 거래처 목록
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
            {client.companyNameVi}
            <span className="ml-3 font-mono text-[13px] text-[color:var(--tts-primary)]">
              {client.clientCode}
            </span>
          </h1>
        </div>
        <Card>
          <ClientDetail
            clientId={client.id}
            initial={{
              clientCode: client.clientCode,
              companyNameVi: client.companyNameVi,
              companyNameEn: client.companyNameEn ?? "",
              companyNameKo: client.companyNameKo ?? "",
              representative: client.representative ?? "",
              taxCode: client.taxCode ?? "",
              businessLicenseNo: client.businessLicenseNo ?? "",
              industry: client.industry ?? "",
              bankName: client.bankName ?? "",
              bankAccountNumber: client.bankAccountNumber ?? "",
              bankHolder: client.bankHolder ?? "",
              paymentTerms: client.paymentTerms?.toString() ?? "",
              address: client.address ?? "",
              phone: client.phone ?? "",
              email: client.email ?? "",
              emailConsent: client.emailConsent,
              notes: client.notes ?? "",
              leadSource: client.leadSource ?? "",
              referrerId: client.referrerId ?? "",
              referrerEmployeeId: client.referrerEmployeeId ?? "",
              salesPicId: client.salesPicId ?? "",
              grade: client.grade ?? "",
              receivableStatus: client.receivableStatus,
              marketingTags: client.marketingTags,
            }}
            contacts={client.contacts.map((c) => ({
              id: c.id,
              name: c.name,
              position: c.position ?? "",
              phone: c.phone ?? "",
              email: c.email ?? "",
              isPrimary: c.isPrimary,
            }))}
            referrerCandidates={referrerCandidates.map((r) => ({
              value: r.id,
              label: `${r.clientCode} · ${r.companyNameVi}`,
            }))}
            employeeOptions={employees.map((e) => ({
              value: e.id,
              label: `${e.companyCode} · ${e.employeeCode} · ${e.nameVi}`,
            }))}
          />
        </Card>
      </div>
    </main>
  );
}
