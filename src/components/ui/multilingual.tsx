// 자유서술 3언어 필드 표시 — 현재 세션 언어 우선 + 다른 언어는 토글 (<details>)
// Server-side 렌더링 가능 (no useState).

type Lang = "VI" | "EN" | "KO";

const NAMES: Record<Lang, string> = {
  VI: "Tiếng Việt",
  EN: "English",
  KO: "한국어",
};

export function Multilingual({
  vi, en, ko, originalLang, currentLang,
}: {
  vi: string | null | undefined;
  en: string | null | undefined;
  ko: string | null | undefined;
  originalLang: Lang;
  currentLang: Lang;
}) {
  const map: Record<Lang, string | null> = {
    VI: vi ?? null,
    EN: en ?? null,
    KO: ko ?? null,
  };
  // 우선순위: 현재 언어 → 원문 언어 → 첫 비어있지 않은 언어
  const primaryLang = (map[currentLang] ? currentLang : map[originalLang] ? originalLang : (["VI", "EN", "KO"] as const).find((l) => map[l])) ?? originalLang;
  const primaryText = map[primaryLang];
  const otherLangs = (["VI", "EN", "KO"] as const).filter((l) => l !== primaryLang && map[l]);

  if (!primaryText) {
    return <div className="text-[12px] text-[color:var(--tts-muted)]">내용 없음</div>;
  }

  return (
    <div className="text-[13px]">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-widest text-[color:var(--tts-sub)]">
        <span>{NAMES[primaryLang]}</span>
        {primaryLang === originalLang && <span className="rounded bg-[color:var(--tts-accent-dim)] px-1.5 py-0.5 text-[9px] text-[color:var(--tts-accent)]">원문</span>}
      </div>
      <div className="whitespace-pre-wrap">{primaryText}</div>
      {otherLangs.length > 0 && (
        <details className="mt-3 cursor-pointer">
          <summary className="text-[11px] text-[color:var(--tts-sub)] hover:text-[color:var(--tts-text)]">
            다른 언어 보기 ({otherLangs.map((l) => NAMES[l]).join(", ")})
          </summary>
          <div className="mt-2 space-y-3 border-l-2 border-[color:var(--tts-border)] pl-3">
            {otherLangs.map((l) => (
              <div key={l}>
                <div className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-widest text-[color:var(--tts-sub)]">
                  <span>{NAMES[l]}</span>
                  {l === originalLang && <span className="rounded bg-[color:var(--tts-accent-dim)] px-1.5 py-0.5 text-[9px] text-[color:var(--tts-accent)]">원문</span>}
                </div>
                <div className="whitespace-pre-wrap text-[color:var(--tts-sub)]">{map[l]}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
