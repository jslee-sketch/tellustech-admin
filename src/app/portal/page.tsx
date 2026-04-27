import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Badge, Card } from "@/components/ui";
import LogoutButton from "../logout-button";
import { ConfirmButton } from "./confirm-button";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "primary"|"warn"|"success"|"accent"|"neutral"|"danger"> = {
  RECEIVED: "warn",
  IN_PROGRESS: "primary",
  DISPATCHED: "primary",
  COMPLETED: "accent",
  CONFIRMED: "success",
  CANCELED: "neutral",
};
const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "요청 / Yêu cầu",
  IN_PROGRESS: "진행중 / Đang xử lý",
  DISPATCHED: "출동중 / Đang đến",
  COMPLETED: "완료 / Hoàn tất",
  CONFIRMED: "확인됨 / Đã xác nhận",
  CANCELED: "취소 / Hủy",
};

export default async function PortalHome() {
  const session = await getSession();
  const L = session.language;
  if (session.role !== "CLIENT") return <div className="p-8">{t("portal.clientOnly", L)}</div>;

  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
  if (!user?.clientAccount) return <div className="p-8">{t("portal.notLinked", L)}</div>;
  const client = user.clientAccount;

  const [contracts, tickets, certCount] = await Promise.all([
    prisma.itContract.findMany({
      where: { clientId: client.id },
      orderBy: { contractNumber: "desc" },
      take: 10,
      include: { _count: { select: { equipment: true } } },
    }),
    prisma.asTicket.findMany({
      where: { clientId: client.id },
      orderBy: { receivedAt: "desc" },
      take: 20,
      select: { id: true, ticketNumber: true, kind: true, status: true, receivedAt: true, completedAt: true },
    }),
    prisma.salesItem.count({
      where: {
        sales: { clientId: client.id, project: { salesType: "CALIBRATION" } },
        OR: [{ certNumber: { not: null } }, { certFileId: { not: null } }],
      },
    }),
  ]);

  const blocked = client.receivableStatus === "BLOCKED";

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)]">{t("portal.title", L)}</div>
            <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
              {client.companyNameVi}
              <span className="ml-3 font-mono text-[13px] text-[color:var(--tts-primary)]">{client.clientCode}</span>
              {blocked && <span className="ml-2"><Badge tone="danger">{t("portal.arBlocked", L)}</Badge></span>}
            </h1>
          </div>
          <LogoutButton />
        </div>

        {blocked && (
          <div className="mb-4 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[13px] text-[color:var(--tts-danger)]">
            {t("portal.arBlockedDesc", L)}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="빠른 요청 / Yêu cầu nhanh">
            <ul className="space-y-2 text-[14px]">
              <li>
                <Link href="/portal/as-request" className={blocked ? "text-[color:var(--tts-muted)] line-through" : "text-[color:var(--tts-primary)] hover:underline"}>
                  🛠 AS 요청 / Yêu cầu BH
                </Link>
              </li>
              <li>
                <Link href="/portal/supplies-request" className={blocked ? "text-[color:var(--tts-muted)] line-through" : "text-[color:var(--tts-primary)] hover:underline"}>
                  📦 소모품 요청 / Yêu cầu vật tư
                </Link>
              </li>
              <li>
                <Link href="/portal/usage-confirm" className="text-[color:var(--tts-primary)] hover:underline">
                  ✍️ 사용량 컨펌 / Xác nhận sử dụng
                </Link>
              </li>
              <li>
                <Link href="/portal/cal-certs" className="text-[color:var(--tts-primary)] hover:underline">
                  📄 교정성적서 / Chứng chỉ ({certCount})
                </Link>
              </li>
            </ul>
          </Card>

          <Card title="내 IT 계약 / Hợp đồng IT" count={contracts.length}>
            {contracts.length === 0 ? (
              <p className="text-[13px] text-[color:var(--tts-muted)]">{t("portal.noContracts", L)}</p>
            ) : (
              <ul className="space-y-1 text-[13px]">
                {contracts.map((c) => (
                  <li key={c.id} className="flex justify-between">
                    <span className="font-mono text-[color:var(--tts-primary)]">{c.contractNumber}</span>
                    <span className="text-[color:var(--tts-muted)]">{c.status} · {c._count.equipment} 대</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 통합 요청 현황 — 최근 AS 카드 대체 */}
          <Card title="내 요청 현황 / Trạng thái yêu cầu" count={tickets.length} className="md:col-span-2">
            {tickets.length === 0 ? (
              <p className="text-[13px] text-[color:var(--tts-muted)]">아직 요청이 없습니다 / Chưa có yêu cầu</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
                  <tr>
                    <th className="px-2 py-1 text-left">접수번호 / Số</th>
                    <th className="px-2 py-1 text-left">종류 / Loại</th>
                    <th className="px-2 py-1 text-left">접수일 / Ngày</th>
                    <th className="px-2 py-1 text-left">상태 / Trạng thái</th>
                    <th className="px-2 py-1 text-right">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((tk) => (
                    <tr key={tk.id} className="border-b border-[color:var(--tts-border)]/50">
                      <td className="px-2 py-2 font-mono">{tk.ticketNumber}</td>
                      <td className="px-2 py-2">{tk.kind === "SUPPLIES_REQUEST" ? "📦 소모품 / Vật tư" : "🛠 AS / BH"}</td>
                      <td className="px-2 py-2">{tk.receivedAt.toISOString().slice(0,10)}</td>
                      <td className="px-2 py-2">
                        <Badge tone={STATUS_TONE[tk.status] ?? "neutral"}>{STATUS_LABEL[tk.status] ?? tk.status}</Badge>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {tk.status === "COMPLETED" && (
                          <ConfirmButton ticketId={tk.id} />
                        )}
                      </td>
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

