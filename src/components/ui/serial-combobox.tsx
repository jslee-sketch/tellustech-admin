"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

// S/N 자동완성 콤보박스 — InventoryItem 마스터 기준 서버 검색.
// - value 는 SN 문자열 (콜백도 SN 문자열)
// - 자유 입력도 허용 (재고에 없는 SN 도 사용 가능 — 정책: STRICT 모듈은 외부에서 별도 검증)
// - onPick 콜백으로 픽한 InventoryItem 의 부가정보(itemId/itemName/warehouse) 도 전달

export type SerialOption = {
  id: string;
  serialNumber: string;
  status: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  warehouseCode: string;
  warehouseName: string;
};

type Props = {
  value: string;
  onChange: (sn: string) => void;
  onPick?: (opt: SerialOption) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  itemId?: string;
  inStock?: boolean;
  limit?: number;
  lang?: Lang;
  onBlur?: () => void;
};

export function SerialCombobox({
  value,
  onChange,
  onPick,
  placeholder,
  required,
  disabled,
  className,
  itemId,
  inStock,
  limit = 30,
  lang = "EN",
  onBlur,
}: Props) {
  const effectivePlaceholder = placeholder ?? t("sn.searchPlaceholder", lang);
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<SerialOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqSeqRef = useRef(0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        if (itemId) params.set("itemId", itemId);
        if (inStock) params.set("inStock", "1");
        const res = await fetch(`/api/inventory/sn/search?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { items: SerialOption[] };
        if (seq !== reqSeqRef.current) return;
        setHits((json.items ?? []).slice(0, limit));
        setHasQueried(true);
      } catch {
        // 네트워크 오류 — 다음 입력에서 재시도
      } finally {
        if (seq === reqSeqRef.current) setLoading(false);
      }
    },
    [itemId, inStock, limit],
  );

  function onInputChange(v: string) {
    onChange(v);
    setOpen(true);
    if (v === "") {
      setHits([]);
      setHasQueried(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 220);
  }

  function pick(opt: SerialOption) {
    onChange(opt.serialNumber);
    onPick?.(opt);
    setOpen(false);
  }

  const showDropdown = open && !disabled;
  const noMatchText = t("sn.noMatch", lang);
  const emptyHint = useMemo(() => {
    if (!value.trim()) return t("sn.enterQuery", lang);
    if (loading) return t("sn.searching", lang);
    if (hasQueried && hits.length === 0) return noMatchText;
    return null;
  }, [value, loading, hasQueried, hits.length, lang, noMatchText]);

  const inputBase =
    "w-full rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] font-mono text-[color:var(--tts-text)] placeholder:text-[color:var(--tts-muted)] outline-none focus:border-[color:var(--tts-border-focus)] disabled:cursor-not-allowed disabled:bg-[color:var(--tts-card)] disabled:text-[color:var(--tts-muted)]";

  return (
    <div ref={wrapRef} className={"relative w-full " + (className ?? "")}>
      <input
        type="text"
        value={value}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => {
          setOpen(true);
          if (value.trim() && !hasQueried) runSearch(value);
        }}
        onBlur={onBlur}
        placeholder={effectivePlaceholder}
        required={required}
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
                <span className="ml-2 text-[color:var(--tts-sub)]">{t("sn.freeInputAllowed", lang)}</span>
              )}
            </div>
          ) : (
            <ul>
              {hits.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => pick(o)}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-[color:var(--tts-primary-dim)] ${o.serialNumber === value ? "bg-[color:var(--tts-primary-dim)]" : ""}`}
                  >
                    <div className="flex w-full items-baseline justify-between gap-2">
                      <span className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)]">{o.serialNumber}</span>
                      <span className="text-[10px] uppercase text-[color:var(--tts-sub)]">{o.status}</span>
                    </div>
                    <div className="flex w-full items-baseline justify-between gap-2 text-[11px] text-[color:var(--tts-sub)]">
                      <span>{o.itemCode} · {o.itemName}</span>
                      <span className="text-[10px] text-[color:var(--tts-muted)]">{o.warehouseCode}</span>
                    </div>
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
