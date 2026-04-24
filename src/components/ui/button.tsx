import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "outline" | "danger" | "ghost" | "success" | "accent";
export type ButtonSize = "sm" | "md";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
};

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

const bySize: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-4 py-2 text-[13px]",
};

const byVariant: Record<ButtonVariant, string> = {
  primary:
    "bg-[color:var(--tts-primary)] text-white hover:brightness-110",
  outline:
    "border border-[color:var(--tts-primary)] bg-transparent text-[color:var(--tts-primary)] hover:bg-[color:var(--tts-primary-dim)]",
  danger:
    "bg-[color:var(--tts-danger)] text-white hover:brightness-110",
  ghost:
    "border border-[color:var(--tts-border)] bg-transparent text-[color:var(--tts-sub)] hover:text-[color:var(--tts-text)]",
  success:
    "bg-[color:var(--tts-success-dim)] text-[color:var(--tts-success)] border border-[color:var(--tts-success)]",
  accent:
    "bg-[color:var(--tts-accent-dim)] text-[color:var(--tts-accent)] border border-[color:var(--tts-accent)]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[base, bySize[size], byVariant[variant], className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
