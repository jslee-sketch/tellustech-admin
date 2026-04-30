"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type User = { id: string; username: string; role: string; empCode: string | null; name: string };
type Level = "HIDDEN" | "VIEW" | "WRITE";

// 32개 모듈 — 라벨은 i18n 키 매핑 (nav.* 재사용 + 일부 perm.* 신규)
const MODULES: { key: string; i18nKey: string }[] = [
  { key: "CLIENTS", i18nKey: "nav.clients" },
  { key: "ITEMS", i18nKey: "nav.items" },
  { key: "WAREHOUSES", i18nKey: "nav.warehouses" },
  { key: "EMPLOYEES", i18nKey: "nav.employees" },
  { key: "DEPARTMENTS", i18nKey: "nav.departments" },
  { key: "PROJECTS", i18nKey: "nav.projects" },
  { key: "LICENSES", i18nKey: "nav.licenses" },
  { key: "SCHEDULES", i18nKey: "nav.schedules" },
  { key: "SALES", i18nKey: "nav.salesOrder" },
  { key: "PURCHASES", i18nKey: "nav.purchase" },
  { key: "IT_CONTRACTS", i18nKey: "nav.itContract" },
  { key: "TM_RENTALS", i18nKey: "nav.tmRental" },
  { key: "AS_TICKETS", i18nKey: "nav.asTickets" },
  { key: "AS_DISPATCHES", i18nKey: "nav.dispatches" },
  { key: "CALIBRATIONS", i18nKey: "perm.calibrations" },
  { key: "INVENTORY", i18nKey: "nav.stock" },
  { key: "HR_LEAVE", i18nKey: "nav.leave" },
  { key: "HR_ONBOARDING", i18nKey: "nav.onboarding" },
  { key: "HR_OFFBOARDING", i18nKey: "nav.offboarding" },
  { key: "HR_INCIDENT", i18nKey: "nav.incidents" },
  { key: "HR_EVALUATION", i18nKey: "nav.evaluations" },
  { key: "HR_PAYROLL", i18nKey: "perm.payroll" },
  { key: "HR_INCENTIVE", i18nKey: "perm.incentive" },
  { key: "FINANCE_PAYABLE", i18nKey: "perm.payable" },
  { key: "FINANCE_RECEIVABLE", i18nKey: "perm.receivable" },
  { key: "FINANCE_EXPENSE", i18nKey: "nav.expenses" },
  { key: "STATS", i18nKey: "nav.stats" },
  { key: "CHAT", i18nKey: "nav.chat" },
  { key: "CALENDAR", i18nKey: "nav.calendar" },
  { key: "AUDIT", i18nKey: "nav.audit" },
  { key: "ADMIN", i18nKey: "nav.admin" },
];

export function PermissionsClient({ users, lang = "KO" as Lang }: { users: User[]; lang?: Lang }) {
  const [selectedId, setSelectedId] = useState(users[0]?.id ?? "");
  const [perms, setPerms] = useState<Record<string, Level>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/admin/users/${selectedId}/permissions`).then((r) => r.json()).then((j) => {
      setPerms(j?.permissions ?? {});
    });
  }, [selectedId]);

  function setLevel(mod: string, lv: Level) {
    setPerms((p) => ({ ...p, [mod]: lv }));
  }
  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/users/${selectedId}/permissions`, {
        method: "PUT", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ permissions: perms }),
      });
      const j = await r.json();
      if (r.ok) { setMsg("저장됨"); setPerms(j.permissions); }
      else setMsg("실패: " + (j?.error ?? r.status));
    } finally { setSaving(false); }
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <Card title={t("permissions.userPick", lang)} className="col-span-3">
        <ul className="space-y-1 text-[13px]">
          {users.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => setSelectedId(u.id)}
                className={`w-full rounded px-2 py-1.5 text-left ${u.id === selectedId ? "bg-[color:var(--tts-primary)] text-white" : "hover:bg-[color:var(--tts-card-hover)]"}`}
              >
                <div className="font-bold">{u.name}</div>
                <div className="text-[11px] text-[color:var(--tts-sub)]">{u.username} · {u.role} · {u.empCode ?? "-"}</div>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={`권한 매트릭스 — ${users.find(u => u.id === selectedId)?.name ?? ""}`} className="col-span-9">
        <div className="mb-3 flex items-center gap-2">
          <Button onClick={save} disabled={!selectedId || saving}>{saving ? "저장 중…" : "저장"}</Button>
          <Button
            variant="ghost"
            disabled={!selectedId}
            onClick={async () => {
              if (!selectedId) return;
              if (!window.confirm("이 사용자의 비밀번호를 '1234' 로 리셋할까요?")) return;
              const r = await fetch(`/api/admin/users/${selectedId}/reset-password`, { method: "POST" });
              const j = await r.json();
              if (r.ok) alert(`비밀번호 리셋 완료: ${j.resetTo} (다음 로그인 시 변경 요구)`);
              else alert(`리셋 실패: ${j.error}`);
            }}
          >🔑 비번 리셋 (1234)</Button>
          {msg && <span className="text-[12px] text-[color:var(--tts-sub)]">{msg}</span>}
        </div>
        <div className="grid grid-cols-1 gap-1 text-[13px] md:grid-cols-2">
          {MODULES.map((m) => (
            <label key={m.key} className="flex items-center justify-between rounded border border-[color:var(--tts-border)] px-3 py-2">
              <span className="font-semibold">{t(m.i18nKey, lang)}</span>
              <span className="flex gap-3">
                {(["HIDDEN","VIEW","WRITE"] as Level[]).map((lv) => (
                  <span key={lv} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`perm-${m.key}`}
                      checked={(perms[m.key] ?? "VIEW") === lv}
                      onChange={() => setLevel(m.key, lv)}
                    />
                    <span className={lv === "HIDDEN" ? "text-[color:var(--tts-danger)]" : lv === "WRITE" ? "text-[color:var(--tts-primary)]" : "text-[color:var(--tts-sub)]"}>
                      {lv === "HIDDEN" ? "가림" : lv === "VIEW" ? "보기" : "쓰기"}
                    </span>
                  </span>
                ))}
              </span>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}
