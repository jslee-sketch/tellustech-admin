"use client";

import { useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Button, Field, Note, TextInput, Textarea } from "@/components/ui";
import { pickDailyScenes, type LocalizedScene } from "./daily-scenes";
import { t, type Lang } from "@/lib/i18n";

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

function buildFilterLabels(lang: Lang): Record<EventType, string> {
  return {
    SCHEDULE_DEADLINE: t("calendar.filter.scheduleDeadline", lang),
    WEEKLY_REPORT:     t("calendar.filter.weeklyReport", lang),
    CONTRACT_EXPIRY:   t("calendar.filter.contractExpiry", lang),
    CERT_EXPIRY:       t("calendar.filter.certExpiry", lang),
    LICENSE_EXPIRY:    t("calendar.filter.licenseExpiry", lang),
    AR_DUE:            t("calendar.filter.arDue", lang),
    LEAVE:             t("calendar.filter.leave", lang),
    AS_DISPATCH:       t("calendar.filter.asDispatch", lang),
    RENTAL_ORDER:      t("calendar.filter.rentalOrder", lang),
    BIRTHDAY:          t("calendar.filter.birthday", lang),
    HOLIDAY_VN:        t("calendar.filter.holidayVn", lang),
    HOLIDAY_KR:        t("calendar.filter.holidayKr", lang),
    CUSTOM:            t("calendar.filter.custom", lang),
  };
}

const ALL_TYPES: EventType[] = [
  "SCHEDULE_DEADLINE","WEEKLY_REPORT","CONTRACT_EXPIRY","CERT_EXPIRY",
  "LICENSE_EXPIRY","AR_DUE","LEAVE","AS_DISPATCH","RENTAL_ORDER",
  "BIRTHDAY","HOLIDAY_VN","HOLIDAY_KR","CUSTOM",
];
const ALL_BADGES: ("GREEN" | "YELLOW" | "RED" | "NONE")[] = ["GREEN", "YELLOW", "RED", "NONE"];

function buildBadgeLabel(lang: Lang): Record<"GREEN" | "YELLOW" | "RED" | "NONE", string> {
  return {
    GREEN: t("calendar.badge.green", lang),
    YELLOW: t("calendar.badge.yellow", lang),
    RED: t("calendar.badge.red", lang),
    NONE: t("calendar.badge.none", lang),
  };
}

function MultiSelect({
  label,
  values,
  options,
  onToggle,
  onClear,
  lang,
}: {
  label: string;
  values: Set<string>;
  options: { value: string; label: string }[];
  onToggle: (v: string) => void;
  onClear: () => void;
  lang: Lang;
}) {
  const summary = values.size === 0 ? t("calendar.allItems", lang) : t("calendar.selected", lang).replace("{count}", String(values.size));
  return (
    <details className="relative rounded-md border border-[color:var(--tts-border)] px-2 py-1 text-[12px]">
      <summary className="cursor-pointer select-none">
        <span className="font-bold text-[color:var(--tts-sub)]">{label}:</span>{" "}
        <span>{summary}</span>
      </summary>
      <div className="absolute z-10 mt-1 max-h-[260px] w-[220px] overflow-y-auto rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-2 shadow-lg">
        <div className="mb-1 flex justify-end">
          <button type="button" className="text-[10px] text-[color:var(--tts-muted)] hover:underline" onClick={onClear}>{t("calendar.clearAll", lang)}</button>
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

function SceneCard({ flag, country, scene }: { flag: string; country: string; scene: LocalizedScene }) {
  return (
    <div
      className="relative flex min-h-[110px] flex-1 items-center gap-3 overflow-hidden rounded-xl px-5 py-4 text-white shadow-lg"
      style={{
        // 그라디언트 강도 35% 정도로 옅게 + 살짝 밝은 베이스 깔아 이미지(이모지) 가 도드라지게
        background: `linear-gradient(135deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 100%), ${scene.gradient}`,
        backgroundBlendMode: "soft-light, normal",
        opacity: 0.92,
      }}
    >
      {/* 큰 이미지(이모지) — 우측에 크고 또렷하게 */}
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[120px] leading-none opacity-95 drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)] select-none">
        {scene.emoji}
      </div>
      {/* 좌측 빛 번짐 — 카드 밝기 +감 */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
      <div className="relative z-10">
        <div className="text-[11px] font-bold tracking-[0.18em] text-white/90 drop-shadow">{flag} {country}</div>
        <div className="mt-1 text-[18px] font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{scene.title}</div>
        <div className="text-[12px] text-white/95 drop-shadow">{scene.caption}</div>
      </div>
    </div>
  );
}

export function CalendarClient({ canManage, lang }: { canManage: boolean; lang: Lang }) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [events, setEvents] = useState<AggEvent[]>([]);
  const scenes = useMemo(() => pickDailyScenes(new Date(), lang), [lang]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const FILTER_LABELS = useMemo(() => buildFilterLabels(lang), [lang]);
  const BADGE_LABEL = useMemo(() => buildBadgeLabel(lang), [lang]);

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
    if (!title || !startDate) { setError(t("msg.titleStartRequired", lang)); return; }
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
    if (!r.ok) { setError(t("msg.eventCreateFail", lang)); return; }
    setShowForm(false);
    setTitle(""); setStartDate(""); setEndDate(""); setDescription("");
    const api = calendarRef.current?.getApi();
    if (api) await loadRange(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
  }

  async function deleteEvent(id: string) {
    if (!id.startsWith("cu:")) { setError(t("msg.eventDeleteAuto", lang)); return; }
    const realId = id.slice(3);
    if (!confirm(t("msg.deleteEventConfirm", lang))) return;
    const r = await fetch(`/api/calendar/${realId}`, { method: "DELETE", credentials: "same-origin" });
    if (!r.ok) { setError(t("msg.deleteFailedShort", lang)); return; }
    setSelectedEvent(null);
    const api = calendarRef.current?.getApi();
    if (api) await loadRange(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
  }

  const fcLocale = lang === "VI" ? "vi" : lang === "EN" ? "en" : "ko";

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
          placeholder={t("placeholder.searchEvent", lang)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]"
        />
        <MultiSelect
          label={t("calendar.busiFilter", lang)}
          values={typeFilter}
          options={ALL_TYPES.map((tp) => ({ value: tp, label: FILTER_LABELS[tp] }))}
          onToggle={(v) => toggleSet(typeFilter, v, setTypeFilter)}
          onClear={() => setTypeFilter(new Set())}
          lang={lang}
        />
        <MultiSelect
          label={t("calendar.assignee", lang)}
          values={assigneeFilter}
          options={assigneeOptions}
          onToggle={(v) => toggleSet(assigneeFilter, v, setAssigneeFilter)}
          onClear={() => setAssigneeFilter(new Set())}
          lang={lang}
        />
        <MultiSelect
          label={t("calendar.badge", lang)}
          values={badgeFilter}
          options={ALL_BADGES.map((b) => ({ value: b, label: BADGE_LABEL[b] }))}
          onToggle={(v) => toggleSet(badgeFilter, v, setBadgeFilter)}
          onClear={() => setBadgeFilter(new Set())}
          lang={lang}
        />
        <span className="text-[11px] text-[color:var(--tts-muted)]">
          {t("calendar.eventCount", lang).replace("{visible}", String(visible.length)).replace("{total}", String(events.length))} {loading && t("calendar.loading", lang)}
        </span>
        <div className="ml-auto">
          {canManage && (
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? t("action.cancel", lang) : t("btn.submitEvent", lang)}</Button>
          )}
        </div>
      </div>

      {error && <Note tone="danger">{error}</Note>}

      {showForm && (
        <div className="mb-3 grid grid-cols-2 gap-3 rounded-md border border-[color:var(--tts-border)] p-3">
          <Field label={t("calendar.titleKo", lang)} className="col-span-2"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label={t("field.startDate", lang)}><TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label={t("calendar.endOptional", lang)}><TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
          <Field label={t("field.description", lang)} className="col-span-2"><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <div className="col-span-2 flex justify-end"><Button onClick={createEvent}>{t("action.save", lang)}</Button></div>
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
        locale={fcLocale}
        buttonText={{ today: t("calendar.today", lang), month: t("calendar.month", lang), week: t("calendar.week", lang), day: t("calendar.day", lang) }}
      />

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedEvent(null)}>
          <div className="w-[420px] rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-bg)] p-4 text-[13px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-[15px] font-bold">📅 {selectedEvent.title}</h3>
            <div className="mb-1 text-[12px] text-[color:var(--tts-muted)]">{t("calendar.dialogType", lang)} {FILTER_LABELS[selectedEvent.type]}</div>
            {selectedEvent.assignee && <div className="mb-1">{t("calendar.assignee", lang)}: {selectedEvent.assignee}</div>}
            <div className="mb-1">{t("calendar.dialogStart", lang)} {selectedEvent.start.slice(0, 16).replace("T", " ")}</div>
            {selectedEvent.end && <div className="mb-1">{t("calendar.dialogEnd", lang)} {selectedEvent.end.slice(0, 16).replace("T", " ")}</div>}
            {selectedEvent.badge && <div className="mb-1">{t("calendar.dialogBadge", lang)} {BADGE_LABEL[selectedEvent.badge]}</div>}
            <div className="mt-3 flex justify-end gap-2">
              {canManage && selectedEvent.id.startsWith("cu:") && (
                <Button onClick={() => deleteEvent(selectedEvent.id)}>{t("action.delete", lang)}</Button>
              )}
              <Button onClick={() => setSelectedEvent(null)}>{t("action.close", lang)}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
