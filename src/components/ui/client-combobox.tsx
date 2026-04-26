"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

// 거래처 자동완성 콤보박스 — ItemCombobox 와 동일 패턴.
// - clientCode 또는 companyNameVi 의 부분일치로 서버 측 검색
// - 옵션 전체 내려보내지 않음 (수백 건 시 성능 + UX)
// - 내부 값은 clientId.

export type ClientOption = {
  id: string;
  clientCode: string;
  companyNameVi: string;
};

type Props = {
  value: string; // clientId
  onChange: (clientId: string) => void;
  initialCode?: string;
  initialName?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  limit?: number;
  lang?: Lang;
};

export function ClientCombobox({
  value,
  onChange,
  initialCode,
  initialName,
  placeholder,
  required,
  disabled,
  className,
  limit = 20,
  lang = "EN",
}: Props) {
  const effectivePlaceholder = placeholder ?? t("client.searchPlaceholder", lang);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqSeqRef = useRef(0);

  useEffect(() => {
    if (value && initialCode && initialName && !open) {
      setQuery(`${initialCode} · ${initialName}`);
    } else if (!value && !open) {
      setQuery("");
    }
  }, [value, initialCode, initialName, open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (value && initialCode && initialName) {
          setQuery(`${initialCode} · ${initialName}`);
        } else if (!value) {
          setQuery("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, initialCode, initialName]);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setHits([]);
        setHasQueried(false);
        return;
      }
      const seq = ++reqSeqRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({ q });
        const res = await fetch(`/api/master/clients?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { clients: ClientOption[] };
        if (seq !== reqSeqRef.current) return;
        setHits((json.clients ?? []).slice(0, limit));
        setHasQueried(true);
      } catch {
        // 네트워크 오류는 다음 입력에서 재시도
      } finally {
        if (seq === reqSeqRef.current) setLoading(false);
      }
    },
    [limit],
  );

  function onInputChange(v: string) {
    setQuery(v);
    setOpen(true);
    if (v === "") {
      onChange("");
      setHits([]);
      setHasQueried(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 220);
  }

  function pick(opt: ClientOption) {
    onChange(opt.id);
    setQuery(`${opt.clientCode} · ${opt.companyNameVi}`);
    setOpen(false);
  }

  const showDropdown = open && !disabled;
  const noMatchText = t("client.noMatch", lang);
  const emptyHint = useMemo(() => {
    if (!query.trim()) return t("client.enterQuery", lang);
    if (loading) return t("client.searching", lang);
    if (hasQueried && hits.length === 0) return noMatchText;
    return null;
  }, [query, loading, hasQueried, hits.length, lang, noMatchText]);

  const inputBase =
    "w-full rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] placeholder:text-[color:var(--tts-muted)] outline-none focus:border-[color:var(--tts-border-focus)] disabled:cursor-not-allowed disabled:bg-[color:var(--tts-card)] disabled:text-[color:var(--tts-muted)]";

  return (
    <div ref={wrapRef} className={"relative w-full " + (className ?? "")}>
      <input
        type="text"
        value={query}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => {
          setOpen(true);
          if (query.trim() && !hasQueried) runSearch(query);
        }}
        placeholder={effectivePlaceholder}
        required={required && !value}
        disabled={disabled}
        className={inputBase}
        autoComplete="off"
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[260px] overflow-y-auto rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] shadow-lg">
          {hits.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-[color:var(--tts-muted)]">
              {emptyHint}
              {emptyHint === noMatchText && (
                <>
                  {" "}
                  <a href="/master/clients/new" className="text-[color:var(--tts-accent)] hover:underline" target="_blank" rel="noopener noreferrer">
                    {t("client.registerClient", lang)}
                  </a>
                </>
              )}
            </div>
          ) : (
            <ul>
              {hits.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => pick(o)}
                    className={`flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left hover:bg-[color:var(--tts-primary-dim)] ${o.id === value ? "bg-[color:var(--tts-primary-dim)]" : ""}`}
                  >
                    <span className="font-mono text-[11px] text-[color:var(--tts-primary)]">{o.clientCode}</span>
                    <span className="flex-1 text-[13px]">{o.companyNameVi}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
