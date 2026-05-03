"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Row, Select, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Account = { id: string; accountCode: string; accountName: string; bankName: string; accountNumber: string; currency: string; accountType: string; currentBalance: number; isActive: boolean };

export function AccountsClient({ accounts, lang }: { accounts: Account[]; lang: Lang }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ accountCode: "", accountName: "", bankName: "", accountNumber: "", currency: "VND", accountType: "CHECKING", openingBalance: "0", lowBalanceThreshold: "" });
  const [busy, setBusy] = useState(false);
  const total = accounts.reduce((s, a) => s + a.currentBalance, 0);

  async function save() {
    setBusy(true);
    const r = await fetch("/api/finance/bank-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setBusy(false);
    if (r.ok) { setOpen(false); router.refresh(); }
    else alert("save failed");
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="text-[12px] text-[color:var(--tts-sub)]">{t("finance.totalBalance", lang)}: <span className="font-mono font-bold text-[color:var(--tts-text)]">{total.toLocaleString()}</span></div>
        <Button onClick={() => setOpen(!open)}>+ {t("nav.cashAccounts", lang)}</Button>
      </div>
      {open && (
        <div className="mb-4 rounded-md border border-[color:var(--tts-border)] p-3">
          <Row>
            <Field label="Code" required width="140px"><TextInput value={form.accountCode} onChange={(e) => setForm({ ...form, accountCode: e.target.value })} placeholder="ACC-001" /></Field>
            <Field label={t("finance.bankName", lang)} required><TextInput value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Vietcombank" /></Field>
            <Field label="Name" required><TextInput value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} placeholder="VCB BN Main" /></Field>
          </Row>
          <Row>
            <Field label={t("finance.accountNumber", lang)} required><TextInput value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} /></Field>
            <Field label={t("finance.accountType", lang)} required width="160px">
              <Select value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })} options={[
                { value: "CHECKING", label: "CHECKING" },
                { value: "SAVINGS", label: "SAVINGS" },
                { value: "CASH", label: "CASH" },
                { value: "OTHER", label: "OTHER" },
              ]} />
            </Field>
            <Field label="Currency" width="100px">
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} options={[
                { value: "VND", label: "VND" }, { value: "USD", label: "USD" }, { value: "KRW", label: "KRW" },
              ]} />
            </Field>
          </Row>
          <Row>
            <Field label={t("finance.openingBalance", lang)}><TextInput value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} type="number" /></Field>
            <Field label="Low Threshold"><TextInput value={form.lowBalanceThreshold} onChange={(e) => setForm({ ...form, lowBalanceThreshold: e.target.value })} type="number" /></Field>
          </Row>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>cancel</Button>
            <Button onClick={save} disabled={busy}>save</Button>
          </div>
        </div>
      )}
      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
          <tr><th className="py-2 text-left">Code</th><th className="text-left">{t("finance.bankName", lang)}</th><th className="text-left">Name</th><th className="text-left">{t("finance.accountNumber", lang)}</th><th className="text-left">{t("finance.accountType", lang)}</th><th className="text-right">{t("finance.balance", lang)}</th></tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-b border-[color:var(--tts-border)]/50">
              <td className="py-2 font-mono">{a.accountCode}</td>
              <td>{a.bankName}</td>
              <td>{a.accountName}</td>
              <td className="font-mono text-[11px]">{a.accountNumber}</td>
              <td>{a.accountType}</td>
              <td className="text-right font-mono font-bold">{a.currentBalance.toLocaleString()} {a.currency}</td>
            </tr>
          ))}
          {accounts.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-[color:var(--tts-muted)]">no accounts yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
