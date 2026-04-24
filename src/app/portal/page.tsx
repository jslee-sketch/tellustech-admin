import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Badge, Card } from "@/components/ui";
import LogoutButton from "../logout-button";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const session = await getSession();
  if (session.role !== "CLIENT") {
    return <div className="p-8">고객 전용 페이지입니다.</div>;
  }

  // session.sub = user.id, clientId 찾기
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { clientAccount: true },
  });
  if (!user?.clientAccount) {
    return <div className="p-8">거래처가 연결되어 있지 않습니다.</div>;
  }
  const client = user.clientAccount;

  const [contracts, tickets, calibCerts] = await Promise.all([
    prisma.itContract.findMany({
      where: { clientId: client.id },
      orderBy: { contractNumber: "desc" },
      take: 10,
      include: { _count: { select: { equipment: true } } },
    }),
    prisma.asTicket.findMany({
      where: { clientId: client.id },
      orderBy: { receivedAt: "desc" },
      take: 10,
    }),
    prisma.salesItem.findMany({
      where: {
        sales: { clientId: client.id, project: { salesType: "CALIBRATION" } },
        OR: [{ certNumber: { not: null } }, { certFileId: { not: null } }],
      },
      orderBy: { issuedAt: "desc" },
      take: 20,
      select: {
        id: true,
        certNumber: true,
        certFileId: true,
        issuedAt: true,
        nextDueAt: true,
        item: { select: { name: true } },
      },
    }),
  ]);

  const blocked = client.receivableStatus === "BLOCKED";

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)]">TELLUSTECH · 고객 포탈</div>
            <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
              {client.companyNameVi}
              <span className="ml-3 font-mono text-[13px] text-[color:var(--tts-primary)]">{client.clientCode}</span>
              {blocked && <span className="ml-2"><Badge tone="danger">미수금 차단</Badge></span>}
            </h1>
          </div>
          <LogoutButton />
        </div>

        {blocked && (
          <div className="mb-4 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[13px] text-[color:var(--tts-danger)]">
            ⚠️ 미수금 상태로 인해 일부 요청이 제한됩니다. 재경팀 담당자에게 문의하세요.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="빠른 요청">
            <ul className="space-y-2 text-[14px]">
              <li>
                <Link
                  href="/portal/as-request"
                  className={blocked ? "text-[color:var(--tts-muted)] line-through" : "text-[color:var(--tts-primary)] hover:underline"}
                >
                  🛠 AS 요청
                </Link>
              </li>
              <li>
                <Link
                  href="/portal/supplies-request"
                  className={blocked ? "text-[color:var(--tts-muted)] line-through" : "text-[color:var(--tts-primary)] hover:underline"}
                >
                  📦 소모품 요청
                </Link>
              </li>
              <li>
                <Link href="/portal/usage-confirm" className="text-[color:var(--tts-primary)] hover:underline">
                  ✍️ 사용량 컨펌 (내 계약)
                </Link>
              </li>
            </ul>
          </Card>

          <Card title="내 IT 계약" count={contracts.length}>
            {contracts.length === 0 ? (
              <p className="text-[13px] text-[color:var(--tts-muted)]">등록된 계약이 없습니다.</p>
            ) : (
              <ul className="space-y-1 text-[13px]">
                {contracts.map((c) => (
                  <li key={c.id} className="flex justify-between">
                    <span className="font-mono text-[color:var(--tts-primary)]">{c.contractNumber}</span>
                    <span className="text-[color:var(--tts-muted)]">
                      {c.status} · 장비 {c._count.equipment}대
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="최근 AS 이력" count={tickets.length}>
            {tickets.length === 0 ? (
              <p className="text-[13px] text-[color:var(--tts-muted)]">AS 기록이 없습니다.</p>
            ) : (
              <ul className="space-y-1 text-[13px]">
                {tickets.map((t) => (
                  <li key={t.id} className="flex justify-between">
                    <span className="font-mono">{t.ticketNumber}</span>
                    <Badge
                      tone={
                        t.status === "COMPLETED"
                          ? "success"
                          : t.status === "CANCELED"
                          ? "neutral"
                          : t.status === "DISPATCHED"
                          ? "accent"
                          : "primary"
                      }
                    >
                      {t.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="교정성적서" count={calibCerts.length}>
            {calibCerts.length === 0 ? (
              <p className="text-[13px] text-[color:var(--tts-muted)]">발행된 성적서가 없습니다.</p>
            ) : (
              <ul className="space-y-1 text-[13px]">
                {calibCerts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span className="font-mono">{c.certNumber ?? c.item.name}</span>
                    {c.certFileId && (
                      <Link href={`/api/files/${c.certFileId}`} className="text-[color:var(--tts-primary)] hover:underline">
                        다운로드
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
