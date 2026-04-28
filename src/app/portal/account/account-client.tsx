"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import type { Lang } from "@/lib/i18n";

export function AccountClient({ lang }: { lang: Lang }) {
  const [me, setMe] = useState<any>(null);
  const [cur, setCur] = useState("");
  const [next1, setNext1] = useState("");
  const [next2, setNext2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function refetch() {
    const r = await fetch("/api/portal/account", { credentials: "same-origin" });
    const j = await r.json();
    setMe(j?.user ?? null);
  }
  useEffect(() => { refetch(); }, []);

  async function submit() {
    setMsg(null);
    if (next1 !== next2) { setMsg({ kind: "error", text: "새 비밀번호가 일치하지 않습니다." }); return; }
    if (next1.length < 4) { setMsg({ kind: "error", text: "비밀번호는 최소 4자 이상이어야 합니다." }); return; }
    setSubmitting(true);
    try {
      const r = await fetch("/api/portal/account/password", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ currentPassword: cur, newPassword: next1 }),
      });
      const j = await r.json();
      if (!r.ok) {
        const errMap: Record<string, string> = {
          wrong_current_password: "현재 비밀번호가 올바르지 않습니다.",
          password_too_short: "비밀번호는 최소 4자 이상이어야 합니다.",
          same_as_current: "기존 비밀번호와 동일합니다.",
        };
        setMsg({ kind: "error", text: errMap[j?.error] ?? j?.error ?? "변경 실패" });
        return;
      }
      setMsg({ kind: "success", text: "✅ 비밀번호가 변경되었습니다." });
      setCur(""); setNext1(""); setNext2("");
      refetch();
    } finally { setSubmitting(false); }
  }

  if (!me) return <div className="p-8 text-[color:var(--tts-muted)]">로딩 중…</div>;

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-2xl font-extrabold">🔐 내 계정</h1>

        <Card title="계정 정보">
          <div className="space-y-1 text-[13px]">
            <div><span className="text-[color:var(--tts-muted)]">거래처:</span> <span className="font-bold">{me.clientAccount?.companyNameKo ?? me.clientAccount?.companyNameVi}</span> <span className="text-[color:var(--tts-muted)]">({me.clientAccount?.clientCode})</span></div>
            <div><span className="text-[color:var(--tts-muted)]">포탈 ID:</span> <span className="font-mono">{me.username}</span></div>
            <div><span className="text-[color:var(--tts-muted)]">상태:</span> {me.isActive ? <span className="text-[color:var(--tts-success)]">활성</span> : <span className="text-[color:var(--tts-danger)]">비활성</span>}</div>
            <div><span className="text-[color:var(--tts-muted)]">마지막 로그인:</span> {me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString("ko-KR") : "—"}</div>
          </div>
        </Card>

        <div className="mt-4">
          <Card title="🔑 비밀번호 변경">
            {me.mustChangePassword && (
              <div className="mb-3 rounded bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[13px] font-bold text-[color:var(--tts-danger)]">
                ⚠️ 보안을 위해 초기 비밀번호(1234)를 즉시 변경해주세요.
              </div>
            )}
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-bold text-[color:var(--tts-muted)]">현재 비밀번호</label>
                <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[color:var(--tts-muted)]">새 비밀번호 (4자 이상)</label>
                <input type="password" value={next1} onChange={(e) => setNext1(e.target.value)} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[color:var(--tts-muted)]">새 비밀번호 확인</label>
                <input type="password" value={next2} onChange={(e) => setNext2(e.target.value)} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
              </div>
            </div>
            {msg && <div className={`mt-2 rounded px-3 py-2 text-[12px] ${msg.kind === "success" ? "bg-[color:var(--tts-success-dim)] text-[color:var(--tts-success)]" : "bg-[color:var(--tts-danger-dim)] text-[color:var(--tts-danger)]"}`}>{msg.text}</div>}
            <div className="mt-3">
              <button onClick={submit} disabled={submitting || !cur || !next1 || !next2} className="rounded bg-[color:var(--tts-accent)] px-4 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">{submitting ? "변경중…" : "비밀번호 변경"}</button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
