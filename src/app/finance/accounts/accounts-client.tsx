"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Row, Select, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Account = { id: string; accountCode: string; accountName: string; bankName: string; accountNumber: string; currency: string; accountType: string; currentBalance: number; isActive: boolean };

type ActionMode = "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";

export function AccountsClient({ accounts, lang }: { accounts: Account[]; lang: Lang }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ accountCode: "", accountName: "", bankName: "", accountNumber: "", currency: "VND", accountType: "CHECKING", openingBalance: "0", lowBalanceThreshold: "" });
  const [busy, setBusy] = useState(false);
  const total = accounts.reduce((s, a) => s + a.currentBalance, 0);

  // 입금/출금/이체 액션 모달
  const [actionMode, setActionMode] = useState<ActionMode | null>(null);
  const [actionAccountId, setActionAccountId] = useState("");
  const [actionToAccountId, setActionToAccountId] = useState("");
  const [actionAmount, setActionAmount] = useState("");
  const [actionDesc, setActionDesc] = useState("");

  function openAction(mode: ActionMode, accId: string) {
    setActionMode(mode);
    setActionAccountId(accId);
    setActionToAccountId("");
    setActionAmount("");
    setActionDesc("");
  }

  async function submitAction() {
    if (!actionAmount || Number(actionAmount) <= 0) { alert("금액을 입력하세요"); return; }
    if (!actionDesc) { alert("설명을 입력하세요"); return; }
    // 사용자 확인 — 거래 등록은 자금 흐름에 직접 영향
    const acc = accounts.find((x) => x.id === actionAccountId);
    const accLabel = acc ? `${acc.accountCode} (${acc.bankName})` : actionAccountId;
    const modeKo = actionMode === "DEPOSIT" ? "입금" : actionMode === "WITHDRAWAL" ? "출금" : "이체";
    const target = actionMode === "TRANSFER"
      ? ` → ${accounts.find((x) => x.id === actionToAccountId)?.accountCode ?? actionToAccountId}`
      : "";
    const confirmMsg = `${modeKo} 거래 등록 확정?\n\n` +
      `계좌: ${accLabel}${target}\n` +
      `금액: ${Number(actionAmount).toLocaleString()} VND\n` +
      `설명: ${actionDesc}\n\n` +
      `※ 이 거래는 즉시 자금 흐름에 반영되며 분개 + CashTransaction이 생성됩니다.`;
    if (!confirm(confirmMsg)) return;
    setBusy(true);
    let r: Response;
    if (actionMode === "TRANSFER") {
      if (!actionToAccountId) { alert("도착 계좌 선택"); setBusy(false); return; }
      r = await fetch("/api/finance/cash-transactions/transfer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromAccountId: actionAccountId, toAccountId: actionToAccountId, amount: actionAmount, description: actionDesc }),
      });
    } else {
      r = await fetch("/api/finance/cash-transactions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: actionAccountId, txnType: actionMode,
          category: actionMode === "DEPOSIT" ? "REVENUE_OTHER" : "OTHER",
          amount: actionAmount, description: actionDesc,
        }),
      });
    }
    setBusy(false);
    if (r.ok) { setActionMode(null); router.refresh(); } else alert("처리 실패");
  }

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
          <tr><th className="py-2 text-left">Code</th><th className="text-left">{t("finance.bankName", lang)}</th><th className="text-left">Name</th><th className="text-left">{t("finance.accountNumber", lang)}</th><th className="text-left">{t("finance.accountType", lang)}</th><th className="text-right">{t("finance.balance", lang)}</th><th className="text-right">Actions</th></tr>
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
              <td className="text-right">
                <div className="flex justify-end gap-1">
                  <button className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-600 hover:bg-emerald-500/30" onClick={() => openAction("DEPOSIT", a.id)}>+ {t("finance.deposit", lang)}</button>
                  <button className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-600 hover:bg-rose-500/30" onClick={() => openAction("WITHDRAWAL", a.id)}>− {t("finance.withdrawal", lang)}</button>
                  <button className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-600 hover:bg-blue-500/30" onClick={() => openAction("TRANSFER", a.id)}>↔ {t("finance.transfer", lang)}</button>
                </div>
              </td>
            </tr>
          ))}
          {accounts.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-[color:var(--tts-muted)]">no accounts yet</td></tr>}
        </tbody>
      </table>

      {actionMode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={() => setActionMode(null)}>
          <div className="w-full max-w-lg rounded-lg bg-[color:var(--tts-card)] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-[14px] font-extrabold">
              {actionMode === "DEPOSIT" && `+ ${t("finance.deposit", lang)}`}
              {actionMode === "WITHDRAWAL" && `− ${t("finance.withdrawal", lang)}`}
              {actionMode === "TRANSFER" && `↔ ${t("finance.transfer", lang)}`}
            </h3>
            <Row>
              <Field label={actionMode === "TRANSFER" ? "From" : t("finance.account", lang)}>
                <Select value={actionAccountId} onChange={(e) => setActionAccountId(e.target.value)} options={accounts.map((a) => ({ value: a.id, label: `${a.accountCode} · ${a.accountName}` }))} />
              </Field>
              {actionMode === "TRANSFER" && (
                <Field label="To">
                  <Select value={actionToAccountId} onChange={(e) => setActionToAccountId(e.target.value)} placeholder="선택" options={[{ value: "", label: "선택" }, ...accounts.filter((a) => a.id !== actionAccountId).map((a) => ({ value: a.id, label: `${a.accountCode} · ${a.accountName}` }))]} />
                </Field>
              )}
            </Row>
            <Row>
              <Field label={t("finance.amount", lang)} required><TextInput type="number" value={actionAmount} onChange={(e) => setActionAmount(e.target.value)} /></Field>
              <Field label={t("finance.description", lang)} required><TextInput value={actionDesc} onChange={(e) => setActionDesc(e.target.value)} /></Field>
            </Row>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setActionMode(null)}>cancel</Button>
              <Button onClick={submitAction} disabled={busy}>{busy ? "..." : "submit"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
