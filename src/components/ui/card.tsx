import type { ReactNode } from "react";

// 카드 / 섹션 타이틀 / Row / Note — 프로토타입의 Card, ST, Row, Note 이식.

type CardProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  count?: number;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Card({ title, subtitle, count, action, children, className }: CardProps) {
  return (
    <div
      className={
        "rounded-xl border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-5" +
        (className ? " " + className : "")
      }
    >
      {(title !== undefined || action !== undefined) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {title !== undefined && (
              <h3 className="text-[15px] font-extrabold text-[color:var(--tts-text)]">
                {title}
              </h3>
            )}
            {subtitle && (
              <span className="text-[11px] text-[color:var(--tts-muted)]">{subtitle}</span>
            )}
            {count !== undefined && (
              <span className="rounded bg-[color:var(--tts-primary-dim)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--tts-primary)]">
                {count}건
              </span>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

type SectionTitleProps = {
  title: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function SectionTitle({ title, icon, className }: SectionTitleProps) {
  return (
    <div
      className={
        "mt-4 mb-3 flex items-center gap-2 border-b border-[color:var(--tts-border)] pb-1.5" +
        (className ? " " + className : "")
      }
    >
      {icon && <span className="text-[14px]">{icon}</span>}
      <span className="text-[13px] font-bold text-[color:var(--tts-primary)]">{title}</span>
    </div>
  );
}

/** 좌우로 흐르는 폼 Row. 자식들이 모바일에서 wrap 되도록 flex-wrap 기본. */
export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={"mb-2 flex flex-wrap gap-2.5" + (className ? " " + className : "")}>
      {children}
    </div>
  );
}

type NoteTone = "info" | "warn" | "danger";

type NoteProps = {
  children: ReactNode;
  tone?: NoteTone;
  className?: string;
};

export function Note({ children, tone = "info", className }: NoteProps) {
  const bg =
    tone === "warn"
      ? "bg-[color:var(--tts-warn-dim)] text-[color:var(--tts-warn)]"
      : tone === "danger"
      ? "bg-[color:var(--tts-danger-dim)] text-[color:var(--tts-danger)]"
      : "bg-[color:var(--tts-primary-dim)] text-[color:var(--tts-sub)]";
  return (
    <div className={`mt-2 rounded-md ${bg} px-3 py-2 text-[11px]` + (className ? " " + className : "")}>
      {children}
    </div>
  );
}
