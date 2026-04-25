"use client";

import { useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Button, Field, Note, TextInput, Textarea } from "@/components/ui";
import { pickDailyScenes, type Scene } from "./daily-scenes";

type EventType =
  | "SCHEDULE_DEADLINE" | "WEEKLY_REPORT" | "CONTRACT_EXPIRY" | "CERT_EXPIRY"
  | "LICENSE_EXPIRY" | "AR_DUE" | "LEAVE" | "AS_DISPATCH" | "RENTAL_ORDER"
  | "BIRTHDAY" | "HOLIDAY_VN" | "HOLIDAY_KR" | "CUSTOM";

type Badge = "GREEN" | "YELLOW" | "RED" | null;

type AggEvent = {
  id: string;
  title: string;
  start: string;
  end?: string | null;
  allDay: boolean;
  type: EventType;
  color?: string | null;
  linkedUrl?: string | null;
  assignee?: string | null;
  badge?: Badge;
};

const FILTER_LABELS: Record<EventType, string> = {
  SCHEDULE_DEADLINE: "일정 마감",
  WEEKLY_REPORT:     "주간회의 마감",
  CONTRACT_EXPIRY:   "IT계약 만료",
  CERT_EXPIRY:       "성적서 만료",
  LICENSE_EXPIRY:    "라이선스 만료",
  AR_DUE:            "미수금 납기",
  LEAVE:             "연차/휴가",
  AS_DISPATCH:       "AS 출동",
  RENTAL_ORDER:      "렌탈 오더",
  BIRTHDAY:          "직원 생일",
  HOLIDAY_VN:        "베트남 공휴일",
  HOLIDAY_KR:        "한국 공휴일",
  CUSTOM:            "수동 이벤트",
};

const ALL_TYPES: EventType[] = Object.keys(FILTER_LABELS) as EventType[];
const ALL_BADGES: ("GREEN" | "YELLOW" | "RED" | "NONE")[] = ["GREEN", "YELLOW", "RED", "NONE"];
const BADGE_LABEL: Record<"GREEN" | "YELLOW" | "RED" | "NONE", string> = {
  GREEN: "🟢 여유",
  YELLOW: "🟡 임박(D-3)",
  RED: "🔴 초과",
  NONE: "⬜ 뱃지없음",
};

function MultiSelect({
  label,
  values,
  options,
  onToggle,
  onClear,
}: {
  label: string;
  values: Set<string>;
  options: { value: string; label: string }[];
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const summary = values.size === 0 ? "전체" : `${values.size}개 선택`;
  return (
    <details className="relative rounded-md border border-[color:var(--tts-border)] px-2 py-1 text-[12px]">
      <summary className="cursor-pointer select-none">
        <span className="font-bold text-[color:var(--tts-sub)]">{label}:</span>{" "}
        <span>{summary}</span>
      </summary>
      <div className="absolute z-10 mt-1 max-h-[260px] w-[220px] overflow-y-auto rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-2 shadow-lg">
        <div className="mb-1 flex justify-end">
          <button type="button" className="text-[10px] text-[color:var(--tts-muted)] hover:underline" onClick={onClear}>모두 해제</button>
        </div>
        {options.map((o) => (
          <label key={o.value} className="mb-0.5 flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={values.has(o.value)} onChange={() => onToggle(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

function SceneCard({ flag, country, scene }: { flag: string; country: string; scene: Scene }) {
  return (
    <div
      className="relative flex min-h-[88px] flex-1 items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-white shadow-md"
      style={{ background: scene.gradient }}
    >
      {/* 장식 — 큰 이모지를 우측에 흐리게 깔아 분위기 전환 */}
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[88px] leading-none opacity-25 select-none">
        {scene.emoji}
      </div>
      <div className="relative z-10">
        <div className="text-[11px] font-bold tracking-[0.15em] opacity-80">{flag} {country}</div>
        <div className="mt-0.5 text-[16px] font-extrabold drop-shadow">{scene.title}</div>
        <div className="text-[12px] opacity-90">{scene.caption}</div>
      </div>
    </div>
  );
}

export function CalendarClient({ canManage }: { canManage: boolean }) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [events, setEvents] = useState<AggEvent[]>([]);
  const scenes = useMemo(() => pickDailyScenes(new Date()), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());      // empty = 전체
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string>>(new Set());
  const [badgeFilter, setBadgeFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AggEvent | null>(null);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  // 현재 로딩된 이벤트에서 추출
  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) if (e.assignee) set.add(e.assignee);
    return Array.from(set).sort().map((v) => ({ value: v, label: v }));
  }, [events]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (typeFilter.size > 0 && !typeFilter.has(e.type)) return false;
      if (assigneeFilter.size > 0) {
        if (!e.assignee || !assigneeFilter.has(e.assignee)) return false;
      }
      if (badgeFilter.size > 0) {
        const key = e.badge ?? "NONE";
        if (!badgeFilter.has(key)) return false;
      }
      if (q && !e.title.toLowerCase().includes(q) && !(e.assignee ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, typeFilter, assigneeFilter, badgeFilter, search]);

  async function loadRange(startISO: string, endISO: string) {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/calendar?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`, {
        credentials: "same-origin",
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      setEvents(d.events ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleSet(s: Set<string>, v: string, setter: (n: Set<string>) => void) {
    const n = new Set(s);
    if (n.has(v)) n.delete(v); else n.add(v);
    setter(n);
  }

  async function createEvent() {
    if (!title || !startDate) { setError("제목과 시작일은 필수"); return; }
    const r = await fetch("/api/calendar", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/" + "json" },
      body: JSON.stringify({
        title, titleKo: title, titleLang: "KO",
        startDate, endDate: endDate || null,
        eventType: "CUSTOM",
        description: description || null,
      }),
    });
    if (!r.ok) { setError("이벤트 등록 실패"); return; }
    setShowForm(false);
    setTitle(""); setStartDate(""); setEndDate(""); setDescription("");
    const api = calendarRef.current?.getApi();
    if (api) await loadRange(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
  }

  async function deleteEvent(id: string) {
    if (!id.startsWith("cu:")) { setError("자동 수집 이벤트는 삭제할 수 없습니다."); return; }
    const realId = id.slice(3);
    if (!confirm("이 수동 이벤트를 삭제하시겠습니까?")) return;
    const r = await fetch(`/api/calendar/${realId}`, { method: "DELETE", credentials: "same-origin" });
    if (!r.ok) { setError("삭제 실패"); return; }
    setSelectedEvent(null);
    const api = calendarRef.current?.getApi();
    if (api) await loadRange(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
  }

  return (
    <div>
      {/* 오늘의 풍경 — 좌(VN) / 우(KR), 매일 자동 회전 */}
      <div className="mb-4 flex gap-3">
        <SceneCard flag="🇻🇳" country="Vietnam" scene={scenes.vn} />
        <SceneCard flag="🇰🇷" country="Korea" scene={scenes.kr} />
      </div>

      {/* 필터 바 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="🔍 제목/담당자 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]"
        />
        <MultiSelect
          label="업무"
          values={typeFilter}
          options={ALL_TYPES.map((t) => ({ value: t, label: FILTER_LABELS[t] }))}
          onToggle={(v) => toggleSet(typeFilter, v, setTypeFilter)}
          onClear={() => setTypeFilter(new Set())}
        />
        <MultiSelect
          label="담당"
          values={assigneeFilter}
          options={assigneeOptions}
          onToggle={(v) => toggleSet(assigneeFilter, v, setAssigneeFilter)}
          onClear={() => setAssigneeFilter(new Set())}
        />
        <MultiSelect
          label="뱃지"
          values={badgeFilter}
          options={ALL_BADGES.map((b) => ({ value: b, label: BADGE_LABEL[b] }))}
          onToggle={(v) => toggleSet(badgeFilter, v, setBadgeFilter)}
          onClear={() => setBadgeFilter(new Set())}
        />
        <span className="text-[11px] text-[color:var(--tts-muted)]">
          {visible.length} / {events.length} 건 {loading && "(로딩...)"}
        </span>
        <div className="ml-auto">
          {canManage && (
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "취소" : "+ 이벤트 등록"}</Button>
          )}
        </div>
      </div>

      {error && <Note tone="danger">{error}</Note>}

      {showForm && (
        <div className="mb-3 grid grid-cols-2 gap-3 rounded-md border border-[color:var(--tts-border)] p-3">
          <Field label="제목 (한국어)" className="col-span-2"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="시작일"><TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="종료일 (선택)"><TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
          <Field label="설명" className="col-span-2"><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <div className="col-span-2 flex justify-end"><Button onClick={createEvent}>저장</Button></div>
        </div>
      )}

      <FullCalendar
        ref={calendarRef as unknown as React.RefObject<FullCalendar>}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        height="auto"
        events={visible.map((e) => {
          const badgePrefix = e.badge === "RED" ? "🔴 " : e.badge === "YELLOW" ? "🟡 " : e.badge === "GREEN" ? "🟢 " : "";
          return {
            id: e.id,
            title: badgePrefix + e.title,
            start: e.start,
            end: e.end ?? undefined,
            allDay: e.allDay,
            backgroundColor: e.color ?? undefined,
            borderColor: e.color ?? undefined,
            extendedProps: { linkedUrl: e.linkedUrl, type: e.type, raw: e },
          };
        })}
        datesSet={(arg) => { void loadRange(arg.start.toISOString(), arg.end.toISOString()); }}
        eventClick={(info) => {
          const url = info.event.extendedProps.linkedUrl as string | null | undefined;
          if (url) {
            window.location.assign(url);
          } else {
            const raw = info.event.extendedProps.raw as AggEvent;
            setSelectedEvent(raw);
          }
        }}
        locale="ko"
        buttonText={{ today: "오늘", month: "월", week: "주", day: "일" }}
      />

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedEvent(null)}>
          <div className="w-[420px] rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-bg)] p-4 text-[13px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-[15px] font-bold">📅 {selectedEvent.title}</h3>
            <div className="mb-1 text-[12px] text-[color:var(--tts-muted)]">유형: {FILTER_LABELS[selectedEvent.type]}</div>
            {selectedEvent.assignee && <div className="mb-1">담당: {selectedEvent.assignee}</div>}
            <div className="mb-1">시작: {selectedEvent.start.slice(0, 16).replace("T", " ")}</div>
            {selectedEvent.end && <div className="mb-1">종료: {selectedEvent.end.slice(0, 16).replace("T", " ")}</div>}
            {selectedEvent.badge && <div className="mb-1">뱃지: {BADGE_LABEL[selectedEvent.badge]}</div>}
            <div className="mt-3 flex justify-end gap-2">
              {canManage && selectedEvent.id.startsWith("cu:") && (
                <Button onClick={() => deleteEvent(selectedEvent.id)}>삭제</Button>
              )}
              <Button onClick={() => setSelectedEvent(null)}>닫기</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
