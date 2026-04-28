"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import type { Lang } from "@/lib/i18n";

const STATUS_TONE: Record<string, "warn" | "primary" | "accent" | "success" | "neutral"> = {
  COLLECTED: "warn",
  CUSTOMER_NOTIFIED: "primary",
  CUSTOMER_CONFIRMED: "accent",
  ADMIN_CONFIRMED: "primary",
  PDF_GENERATED: "success",
  BILLED: "success",
};

const STATUS_LABEL: Record<string, string> = {
  COLLECTED: "⬜ 수집완료",
  CUSTOMER_NOTIFIED: "🟡 고객알림됨",
  CUSTOMER_CONFIRMED: "🟢 고객CFM완료",
  ADMIN_CONFIRMED: "🔵 관리자CFM",
  PDF_GENERATED: "📄 PDF생성됨",
  BILLED: "✅ 매출연결",
};

export function UsageConfirmAdminClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  async function refetch() {
    const r = await fetch("/api/usage-confirmations", { credentials: "same-origin" });
    const j = await r.json(); setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function action(id: string, path: string, body?: any) {
    setBusyId(id);
    try {
      const r = await fetch(`/api/usage-confirmations/${id}/${path}`, { method: "POST", headers: body ? { "Content-Type": "application/json" } : undefined, credentials: "same-origin", body: body ? JSON.stringify(body) : undefined });
      const j = await r.json();
      if (!r.ok) { alert(`실패: ${j?.error ?? "unknown"}`); return; }
      refetch();
    } finally { setBusyId(null); }
  }

  async function notify(id: string) { action(id, "notify"); }
  async function manualConfirm(id: string) {
    const note = prompt("수동 CFM 메모 (예: 04-26 전화 확인)");
    if (!note) return;
    action(id, "manual-confirm", { customerNote: note });
  }
  async function adminConfirm(id: string) { action(id, "admin-confirm"); }
  async function generatePdf(id: string) { action(id, "generate-pdf"); }
  async function createBilling(id: string) {
    if (!confirm("매출 전표를 생성합니다. 이 작업은 미수금 자동 발생을 일으킵니다. 계속?")) return;
    action(id, "create-billing");
  }
  async function downloadPdf(fileId: string) {
    window.open(`/api/files/${fileId}/download`, "_blank");
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-4 text-2xl font-extrabold">📋 사용량 확인서 관리</h1>
        <Card count={items.length}>
          <table className="w-full text-[12px]">
            <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
              <tr>
                <th className="px-2 py-1 text-left">확인코드</th>
                <th className="px-2 py-1 text-left">계약</th>
                <th className="px-2 py-1 text-left">거래처</th>
                <th className="px-2 py-1 text-left">월</th>
                <th className="px-2 py-1 text-right">금액</th>
                <th className="px-2 py-1 text-left">상태</th>
                <th className="px-2 py-1 text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-b border-[color:var(--tts-border)]/50">
                  <td className="px-2 py-1.5 font-mono">{u.confirmCode}</td>
                  <td className="px-2 py-1.5 font-mono">{u.contract.contractNumber}</td>
                  <td className="px-2 py-1.5">{u.client.clientCode} {u.client.companyNameVi}</td>
                  <td className="px-2 py-1.5">{u.billingMonth}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{Number(u.totalAmount).toLocaleString("vi-VN")}₫</td>
                  <td className="px-2 py-1.5"><Badge tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status] ?? u.status}</Badge></td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    {u.status === "COLLECTED" && <button disabled={busyId === u.id} onClick={() => notify(u.id)} className="rounded bg-[color:var(--tts-accent)] px-2 py-0.5 text-[10px] text-white">고객알림</button>}
                    {u.status === "CUSTOMER_NOTIFIED" && (
                      <>
                        <button disabled={busyId === u.id} onClick={() => notify(u.id)} className="mr-1 rounded border border-[color:var(--tts-border)] px-2 py-0.5 text-[10px]">재알림</button>
                        <button disabled={busyId === u.id} onClick={() => manualConfirm(u.id)} className="rounded bg-[color:var(--tts-warn)] px-2 py-0.5 text-[10px] text-white">수동CFM</button>
                      </>
                    )}
                    {u.status === "CUSTOMER_CONFIRMED" && <button disabled={busyId === u.id} onClick={() => adminConfirm(u.id)} className="rounded bg-[color:var(--tts-success)] px-2 py-0.5 text-[10px] text-white">관리자CFM</button>}
                    {u.status === "ADMIN_CONFIRMED" && <button disabled={busyId === u.id} onClick={() => generatePdf(u.id)} className="rounded bg-[color:var(--tts-accent)] px-2 py-0.5 text-[10px] text-white">PDF생성</button>}
                    {u.status === "PDF_GENERATED" && (
                      <>
                        {u.pdfFileId && <button onClick={() => downloadPdf(u.pdfFileId)} className="mr-1 rounded border border-[color:var(--tts-border)] px-2 py-0.5 text-[10px]">📄 PDF</button>}
                        <button disabled={busyId === u.id} onClick={() => createBilling(u.id)} className="rounded bg-[color:var(--tts-success)] px-2 py-0.5 text-[10px] text-white">매출 전표</button>
                      </>
                    )}
                    {u.status === "BILLED" && u.pdfFileId && <button onClick={() => downloadPdf(u.pdfFileId)} className="rounded border border-[color:var(--tts-border)] px-2 py-0.5 text-[10px]">📄 PDF</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </main>
  );
}
