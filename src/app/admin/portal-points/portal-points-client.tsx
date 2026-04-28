"use client";

import { useEffect, useState } from "react";
import { Card, ClientCombobox } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Tab = "config" | "grant" | "rewards" | "history" | "policies";

const TAB_LABEL: Record<Tab, string> = {
  config: "단가 설정",
  grant: "수동 지급",
  rewards: "교환 승인",
  history: "이력",
  policies: "거래처별 정책",
};

export function PortalPointsAdminClient({ lang, canEditConfig }: { lang: Lang; canEditConfig: boolean }) {
  const [tab, setTab] = useState<Tab>("policies");
  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-2xl font-extrabold">🏆 {t("admin.portalPoints.title", lang)}</h1>
        <div className="mb-4 flex gap-1 border-b border-[color:var(--tts-border)]">
          {(["policies", "config", "grant", "rewards", "history"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-[13px] font-bold ${tab === k ? "border-b-2 border-[color:var(--tts-accent)] text-[color:var(--tts-accent)]" : "text-[color:var(--tts-muted)] hover:text-[color:var(--tts-text)]"}`}>
              {TAB_LABEL[k]}
            </button>
          ))}
        </div>
        {tab === "policies" && <PoliciesTab lang={lang} />}
        {tab === "config" && <ConfigTab lang={lang} canEdit={canEditConfig} />}
        {tab === "grant" && <GrantTab lang={lang} />}
        {tab === "rewards" && <RewardsTab lang={lang} />}
        {tab === "history" && <HistoryTab lang={lang} />}
      </div>
    </main>
  );
}

const POLICY_LABEL: Record<string, string> = {
  NONE: "❌ 미설정 (교환 불가)",
  INVOICE_DEDUCT_ONLY: "💰 청구액 차감만",
  GIFT_CARD_ONLY: "🎫 상품권만",
  BOTH: "✅ 둘 다 가능",
};

function PoliciesTab({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  async function refetch() {
    const r = await fetch("/api/admin/portal-points/policies", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function setPolicy(clientId: string, pointPolicy: string) {
    setSavingId(clientId);
    try {
      await fetch("/api/admin/portal-points/policies", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ clientId, pointPolicy }) });
      await refetch();
    } finally { setSavingId(null); }
  }

  // 단순화: ID = clientCode 자동, PW = 1234 기본. 신규 거래처는 등록 시 자동 발급되므로
  // 보통 「미발급」 케이스가 없음. 만약 누락된 경우만 수동 [발급] 버튼 노출.
  async function issueAccount(clientId: string) {
    if (!confirm("이 거래처에 포탈 계정이 없습니다. ID = 거래처코드, 비밀번호 = 1234 로 발급할까요?")) return;
    setSavingId(clientId);
    try {
      const r = await fetch(`/api/admin/clients/${clientId}/portal-account`, { method: "POST", credentials: "same-origin" });
      const j = await r.json();
      if (!r.ok) { alert("발급 실패: " + (j?.error ?? "")); return; }
      alert(`✅ 발급 완료\n\nID: ${j.user.username}\n비밀번호: 1234\n\n고객은 포탈에서 비밀번호를 변경할 수 있습니다.`);
      await refetch();
    } finally { setSavingId(null); }
  }

  async function resetTo1234(clientId: string) {
    if (!confirm("비밀번호를 1234 로 리셋합니다. 기존 비밀번호는 즉시 무효화됩니다.")) return;
    setSavingId(clientId);
    try {
      const r = await fetch(`/api/admin/clients/${clientId}/portal-account`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ action: "reset_password" }),
      });
      const j = await r.json();
      if (!r.ok) { alert("리셋 실패: " + (j?.error ?? "")); return; }
      alert(`✅ 비밀번호가 1234 로 리셋되었습니다.`);
    } finally { setSavingId(null); }
  }

  const filtered = filter
    ? items.filter((c) => `${c.clientCode} ${c.companyNameVi} ${c.companyNameKo ?? ""}`.toLowerCase().includes(filter.toLowerCase()))
    : items;

  return (
    <Card title="거래처별 포인트 사용 정책" count={items.length}>
      <div className="mb-3 rounded bg-[color:var(--tts-warn-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-warn)]">
        ⚠️ 계약 시점에 결정된 정책에 따라 거래처가 포인트를 어떻게 사용할 수 있는지 정합니다.
        <br />
        대기업 컴플라이언스 (개인 상품권 수령 금지 등) 대응을 위해 신중히 설정하세요.
      </div>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="거래처 검색 (코드 / 이름)"
        className="mb-3 w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]"
      />
      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
          <tr>
            <th className="px-2 py-1 text-left">코드</th>
            <th className="px-2 py-1 text-left">거래처명</th>
            <th className="px-2 py-1 text-left">포탈 ID</th>
            <th className="px-2 py-1 text-right">포인트 잔액</th>
            <th className="px-2 py-1 text-left">사용 정책</th>
            <th className="px-2 py-1 text-right">계정 액션</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr key={c.id} className="border-b border-[color:var(--tts-border)]/50">
              <td className="px-2 py-1.5 font-mono">{c.clientCode}</td>
              <td className="px-2 py-1.5">{c.companyNameKo ?? c.companyNameVi}</td>
              <td className="px-2 py-1.5 text-[11px]">
                {c.portalUsername ? (
                  <span className={c.portalActive ? "font-mono" : "font-mono text-[color:var(--tts-muted)] line-through"}>
                    {c.portalUsername} {!c.portalActive && "(비활성)"}
                  </span>
                ) : (
                  <span className="text-[color:var(--tts-danger)] font-bold">⚠ 미발급</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-right font-mono font-bold text-[color:var(--tts-warn)]">{new Intl.NumberFormat("vi-VN").format(c.balance)}d</td>
              <td className="px-2 py-1.5">
                <select
                  value={c.pointPolicy}
                  disabled={savingId === c.id}
                  onChange={(e) => setPolicy(c.id, e.target.value)}
                  className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]"
                >
                  {Object.entries(POLICY_LABEL).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </td>
              <td className="px-2 py-1.5 text-right whitespace-nowrap">
                {c.portalUsername ? (
                  <button onClick={() => resetTo1234(c.id)} disabled={savingId === c.id} className="rounded bg-[color:var(--tts-warn)] px-2 py-0.5 text-[10px] font-bold text-white" title="비밀번호를 1234 로 리셋">🔑 1234 리셋</button>
                ) : (
                  <button onClick={() => issueAccount(c.id)} disabled={savingId === c.id} className="rounded bg-[color:var(--tts-accent)] px-2 py-0.5 text-[10px] font-bold text-white">+ 발급</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function ConfigTab({ lang, canEdit }: { lang: Lang; canEdit: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/admin/portal-points/config", { credentials: "same-origin" }).then((r) => r.json()).then((j) => Array.isArray(j?.items) && setItems(j.items));
  }, []);
  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/portal-points/config", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ items }) });
      const j = await r.json();
      if (Array.isArray(j?.items)) setItems(j.items);
    } finally { setSaving(false); }
  }
  return (
    <Card title={t("admin.portalPoints.configTitle", lang)}>
      <table className="w-full text-[13px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
          <tr>
            <th className="px-2 py-1 text-left">{t("admin.portalPoints.reason", lang)}</th>
            <th className="px-2 py-1 text-right">{t("admin.portalPoints.amount", lang)}</th>
            <th className="px-2 py-1 text-center">{t("admin.portalPoints.active", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.id} className="border-b border-[color:var(--tts-border)]/50">
              <td className="px-2 py-1.5 font-mono text-[12px]">{it.reason}</td>
              <td className="px-2 py-1.5 text-right">
                <input type="number" disabled={!canEdit} value={it.amount} onChange={(e) => setItems([...items.slice(0, idx), { ...it, amount: Number(e.target.value) }, ...items.slice(idx + 1)])} className="w-32 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-right font-mono text-[12px]" />
              </td>
              <td className="px-2 py-1.5 text-center">
                <input type="checkbox" disabled={!canEdit} checked={it.isActive} onChange={(e) => setItems([...items.slice(0, idx), { ...it, isActive: e.target.checked }, ...items.slice(idx + 1)])} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {canEdit && (
        <div className="mt-3 flex justify-end">
          <button onClick={save} disabled={saving} className="rounded bg-[color:var(--tts-accent)] px-4 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">{saving ? "..." : t("common.save", lang)}</button>
        </div>
      )}
    </Card>
  );
}

function GrantTab({ lang }: { lang: Lang }) {
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState(0);
  const [reasonDetail, setReasonDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/portal-points/grant", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ clientId, amount, reasonDetail }),
      });
      const j = await r.json();
      if (!r.ok) setMsg(j?.error ?? "fail");
      else {
        setMsg(t("admin.portalPoints.granted", lang));
        setAmount(0); setReasonDetail("");
      }
    } finally { setSubmitting(false); }
  }
  return (
    <Card title={t("admin.portalPoints.grantTitle", lang)}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[color:var(--tts-muted)]">{t("filter.client", lang)}</div>
          <ClientCombobox value={clientId} onChange={setClientId} lang={lang} />
        </div>
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[color:var(--tts-muted)]">{t("admin.portalPoints.amountLabel", lang)}</div>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" placeholder={t("admin.portalPoints.amountPlaceholder", lang)} />
        </div>
        <div className="md:col-span-2">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[color:var(--tts-muted)]">{t("admin.portalPoints.reasonDetail", lang)}</div>
          <input type="text" value={reasonDetail} onChange={(e) => setReasonDetail(e.target.value)} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={submit} disabled={submitting || !clientId || amount === 0} className="rounded bg-[color:var(--tts-accent)] px-4 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">{submitting ? "..." : t("admin.portalPoints.grantSubmit", lang)}</button>
        {msg && <span className="text-[12px] text-[color:var(--tts-success)]">{msg}</span>}
      </div>
    </Card>
  );
}

function RewardsTab({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  async function refetch() {
    const r = await fetch("/api/admin/portal-rewards", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);
  async function act(id: string, action: string, extra?: any) {
    const r = await fetch(`/api/admin/portal-rewards/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action, ...extra }) });
    if (r.ok) refetch();
  }
  return (
    <Card title={t("admin.portalPoints.rewardsTitle", lang)} count={items.length}>
      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
          <tr>
            <th className="px-2 py-1 text-left">{t("portal.points.date", lang)}</th>
            <th className="px-2 py-1 text-left">{t("filter.client", lang)}</th>
            <th className="px-2 py-1 text-left">{t("portal.points.exchangeMethod", lang)}</th>
            <th className="px-2 py-1 text-right">{t("portal.points.delta", lang)}</th>
            <th className="px-2 py-1 text-left">{t("col.statusShort", lang)}</th>
            <th className="px-2 py-1 text-right">{t("admin.portalPoints.action", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-b border-[color:var(--tts-border)]/50">
              <td className="px-2 py-1.5">{String(r.createdAt).slice(0, 10)}</td>
              <td className="px-2 py-1.5">{r.client.clientCode} · {r.client.companyNameVi}</td>
              <td className="px-2 py-1.5">{r.rewardType === "INVOICE_DEDUCT" ? `💰 ${t("portal.points.invoiceDeduct", lang)}` : `🎫 ${t("portal.points.giftCard", lang)}`}</td>
              <td className="px-2 py-1.5 text-right font-mono">{new Intl.NumberFormat("vi-VN").format(r.pointsUsed)}</td>
              <td className="px-2 py-1.5">{r.status}</td>
              <td className="px-2 py-1.5 text-right">
                {r.status === "PENDING" && (<>
                  <button onClick={() => act(r.id, "approve")} className="mr-1 rounded bg-[color:var(--tts-success)] px-2 py-0.5 text-[11px] font-bold text-white">{t("admin.portalPoints.approve", lang)}</button>
                  <button onClick={() => act(r.id, "reject")} className="rounded border border-[color:var(--tts-border)] px-2 py-0.5 text-[11px]">{t("admin.portalPoints.reject", lang)}</button>
                </>)}
                {r.status === "APPROVED" && (
                  <button onClick={() => {
                    if (r.rewardType === "INVOICE_DEDUCT") {
                      const inv = prompt(t("admin.portalPoints.askInvoiceId", lang));
                      if (inv) act(r.id, "deliver", { appliedToInvoiceId: inv });
                    } else {
                      const note = prompt(t("admin.portalPoints.askDeliveryNote", lang));
                      if (note) act(r.id, "deliver", { deliveryNote: note });
                    }
                  }} className="rounded bg-[color:var(--tts-accent)] px-2 py-0.5 text-[11px] font-bold text-white">{t("admin.portalPoints.deliver", lang)}</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function HistoryTab({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/admin/portal-points", { credentials: "same-origin" }).then((r) => r.json()).then((j) => setItems(j?.items ?? []));
  }, []);
  return (
    <Card title={t("admin.portalPoints.historyTitle", lang)} count={items.length}>
      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
          <tr>
            <th className="px-2 py-1 text-left">{t("portal.points.date", lang)}</th>
            <th className="px-2 py-1 text-left">{t("filter.client", lang)}</th>
            <th className="px-2 py-1 text-left">{t("portal.points.reason", lang)}</th>
            <th className="px-2 py-1 text-right">{t("portal.points.delta", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b border-[color:var(--tts-border)]/50">
              <td className="px-2 py-1.5">{String(it.createdAt).slice(0, 10)}</td>
              <td className="px-2 py-1.5">{it.client.clientCode} · {it.client.companyNameVi}</td>
              <td className="px-2 py-1.5">{it.reason}</td>
              <td className={`px-2 py-1.5 text-right font-mono font-bold ${it.amount > 0 ? "text-[color:var(--tts-success)]" : "text-[color:var(--tts-danger)]"}`}>{it.amount > 0 ? "+" : ""}{new Intl.NumberFormat("vi-VN").format(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
