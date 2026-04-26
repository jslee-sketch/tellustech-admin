"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";

type User = { id: string; username: string; role: string; empCode: string | null; name: string };
type Level = "HIDDEN" | "VIEW" | "WRITE";

const MODULES: { key: string; label: string }[] = [
  { key: "CLIENTS", label: "거래처" },
  { key: "ITEMS", label: "품목" },
  { key: "WAREHOUSES", label: "창고" },
  { key: "EMPLOYEES", label: "직원" },
  { key: "DEPARTMENTS", label: "부서" },
  { key: "PROJECTS", label: "프로젝트" },
  { key: "LICENSES", label: "라이선스" },
  { key: "SCHEDULES", label: "일정" },
  { key: "SALES", label: "매출" },
  { key: "PURCHASES", label: "매입" },
  { key: "IT_CONTRACTS", label: "IT 계약" },
  { key: "TM_RENTALS", label: "TM 렌탈" },
  { key: "AS_TICKETS", label: "AS 접수" },
  { key: "AS_DISPATCHES", label: "AS 출동" },
  { key: "CALIBRATIONS", label: "교정" },
  { key: "INVENTORY", label: "재고" },
  { key: "HR_LEAVE", label: "연차" },
  { key: "HR_ONBOARDING", label: "입사" },
  { key: "HR_OFFBOARDING", label: "퇴사" },
  { key: "HR_INCIDENT", label: "사건평가" },
  { key: "HR_EVALUATION", label: "정기평가" },
  { key: "HR_PAYROLL", label: "급여" },
  { key: "HR_INCENTIVE", label: "인센티브" },
  { key: "FINANCE_PAYABLE", label: "미지급" },
  { key: "FINANCE_RECEIVABLE", label: "미수금" },
  { key: "FINANCE_EXPENSE", label: "비용" },
  { key: "STATS", label: "통계" },
  { key: "CHAT", label: "채팅" },
  { key: "CALENDAR", label: "캘린더" },
  { key: "AUDIT", label: "감사로그" },
  { key: "ADMIN", label: "관리" },
];

export function PermissionsClient({ users }: { users: User[] }) {
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
      <Card title="사용자 선택" className="col-span-3">
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
          {msg && <span className="text-[12px] text-[color:var(--tts-sub)]">{msg}</span>}
        </div>
        <div className="grid grid-cols-1 gap-1 text-[13px] md:grid-cols-2">
          {MODULES.map((m) => (
            <label key={m.key} className="flex items-center justify-between rounded border border-[color:var(--tts-border)] px-3 py-2">
              <span className="font-semibold">{m.label}</span>
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
