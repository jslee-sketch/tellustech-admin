"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { Badge, Card } from "@/components/ui";

type Equipment = { serialNumber: string; itemName: string; monthlyFee: number; installedAt: string | null };
type Contract = { code: string; status: string; startDate: string | null; endDate: string | null; equipmentCount: number; equipment: Equipment[] };
type Payment = {
  id: string;
  period: string;
  invoiceCode: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  revisedDueDate: string | null;
  effectiveDueDate: string | null;
  paidDate: string | null;
  remainingDays: number | null;
  remainingDaysColor: string;
  remainingDaysLabel: string;
  status: string;
};
type Summary = { totalUnpaid: number; unpaidCount: number; overdueCount: number; overdueAmount: number };

const COLOR_VAR: Record<string, string> = {
  green: "var(--tts-success)",
  yellow: "var(--tts-warn)",
  orange: "var(--tts-warn)",
  red: "var(--tts-danger)",
  "": "var(--tts-muted)",
};

function statusBadge(status: string, days: number | null, lang: Lang) {
  if (status === "PAID") return <Badge tone="success">✅ {t("portal.status.paid", lang)}</Badge>;
  if (days === null) return <Badge tone="neutral">{status}</Badge>;
  if (days > 3) return <Badge tone="danger">🔴 {t("portal.status.overdue", lang)}</Badge>;
  if (days > 0) return <Badge tone="danger">🔴 {t("portal.status.overdue", lang)}</Badge>;
  if (days === 0) return <Badge tone="warn">🟡 {t("portal.status.dueToday", lang)}</Badge>;
  if (days >= -3) return <Badge tone="warn">🟠 {t("portal.status.imminent", lang)}</Badge>;
  return <Badge tone="success">🟢 {t("portal.status.upcoming", lang)}</Badge>;
}

export function ServiceStatusView({ type, title, lang, emptyMsg, emptyCtaQuote }: {
  type: "oa_rental" | "tm_rental" | "repair" | "calibration" | "maintenance" | "purchase";
  title: string;
  lang: Lang;
  emptyMsg: string;
  emptyCtaQuote: string;
}) {
  const [data, setData] = useState<{ contracts: Contract[]; payments: Payment[]; summary: Summary; isEmpty: boolean } | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/portal/service-status?type=${type}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ contracts: [], payments: [], summary: { totalUnpaid: 0, unpaidCount: 0, overdueCount: 0, overdueAmount: 0 }, isEmpty: true }));
  }, [type]);

  if (!data) return <div className="p-8 text-[color:var(--tts-muted)]">{t("common.loading", lang)}</div>;

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-5 text-2xl font-extrabold">{title}</h1>

        {data.isEmpty ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 text-[14px] font-bold">{emptyMsg}</div>
              <div className="mb-5 text-[13px] text-[color:var(--tts-sub)]">{emptyCtaQuote}</div>
              <Link href={`/portal/quotes?type=${type.toUpperCase()}`} className="rounded bg-[color:var(--tts-accent)] px-5 py-2 text-[13px] font-bold text-white hover:opacity-90">{t("portal.status.requestQuote", lang)}</Link>
            </div>
          </Card>
        ) : (
          <>
            {data.contracts.length > 0 && (
              <Card title={t("portal.contracts", lang)} count={data.contracts.length}>
                <div className="space-y-2">
                  {data.contracts.map((c) => (
                    <div key={c.code} className="rounded-md border border-[color:var(--tts-border)]">
                      <button onClick={() => setExpandedCode(expandedCode === c.code ? null : c.code)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[color:var(--tts-card-hover)]">
                        <span className="font-mono text-[13px] font-bold text-[color:var(--tts-primary)]">{c.code}</span>
                        <span className="flex items-center gap-3 text-[12px]">
                          <Badge tone={c.status === "ACTIVE" ? "success" : "neutral"}>{c.status}</Badge>
                          <span className="text-[color:var(--tts-sub)]">{c.equipmentCount} {t("portal.units", lang)}</span>
                          <span className="text-[color:var(--tts-muted)]">{c.startDate} ~ {c.endDate ?? "—"}</span>
                          <span>{expandedCode === c.code ? "▼" : "▶"}</span>
                        </span>
                      </button>
                      {expandedCode === c.code && c.equipment.length > 0 && (
                        <div className="border-t border-[color:var(--tts-border)] p-3">
                          <table className="w-full text-[12px]">
                            <thead className="text-[11px] text-[color:var(--tts-sub)]">
                              <tr>
                                <th className="px-2 py-1 text-left">{t("portal.serialNumber", lang)}</th>
                                <th className="px-2 py-1 text-left">{t("portal.itemName", lang)}</th>
                                <th className="px-2 py-1 text-right">{t("portal.monthlyFee", lang)}</th>
                                <th className="px-2 py-1 text-left">{t("portal.installedAt", lang)}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {c.equipment.map((e) => (
                                <tr key={e.serialNumber} className="border-t border-[color:var(--tts-border)]/50">
                                  <td className="px-2 py-1 font-mono">{e.serialNumber}</td>
                                  <td className="px-2 py-1">{e.itemName}</td>
                                  <td className="px-2 py-1 text-right font-mono">{new Intl.NumberFormat("vi-VN").format(e.monthlyFee)}</td>
                                  <td className="px-2 py-1">{e.installedAt ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="mt-4">
              <Card title={t("portal.paymentStatus", lang)} count={data.payments.length}>
                {data.payments.length === 0 ? (
                  <p className="text-[13px] text-[color:var(--tts-muted)]">{t("portal.noPayments", lang)}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
                        <tr>
                          <th className="px-2 py-1 text-left">{t("portal.period", lang)}</th>
                          <th className="px-2 py-1 text-left">{t("col.refReceipt", lang)}</th>
                          <th className="px-2 py-1 text-right">{t("portal.amount", lang)}</th>
                          <th className="px-2 py-1 text-left">{t("portal.status.dueDate", lang)}</th>
                          <th className="px-2 py-1 text-left">{t("portal.status.paidDate", lang)}</th>
                          <th className="px-2 py-1 text-right">{t("portal.status.remainingDays", lang)}</th>
                          <th className="px-2 py-1 text-left">{t("col.statusShort", lang)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.payments.map((p) => (
                          <tr key={p.id} className="border-b border-[color:var(--tts-border)]/50">
                            <td className="px-2 py-1.5">{p.period}</td>
                            <td className="px-2 py-1.5 font-mono">{p.invoiceCode}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{new Intl.NumberFormat("vi-VN").format(p.amount)}</td>
                            <td className="px-2 py-1.5">{p.effectiveDueDate ?? "—"}</td>
                            <td className="px-2 py-1.5">{p.paidDate ?? "—"}</td>
                            <td className="px-2 py-1.5 text-right font-mono font-bold" style={{ color: COLOR_VAR[p.remainingDaysColor] }}>{p.remainingDaysLabel || "—"}</td>
                            <td className="px-2 py-1.5">{statusBadge(p.status, p.remainingDays, lang)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-4 border-t border-[color:var(--tts-border)] pt-2 text-[12px]">
                  <div>{t("portal.unpaidTotal", lang)}: <span className="font-mono font-bold text-[color:var(--tts-warn)]">{new Intl.NumberFormat("vi-VN").format(data.summary.totalUnpaid)}₫</span> ({data.summary.unpaidCount}{t("portal.cases", lang)})</div>
                  {data.summary.overdueCount > 0 && (
                    <div>{t("portal.overdueTotal", lang)}: <span className="font-mono font-bold text-[color:var(--tts-danger)]">{new Intl.NumberFormat("vi-VN").format(data.summary.overdueAmount)}₫</span> ({data.summary.overdueCount}{t("portal.cases", lang)})</div>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
