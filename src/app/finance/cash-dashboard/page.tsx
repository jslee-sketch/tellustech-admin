import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type DashData = {
  accounts: Array<{ id: string; accountCode: string; accountName: string; bankName: string; currency: string; currentBalance: string | number | null }>;
  totalBalanceLocal: number;
  forecast: { next7days: { expectedIn: number; expectedOut: number }; next14days: { expectedIn: number; expectedOut: number }; next30days: { expectedIn: number; expectedOut: number } };
  topReceivables: Array<{ id: string; clientLabel: string | null; amount: number; dueDate: string | null; daysRemaining: number | null }>;
  topPayables:    Array<{ id: string; clientLabel: string | null; amount: number; dueDate: string | null; daysRemaining: number | null }>;
  monthlyTrend: Array<{ month: string; totalIn: number; totalOut: number; netFlow: number }>;
};

async function fetchDashboard(): Promise<DashData | null> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  if (!host) return null;
  const cookie = h.get("cookie") ?? "";
  const r = await fetch(`${proto}://${host}/api/finance/cash-dashboard`, { headers: { cookie }, cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json();
  return j.data as DashData;
}

export default async function CashDashboardPage() {
  const session = await getSession();
  const L = session.language;
  const data = await fetchDashboard();
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl space-y-4">
        <h1 className="text-2xl font-extrabold text-[color:var(--tts-text)]">{t("nav.cashDashboard", L)}</h1>

        {!data ? <Card><div className="py-6 text-center text-[color:var(--tts-muted)]">no data</div></Card> : (
          <>
            <Card title={t("finance.totalBalance", L)}>
              <div className="text-3xl font-mono font-bold text-[color:var(--tts-accent)]">{Math.round(data.totalBalanceLocal).toLocaleString()} VND</div>
              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                {data.accounts.map((a) => (
                  <div key={a.id} className="rounded-md border border-[color:var(--tts-border)] p-2 text-[11px]">
                    <div className="font-mono">{a.accountCode}</div>
                    <div className="font-bold text-[12px]">{a.bankName}</div>
                    <div className="mt-1 font-mono">{Number(a.currentBalance ?? 0).toLocaleString()} {a.currency}</div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(["next7days","next14days","next30days"] as const).map((k) => (
                <Card key={k} title={t(`finance.${k}`, L)}>
                  <div className="text-[11px] text-[color:var(--tts-sub)]">{t("finance.expectedIn", L)}</div>
                  <div className="font-mono text-[14px] text-emerald-500">+ {Math.round(data.forecast[k].expectedIn).toLocaleString()}</div>
                  <div className="mt-2 text-[11px] text-[color:var(--tts-sub)]">{t("finance.expectedOut", L)}</div>
                  <div className="font-mono text-[14px] text-rose-500">− {Math.round(data.forecast[k].expectedOut).toLocaleString()}</div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card title={t("finance.topReceivables", L)} count={data.topReceivables.length}>
                <table className="w-full text-[11px]">
                  <thead><tr className="text-[color:var(--tts-sub)]"><th className="text-left">Client</th><th className="text-right">금액</th><th className="text-right">D-day</th></tr></thead>
                  <tbody>{data.topReceivables.map((r) => (<tr key={r.id} className="border-t border-[color:var(--tts-border)]/40"><td className="py-1">{r.clientLabel}</td><td className="text-right font-mono">{Math.round(r.amount).toLocaleString()}</td><td className="text-right font-mono">{r.daysRemaining ?? "—"}</td></tr>))}</tbody>
                </table>
              </Card>
              <Card title={t("finance.topPayables", L)} count={data.topPayables.length}>
                <table className="w-full text-[11px]">
                  <thead><tr className="text-[color:var(--tts-sub)]"><th className="text-left">Client</th><th className="text-right">금액</th><th className="text-right">D-day</th></tr></thead>
                  <tbody>{data.topPayables.map((r) => (<tr key={r.id} className="border-t border-[color:var(--tts-border)]/40"><td className="py-1">{r.clientLabel}</td><td className="text-right font-mono">{Math.round(r.amount).toLocaleString()}</td><td className="text-right font-mono">{r.daysRemaining ?? "—"}</td></tr>))}</tbody>
                </table>
              </Card>
            </div>

            <Card title={t("finance.monthlyTrend", L)}>
              <table className="w-full text-[12px]">
                <thead><tr className="text-[color:var(--tts-sub)]"><th className="text-left">Month</th><th className="text-right">IN</th><th className="text-right">OUT</th><th className="text-right">Net</th></tr></thead>
                <tbody>{data.monthlyTrend.map((m) => (<tr key={m.month} className="border-t border-[color:var(--tts-border)]/40"><td className="py-1 font-mono">{m.month}</td><td className="text-right font-mono text-emerald-500">+ {Math.round(m.totalIn).toLocaleString()}</td><td className="text-right font-mono text-rose-500">− {Math.round(m.totalOut).toLocaleString()}</td><td className="text-right font-mono font-bold">{Math.round(m.netFlow).toLocaleString()}</td></tr>))}</tbody>
              </table>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
