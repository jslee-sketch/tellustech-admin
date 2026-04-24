"use client";

import type { ReactNode } from "react";

export type TabDef = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
};

type TabsProps = {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
};

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div
      className={
        "mb-4 flex gap-1 border-b-2 border-[color:var(--tts-border)]" +
        (className ? " " + className : "")
      }
    >
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={
              "-mb-[2px] rounded-t-md px-4 py-2.5 text-[13px] font-semibold transition " +
              (isActive
                ? "border-b-2 border-[color:var(--tts-primary)] bg-[color:var(--tts-primary)] text-white"
                : "border-b-2 border-transparent text-[color:var(--tts-sub)] hover:text-[color:var(--tts-text)]")
            }
          >
            {t.icon && <span className="mr-1.5">{t.icon}</span>}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
