"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

const MIN_EXCHANGE = 1_000_000;

const REASON_LABEL_KEY: Record<string, string> = {
  AS_REQUEST: "portal.reason.asRequest",
  SUPPLIES_REQUEST: "portal.reason.suppliesRequest",
  SERVICE_CONFIRM: "portal.reason.serviceConfirm",
  USAGE_CONFIRM: "portal.reason.usageConfirm",
  QUOTE_REQUEST: "portal.reason.quoteRequest",
  FEEDBACK_PRAISE: "portal.reason.feedbackPraise",
  FEEDBACK_IMPROVE: "portal.reason.feedbackImprove",
  FEEDBACK_SUGGEST: "portal.reason.feedbackSuggest",
  SURVEY_COMPLETE: "portal.reason.surveyComplete",
  POST_WRITE: "portal.reason.postWrite",
  POST_READ_BONUS: "portal.reason.postReadBonus",
  REFERRAL_CONTRACT: "portal.reason.referralContract",
  ADMIN_GRANT: "portal.reason.adminGrant",
  ADMIN_DEDUCT: "portal.reason.adminDeduct",
  REWARD_EXCHANGE: "portal.reason.rewardExchange",
};

export function PointsClient({ lang }: { lang: Lang }) {
  const [data, setData] = useState<{ balance: number; items: any[] } | null>(null);
  const [exchangeOpen, setExchangeOpen] = useState(false);

  async function refetch() {
    const r = await fetch("/api/portal/points", { credentials: "same-origin" });
    const j = await r.json();
    if (typeof j?.balance === "number") setData(j);
  }

  useEffect(() => { refetch(); }, []);

  if (!data) return <div className="p-8 text-[color:var(--tts-muted)]">{t("common.loading", lang)}</div>;

  const progress = Math.min((data.balance / MIN_EXCHANGE) * 100, 100);
  const canExchange = data.balance >= MIN_EXCHANGE;

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-5 text-2xl font-extrabold">🏆 {t("portal.points.myPoints", lang)}</h1>

        <Card>
          <div className="mb-2 text-[12px] text-[color:var(--tts-sub)]">{t("portal.points.currentBalance", lang)}</div>
          <div className="mb-3 font-mono text-3xl font-bold text-[color:var(--tts-warn)]">{new Intl.NumberFormat("vi-VN").format(data.balance)}d</div>
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-[color:var(--tts-border)]">
            <div className="h-full bg-[color:var(--tts-warn)]" style={{ width: `${progress}%` }} />
          </div>
          <div className="mb-3 text-[11px] text-[color:var(--tts-muted)]">{progress.toFixed(1)}% / {MIN_EXCHANGE.toLocaleString("vi-VN")}d ({t("portal.points.toExchange", lang)})</div>
          <Button onClick={() => setExchangeOpen(true)} disabled={!canExchange} variant={canExchange ? "accent" : undefined}>{t("portal.points.exchange", lang)}</Button>
          {!canExchange && <span className="ml-2 text-[11px] text-[color:var(--tts-muted)]">{t("portal.points.minimum", lang)}</span>}
        </Card>

        <div className="mt-4">
          <Card title={t("portal.points.history", lang)} count={data.items.length}>
            {data.items.length === 0 ? (
              <p className="text-[13px] text-[color:var(--tts-muted)]">{t("portal.points.empty", lang)}</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
                  <tr>
                    <th className="px-2 py-1 text-left">{t("portal.points.date", lang)}</th>
                    <th className="px-2 py-1 text-left">{t("portal.points.reason", lang)}</th>
                    <th className="px-2 py-1 text-right">{t("portal.points.delta", lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it) => (
                    <tr key={it.id} className="border-b border-[color:var(--tts-border)]/50">
                      <td className="px-2 py-1.5">{String(it.createdAt).slice(0, 10)}</td>
                      <td className="px-2 py-1.5">{t(REASON_LABEL_KEY[it.reason] ?? "common.unknown", lang)}{it.reasonDetail && <span className="ml-1 text-[10px] text-[color:var(--tts-muted)]">({it.reasonDetail})</span>}</td>
                      <td className={`px-2 py-1.5 text-right font-mono font-bold ${it.amount > 0 ? "text-[color:var(--tts-success)]" : "text-[color:var(--tts-danger)]"}`}>{it.amount > 0 ? "+" : ""}{new Intl.NumberFormat("vi-VN").format(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="mt-4">
          <Card title={t("portal.points.guide", lang)}>
            <ul className="space-y-1 text-[12px]">
              <li>• {t("portal.points.guideTransactions", lang)}</li>
              <li>• {t("portal.points.guideCommunity", lang)}</li>
              <li>• {t("portal.points.guideSurvey", lang)}</li>
              <li>• {t("portal.points.guideReferral", lang)}</li>
              <li className="mt-2 text-[color:var(--tts-muted)]">※ {t("portal.points.minimumNote", lang)}</li>
            </ul>
          </Card>
        </div>

        {exchangeOpen && <ExchangeModal balance={data.balance} lang={lang} onClose={() => setExchangeOpen(false)} onSuccess={() => { setExchangeOpen(false); refetch(); }} />}
      </div>
    </main>
  );
}

function ExchangeModal({ balance, lang, onClose, onSuccess }: { balance: number; lang: Lang; onClose: () => void; onSuccess: () => void }) {
  const [rewardType, setRewardType] = useState<"INVOICE_DEDUCT" | "GIFT_CARD">("INVOICE_DEDUCT");
  const [amount, setAmount] = useState(MIN_EXCHANGE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxUnits = Math.floor(balance / MIN_EXCHANGE);
  const options: number[] = [];
  for (let i = 1; i <= maxUnits; i++) options.push(i * MIN_EXCHANGE);

  async function submit() {
    setSubmitting(true); setError(null);
    try {
      const r = await fetch("/api/portal/points/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ rewardType, amount }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j?.error ?? "fail"); return; }
      onSuccess();
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-[color:var(--tts-card)] p-5">
        <div className="mb-3 text-[16px] font-bold">🎁 {t("portal.points.exchangeTitle", lang)}</div>
        <div className="mb-3 text-[12px] text-[color:var(--tts-sub)]">{t("portal.points.currentBalance", lang)}: <span className="font-mono font-bold text-[color:var(--tts-warn)]">{new Intl.NumberFormat("vi-VN").format(balance)}d</span></div>

        <div className="mb-3">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[color:var(--tts-muted)]">{t("portal.points.exchangeMethod", lang)}</div>
          <div className="space-y-1.5">
            <label className="flex cursor-pointer items-center gap-2 text-[13px]"><input type="radio" checked={rewardType === "INVOICE_DEDUCT"} onChange={() => setRewardType("INVOICE_DEDUCT")} /> 💰 {t("portal.points.invoiceDeduct", lang)}</label>
            <label className="flex cursor-pointer items-center gap-2 text-[13px]"><input type="radio" checked={rewardType === "GIFT_CARD"} onChange={() => setRewardType("GIFT_CARD")} /> 🎫 {t("portal.points.giftCard", lang)}</label>
          </div>
        </div>

        <div className="mb-3">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[color:var(--tts-muted)]">{t("portal.points.exchangeAmount", lang)}</div>
          <select value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]">
            {options.map((v) => <option key={v} value={v}>{new Intl.NumberFormat("vi-VN").format(v)}d</option>)}
          </select>
        </div>

        {error && <div className="mb-2 rounded bg-[color:var(--tts-danger-dim)] px-2 py-1 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}

        <div className="mt-2 text-[11px] text-[color:var(--tts-muted)]">※ {t("portal.points.exchangeNote", lang)}</div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border border-[color:var(--tts-border)] px-3 py-1.5 text-[12px] hover:bg-[color:var(--tts-card-hover)]">{t("common.cancel", lang)}</button>
          <button onClick={submit} disabled={submitting} className="rounded bg-[color:var(--tts-accent)] px-4 py-1.5 text-[12px] font-bold text-white hover:opacity-90 disabled:opacity-50">{submitting ? "..." : t("portal.points.exchangeSubmit", lang)}</button>
        </div>
      </div>
    </div>
  );
}
