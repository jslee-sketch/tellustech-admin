"use client";

import type { InputHTMLAttributes } from "react";

type SearchBarProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (v: string) => void;
  width?: string;
};

export function SearchBar({
  value,
  onChange,
  placeholder = "검색...",
  width = "260px",
  className,
  ...rest
}: SearchBarProps) {
  return (
    <div className="relative" style={{ width }}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[color:var(--tts-muted)]">
        🔍
      </span>
      <input
        {...rest}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          "w-full rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] pl-8 pr-3 py-2 text-[13px] text-[color:var(--tts-text)] placeholder:text-[color:var(--tts-muted)] outline-none focus:border-[color:var(--tts-border-focus)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    </div>
  );
}
