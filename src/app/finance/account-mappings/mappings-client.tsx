"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Mapping = {
  id: string;
  trigger: string;
  accountCode: string;
  accountName: string;
  isActive: boolean;
  description: string | null;
};

type AccountOption = { code: string; name: string; type: string };

const TRIGGERS = [
  "SALES_REVENUE", "SALES_RECEIVABLE", "SALES_VAT_OUT",
  "PURCHASE_INVENTORY", "PURCHASE_PAYABLE", "PURCHASE_VAT_IN",
  "CASH_IN", "CASH_OUT", "CASH_TRANSFER",
  "EXPENSE_OPEX", "EXPENSE_CASH",
  "PAYROLL_SALARY", "PAYROLL_PAYABLE",
  "RENTAL_REVENUE",
];

export function AccountMappingsClient({ mappings, accounts, lang }: { mappings: Mapping[]; accounts: AccountOption[]; lang: Lang }) {
  const [editing, setEditing] = useState<Record<string, string>>({});
  const byTrigger = new Map(mappings.map((m) => [m.trigger, m]));

  async function save(trigger: string, accountCode: string) {
    const r = await fetch("/api/finance/account-mappings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger, accountCode }),
    });
    if (r.ok) {
      const next = { ...editing };
      delete next[trigger];
      setEditing(next);
      location.reload();
    } else {
      alert(`failed: ${(await r.json())?.error ?? "unknown"}`);
    }
  }

  return (
    <div>
      <div className="mb-3 text-[12px] text-[color:var(--tts-sub)]">{t("mapping.hint", lang)}</div>
      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
          <tr>
            <th className="py-2 text-left">{t("mapping.trigger", lang)}</th>
            <th className="text-left">{t("mapping.account", lang)}</th>
            <th className="text-center">{t("common.actions", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {TRIGGERS.map((tr) => {
            const m = byTrigger.get(tr);
            const editValue = editing[tr];
            const isEditing = editValue !== undefined;
            return (
              <tr key={tr} className="border-b border-[color:var(--tts-border)]/40">
                <td className="py-2 font-mono">{t(`mapping.trigger.${tr}`, lang)}</td>
                <td>
                  {isEditing ? (
                    <select
                      value={editValue}
                      onChange={(e) => setEditing({ ...editing, [tr]: e.target.value })}
                      className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]"
                    >
                      <option value="">— {t("common.choose", lang)} —</option>
                      {accounts.map((a) => (
                        <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
                      ))}
                    </select>
                  ) : m ? (
                    <span className="font-mono">{m.accountCode} <span className="text-[color:var(--tts-sub)]">— {m.accountName}</span></span>
                  ) : (
                    <span className="text-[color:var(--tts-muted)]">{t("mapping.notSet", lang)}</span>
                  )}
                </td>
                <td className="text-center">
                  {isEditing ? (
                    <>
                      <Button variant="primary" onClick={() => save(tr, editValue)} disabled={!editValue}>{t("common.save", lang)}</Button>
                      <button
                        onClick={() => { const next = { ...editing }; delete next[tr]; setEditing(next); }}
                        className="ml-2 text-[11px] text-[color:var(--tts-sub)] hover:underline"
                      >{t("common.cancel", lang)}</button>
                    </>
                  ) : (
                    <Button variant="ghost" onClick={() => setEditing({ ...editing, [tr]: m?.accountCode ?? "" })}>{t("common.edit", lang)}</Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
