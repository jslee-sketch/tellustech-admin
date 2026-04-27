"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Note, SignatureModal } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Billing = {
  id: string;
  serialNumber: string;
  billingMonth: string; // YYYY-MM
  counterBw: number | null;
  counterColor: number | null;
  computedAmount: string | null;
};

export function PortalUsageConfirmForm({ billings, lang }: { billings: Billing[]; lang: Lang }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<Record<string, string>>({});
  const [signOpenFor, setSignOpenFor] = useState<string | null>(null);

  async function confirm(billingId: string) {
    const sig = signaturePreview[billingId];
    if (!sig) {
      setError(t("msg.signFirst", lang));
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
        setError(body?.error ?? t("msg.confirmFailed", lang));
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
            <th className="py-1">{t("th.month", lang)}</th>
            <th>{t("th.snTM", lang)}</th>
            <th className="text-right">{t("th.bw", lang)}</th>
            <th className="text-right">{t("th.color", lang)}</th>
            <th className="text-right">{t("th.chargeAmount", lang)}</th>
            <th>{t("th.confirmCol", lang)}</th>
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
                <Button type="button" size="sm" variant="ghost" onClick={() => setSignOpenFor(b.id)}>
                  ✍️ {t("label.signature", lang)} {signaturePreview[b.id] ? "✓" : ""}
                </Button>
                <Button onClick={() => confirm(b.id)} disabled={busy === b.id || !signaturePreview[b.id]}>
                  {busy === b.id ? "..." : t("btn.confirmShort", lang)}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <SignatureModal
        open={!!signOpenFor}
        onClose={() => setSignOpenFor(null)}
        onSubmit={(dataUrl) => {
          if (signOpenFor) setSignaturePreview((prev) => ({ ...prev, [signOpenFor]: dataUrl }));
        }}
        title={`서명 / Ký tên — ${signOpenFor ? billings.find(b => b.id === signOpenFor)?.serialNumber : ""}`}
      />
    </div>
  );
}
