"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AggEvent = {
  id: string;
  title: string;
  start: string;
  end?: string | null;
  allDay: boolean;
  type: string;
  color?: string | null;
  linkedUrl?: string | null;
  assignee?: string | null;
  badge?: "GREEN" | "YELLOW" | "RED" | null;
};

const TYPE_LABEL: Record<string, string> = {
  SCHEDULE_DEADLINE: "일정 마감",
  WEEKLY_REPORT: "회의 마감",
  CONTRACT_EXPIRY: "IT계약 만료",
  CERT_EXPIRY: "성적서 만료",
  LICENSE_EXPIRY: "라이선스 만료",
  AR_DUE: "미수금 납기",
  LEAVE: "연차/휴가",
  AS_DISPATCH: "AS 출동",
  RENTAL_ORDER: "렌탈 오더",
  BIRTHDAY: "직원 생일",
  HOLIDAY_VN: "🇻🇳 공휴일",
  HOLIDAY_KR: "🇰🇷 공휴일",
  CUSTOM: "이벤트",
};

function dateLabel(iso: string): { day: string; weekday: string; month: string } {
  const d = new Date(iso);
  const wk = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return {
    day: String(d.getDate()).padStart(2, "0"),
    weekday: wk,
    month: `${d.getMonth() + 1}월`,
  };
}

function badgeColor(b: AggEvent["badge"]): string {
  if (b === "RED") return "var(--tts-danger)";
  if (b === "YELLOW") return "var(--tts-warn)";
  if (b === "GREEN") return "var(--tts-success)";
  return "var(--tts-sub)";
}

export function DashboardCalendarHero() {
  const [events, setEvents] = useState<AggEvent[]>([]);
  const [idx, setIdx] = useState(0);
  const today = useMemo(() => new Date(), []);
  const todayLabel = useMemo(() => dateLabel(today.toISOString()), [today]);

  // 향후 14일 이벤트 로드
  useEffect(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() + 14);
    end.setHours(23, 59, 59, 999);
    fetch(`/api/calendar?start=${start.toISOString()}&end=${end.toISOString()}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        const arr = (d.events ?? []) as AggEvent[];
        // 가까운 미래 + 마감일 의미가 있는 것만 우선, 그 외는 뒤로
        const sorted = arr
          .filter((e) => new Date(e.start).getTime() >= now.getTime() - 24 * 60 * 60 * 1000)
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
          .slice(0, 12);
        setEvents(sorted);
      })
      .catch(() => undefined);
  }, []);

  // 5초 간격 자동 회전 + 부드러운 fade
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (events.length <= 1) return;
    const t = setInterval(() => {
      setFading(true);
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % events.length);
        setFading(false);
      }, 350); // fade-out 350ms 후 인덱스 교체
    }, 5000);
    return () => clearInterval(t);
  }, [events.length]);

  function jumpTo(i: number) {
    if (i === idx) return;
    setFading(true);
    window.setTimeout(() => { setIdx(i); setFading(false); }, 250);
  }

  const cur = events[idx];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      {/* 좌: 오늘 캘린더 미니 카드 */}
      <Link
        href="/calendar"
        className="group relative flex items-center gap-4 overflow-hidden rounded-xl border-2 border-[color:var(--tts-accent)] bg-[color:var(--tts-card)] p-5 transition hover:shadow-lg hover:shadow-[color:var(--tts-accent)]/20"
      >
        <div className="flex flex-col items-center justify-center rounded-lg bg-[color:var(--tts-accent)] px-4 py-3 text-white shadow-md">
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-90">{todayLabel.month}</div>
          <div className="text-[36px] font-black leading-none">{todayLabel.day}</div>
          <div className="text-[12px] font-bold opacity-90">{todayLabel.weekday}요일</div>
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)]">CALENDAR</div>
          <div className="mt-1 text-[16px] font-extrabold text-[color:var(--tts-text)]">📅 통합 캘린더</div>
          <div className="mt-1 text-[12px] text-[color:var(--tts-sub)]">12개 모듈 일정 한눈에</div>
          <div className="mt-2 inline-block rounded bg-[color:var(--tts-accent-dim)] px-2 py-0.5 text-[11px] font-bold text-[color:var(--tts-accent)]">
            {events.length} 건 다음 14일
          </div>
        </div>
        <div className="text-[24px] text-[color:var(--tts-accent)] opacity-50 transition group-hover:translate-x-1 group-hover:opacity-100">→</div>
      </Link>

      {/* 우: 이벤트 카드 캐러셀 */}
      <div className="relative overflow-hidden rounded-xl border border-[color:var(--tts-border)] bg-[color:var(--tts-card)]">
        {events.length === 0 ? (
          <div className="flex h-[120px] items-center justify-center text-[13px] text-[color:var(--tts-muted)]">
            다가오는 일정이 없습니다.
          </div>
        ) : cur ? (
          <Link
            href={cur.linkedUrl ?? "/calendar"}
            className="group block"
          >
            <div
              className="relative flex h-[120px] items-center gap-4 px-6"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${cur.color ?? "var(--tts-primary)"} 22%, var(--tts-card)) 0%, var(--tts-card) 70%)`,
                opacity: fading ? 0 : 1,
                transform: fading ? "translateY(4px)" : "translateY(0)",
                transition: "opacity 350ms ease, transform 350ms ease, background 600ms ease",
              }}
            >
              {/* 좌측 색 바 */}
              <div className="h-16 w-1.5 rounded-full" style={{ background: cur.color ?? "var(--tts-primary)" }} />

              {/* 날짜 블럭 */}
              <div className="flex flex-col items-center justify-center text-center">
                {(() => {
                  const dl = dateLabel(cur.start);
                  return (
                    <>
                      <div className="text-[10px] font-bold tracking-wider text-[color:var(--tts-sub)]">{dl.month}</div>
                      <div className="text-[28px] font-black leading-none text-[color:var(--tts-text)]">{dl.day}</div>
                      <div className="text-[11px] font-bold text-[color:var(--tts-sub)]">{dl.weekday}</div>
                    </>
                  );
                })()}
              </div>

              {/* 본문 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cur.color ?? "var(--tts-primary)" }}>
                    {TYPE_LABEL[cur.type] ?? cur.type}
                  </span>
                  {cur.badge && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: badgeColor(cur.badge) }}>
                      {cur.badge === "RED" ? "🔴 초과" : cur.badge === "YELLOW" ? "🟡 임박" : "🟢 여유"}
                    </span>
                  )}
                </div>
                <div className="mt-1 truncate text-[16px] font-extrabold text-[color:var(--tts-text)] group-hover:text-[color:var(--tts-primary)] transition">
                  {cur.title}
                </div>
                {cur.assignee && (
                  <div className="mt-0.5 text-[12px] text-[color:var(--tts-sub)]">담당: {cur.assignee}</div>
                )}
              </div>

              {/* 페이지네이션 도트 */}
              <div className="absolute bottom-2 right-3 flex gap-1">
                {events.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${i + 1}번 이벤트`}
                    onClick={(e) => { e.preventDefault(); jumpTo(i); }}
                    className="h-1.5 w-1.5 rounded-full transition"
                    style={{ background: i === idx ? "var(--tts-accent)" : "color-mix(in srgb, var(--tts-sub) 40%, transparent)" }}
                  />
                ))}
              </div>
            </div>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
