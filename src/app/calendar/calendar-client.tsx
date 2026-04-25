"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Button, Field, Note, Select, TextInput, Textarea } from "@/components/ui";

type EventType =
  | "SCHEDULE_DEADLINE" | "WEEKLY_REPORT" | "CONTRACT_EXPIRY" | "CERT_EXPIRY"
  | "LICENSE_EXPIRY" | "AR_DUE" | "LEAVE" | "AS_DISPATCH" | "RENTAL_ORDER"
  | "BIRTHDAY" | "HOLIDAY_VN" | "HOLIDAY_KR" | "CUSTOM";

type AggEvent = {
  id: string;
  title: string;
  start: string;
  end?: string | null;
  allDay: boolean;
  type: EventType;
  color?: string | null;
  linkedUrl?: string | null;
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

export function CalendarClient({ canManage }: { canManage: boolean }) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [events, setEvents] = useState<AggEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Set<EventType>>(new Set(ALL_TYPES));
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AggEvent | null>(null);

  // 신규 이벤트 form
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  const visible = useMemo(() => events.filter((e) => filters.has(e.type)), [events, filters]);

  async function loadRange(startISO: string, endISO: string) {
    setLoading(true);
    setError(null);
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

  function toggle(t: EventType) {
    setFilters((s) => {
      const n = new Set(s);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });
  }

  async function createEvent() {
    if (!title || !startDate) {
      setError("제목과 시작일은 필수");
      return;
    }
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
    if (!r.ok) {
      setError("이벤트 등록 실패");
      return;
    }
    setShowForm(false);
    setTitle(""); setStartDate(""); setEndDate(""); setDescription("");
    // 현재 화면 범위 다시 로드
    const api = calendarRef.current?.getApi();
    if (api) {
      const v = api.view;
      await loadRange(v.activeStart.toISOString(), v.activeEnd.toISOString());
    }
  }

  async function deleteEvent(id: string) {
    if (!id.startsWith("cu:")) {
      setError("자동 수집 이벤트는 삭제할 수 없습니다.");
      return;
    }
    const realId = id.slice(3);
    if (!confirm("이 수동 이벤트를 삭제하시겠습니까?")) return;
    const r = await fetch(`/api/calendar/${realId}`, { method: "DELETE", credentials: "same-origin" });
    if (!r.ok) {
      setError("삭제 실패");
      return;
    }
    setSelectedEvent(null);
    const api = calendarRef.current?.getApi();
    if (api) {
      const v = api.view;
      await loadRange(v.activeStart.toISOString(), v.activeEnd.toISOString());
    }
  }

  return (
    <div className="grid grid-cols-[200px_1fr] gap-4">
      {/* 필터 */}
      <aside className="rounded-md border border-[color:var(--tts-border)] p-3 text-[12px]">
        <div className="mb-2 font-bold">표시 항목</div>
        {ALL_TYPES.map((t) => (
          <label key={t} className="mb-1 flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={filters.has(t)} onChange={() => toggle(t)} />
            <span>{FILTER_LABELS[t]}</span>
          </label>
        ))}
        <button
          type="button"
          className="mt-3 text-[11px] text-[color:var(--tts-muted)] hover:underline"
          onClick={() => setFilters(new Set(ALL_TYPES))}
        >전부 켜기</button>
        <span className="px-1">·</span>
        <button
          type="button"
          className="text-[11px] text-[color:var(--tts-muted)] hover:underline"
          onClick={() => setFilters(new Set())}
        >전부 끄기</button>
      </aside>

      {/* 캘린더 본체 */}
      <div>
        <div className="mb-3 flex justify-end gap-2">
          {canManage && (
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "취소" : "+ 이벤트 등록"}</Button>
          )}
          {loading && <span className="text-[11px] text-[color:var(--tts-muted)]">로딩...</span>}
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
          events={visible.map((e) => ({
            id: e.id,
            title: e.title,
            start: e.start,
            end: e.end ?? undefined,
            allDay: e.allDay,
            backgroundColor: e.color ?? undefined,
            borderColor: e.color ?? undefined,
            extendedProps: { linkedUrl: e.linkedUrl, type: e.type, raw: e },
          }))}
          datesSet={(arg) => {
            void loadRange(arg.start.toISOString(), arg.end.toISOString());
          }}
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
              <div className="mb-1">시작: {selectedEvent.start.slice(0, 16).replace("T", " ")}</div>
              {selectedEvent.end && <div className="mb-1">종료: {selectedEvent.end.slice(0, 16).replace("T", " ")}</div>}
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
    </div>
  );
}
