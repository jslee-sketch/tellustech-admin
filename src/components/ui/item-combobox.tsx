"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

// 품목 자동완성 콤보박스 — 타이핑 시 서버에 검색 요청.
// - 품목코드(itemCode) 또는 품목명(name)의 부분일치로 필터 (서버측)
// - 옵션을 페이지 로드 시 전부 불러오지 않음 — 쿼리별로만 최대 N개
// - 내부 값은 itemId. onChange(itemId) 콜백.
// - 편집 진입 시 현재 선택된 itemId 가 있으면 initial 로 표시할 수 있도록 initialCode/initialName 받음.

export type ItemOption = {
  id: string;
  itemCode: string;
  name: string;
};

type Props = {
  value: string; // itemId
  onChange: (itemId: string) => void;
  initialCode?: string;
  initialName?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  limit?: number; // 서버 응답 상한 (기본 20)
  itemType?: "PRODUCT" | "CONSUMABLE" | "PART"; // 특정 유형만 검색하고 싶을 때
  lang?: Lang;
};

export function ItemCombobox({
  value,
  onChange,
  initialCode,
  initialName,
  placeholder,
  required,
  disabled,
  className,
  limit = 20,
  itemType,
  lang = "EN",
}: Props) {
  const effectivePlaceholder = placeholder ?? t("item.searchPlaceholder", lang);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ItemOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqSeqRef = useRef(0);

  // value 가 설정돼 있으면 표시용 문자열을 초기값으로
  useEffect(() => {
    if (value && initialCode && initialName && !open) {
      setQuery(`${initialCode} · ${initialName}`);
    } else if (!value && !open) {
      setQuery("");
    }
  }, [value, initialCode, initialName, open]);

  // 바깥 클릭 시 닫기 (선택 유지)
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
        if (itemType) params.set("type", itemType);
        const res = await fetch(`/api/master/items?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { items: ItemOption[] };
        if (seq !== reqSeqRef.current) return; // 이후 요청이 있으면 무시
        setHits((json.items ?? []).slice(0, limit));
        setHasQueried(true);
      } catch {
        // 네트워크 오류는 조용히 무시 — 다음 타이핑에서 재시도
      } finally {
        if (seq === reqSeqRef.current) setLoading(false);
      }
    },
    [itemType, limit],
  );

  function onInputChange(v: string) {
    setQuery(v);
    setOpen(true);
    // 입력값을 지우면 선택도 해제
    if (v === "") {
      onChange("");
      setHits([]);
      setHasQueried(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 220);
  }

  function pick(opt: ItemOption) {
    onChange(opt.id);
    setQuery(`${opt.itemCode} · ${opt.name}`);
    setOpen(false);
  }

  const showDropdown = open && !disabled;
  const noMatchText = t("item.noMatch", lang);
  const emptyHint = useMemo(() => {
    if (!query.trim()) return t("item.enterQuery", lang);
    if (loading) return t("item.searching", lang);
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
                  <a href="/master/items/new" className="text-[color:var(--tts-accent)] hover:underline" target="_blank" rel="noopener noreferrer">
                    {t("item.registerItem", lang)}
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
                    <span className="font-mono text-[11px] text-[color:var(--tts-primary)]">{o.itemCode}</span>
                    <span className="flex-1 text-[13px]">{o.name}</span>
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
