import type { ReactNode } from "react";

export type BadgeTone =
  | "primary"
  | "accent"
  | "success"
  | "danger"
  | "warn"
  | "purple"
  | "neutral";

const tones: Record<BadgeTone, string> = {
  primary: "bg-[color:var(--tts-primary-dim)] text-[color:var(--tts-primary)]",
  accent: "bg-[color:var(--tts-accent-dim)] text-[color:var(--tts-accent)]",
  success: "bg-[color:var(--tts-success-dim)] text-[color:var(--tts-success)]",
  danger: "bg-[color:var(--tts-danger-dim)] text-[color:var(--tts-danger)]",
  warn: "bg-[color:var(--tts-warn-dim)] text-[color:var(--tts-warn)]",
  purple: "bg-[color:var(--tts-purple-dim)] text-[color:var(--tts-purple)]",
  neutral: "bg-[color:var(--tts-border)] text-[color:var(--tts-sub)]",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-block rounded px-2 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
