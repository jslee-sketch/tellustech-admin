"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Note } from "@/components/ui";

type Billing = {
  id: string;
  serialNumber: string;
  billingMonth: string; // YYYY-MM
  counterBw: number | null;
  counterColor: number | null;
  computedAmount: string | null;
};

export function PortalUsageConfirmForm({ billings }: { billings: Billing[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<Record<string, string>>({});

  function captureSignature(billingId: string) {
    // 간이 전자서명 — 사용자가 이름을 입력하면 그것을 base64 텍스트로 저장.
    // 본격 캔버스 서명은 components/signature-canvas.tsx 로 추후 통합.
    const name = prompt("성함을 입력하시면 전자서명으로 처리됩니다");
    if (!name) return;
    const stamp = `signed:${name}@${new Date().toISOString()}`;
    const b64 = typeof window !== "undefined" ? window.btoa(unescape(encodeURIComponent(stamp))) : stamp;
    setSignaturePreview((prev) => ({ ...prev, [billingId]: b64 }));
  }

  async function confirm(billingId: string) {
    const sig = signaturePreview[billingId];
    if (!sig) {
      setError("먼저 전자서명을 입력해 주세요.");
      return;
    }
    setBusy(billingId);
    setError(null);
    try {
      const res = await fetch("/api/portal/usage-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingId, signature: sig }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "컨펌 실패");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {error && <Note tone="danger">{error}</Note>}
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[color:var(--tts-muted)]">
            <th className="py-1">월</th>
            <th>S/N</th>
            <th className="text-right">흑백</th>
            <th className="text-right">컬러</th>
            <th className="text-right">청구액</th>
            <th>컨펌</th>
          </tr>
        </thead>
        <tbody>
          {billings.map((b) => (
            <tr key={b.id} className="border-t border-[color:var(--tts-line)]">
              <td className="py-1">{b.billingMonth}</td>
              <td className="font-mono">{b.serialNumber}</td>
              <td className="text-right">{b.counterBw ?? "-"}</td>
              <td className="text-right">{b.counterColor ?? "-"}</td>
              <td className="text-right">{b.computedAmount ? Number(b.computedAmount).toLocaleString() : "-"}</td>
              <td className="space-x-2">
                <button
                  type="button"
                  onClick={() => captureSignature(b.id)}
                  className="text-[color:var(--tts-primary)] hover:underline"
                >
                  서명 {signaturePreview[b.id] ? "✓" : ""}
                </button>
                <Button onClick={() => confirm(b.id)} disabled={busy === b.id || !signaturePreview[b.id]}>
                  {busy === b.id ? "..." : "확인"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
