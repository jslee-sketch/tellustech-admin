import "server-only";

// Claude API 번역 헬퍼. ANTHROPIC_API_KEY 있으면 호출, 없으면 원문 그대로 반환(graceful).
// 적용: AS 증상, 사건평가, 지연사유 등 자유서술 3언어 필드 저장 시 사용.
//
// 프롬프트: "Translate the text to Vietnamese/English/Korean. Return only the translation."
// 응답 파싱: messages API 응답의 content[0].text.

type Lang = "VI" | "EN" | "KO";

const LANG_NAMES: Record<Lang, string> = {
  VI: "Vietnamese",
  EN: "English",
  KO: "Korean",
};

/**
 * 주어진 텍스트를 대상 언어로 번역. API 키 없거나 실패 시 null 반환.
 * 호출 경로에서 "null 이면 저장 대상 필드를 null 로 둔다" 처리 권장.
 */
export async function translateText(text: string, targetLang: Lang, sourceLang?: Lang): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!text || text.trim().length === 0) return null;
  if (sourceLang === targetLang) return text;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Translate the following text into ${LANG_NAMES[targetLang]}. Return only the translation, no explanation.\n\nText:\n${text}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("[translate] API error", res.status);
      return null;
    }
    const data = (await res.json()) as { content?: { text?: string }[] };
    const out = data.content?.[0]?.text?.trim();
    return out || null;
  } catch (err) {
    console.error("[translate] failed:", err);
    return null;
  }
}

/**
 * 3언어 필드 중 하나가 채워졌을 때 나머지 2개를 자동 채움.
 * 입력된 필드 중 null 아닌 첫 번째가 소스.
 */
export async function fillTranslations(fields: {
  vi?: string | null;
  en?: string | null;
  ko?: string | null;
  originalLang: Lang;
}): Promise<{ vi: string | null; en: string | null; ko: string | null }> {
  const result: { vi: string | null; en: string | null; ko: string | null } = {
    vi: fields.vi ?? null,
    en: fields.en ?? null,
    ko: fields.ko ?? null,
  };
  const sourceKey = fields.originalLang.toLowerCase() as "vi" | "en" | "ko";
  const source = result[sourceKey];
  if (!source) return result;

  for (const lang of ["vi", "en", "ko"] as const) {
    if (result[lang]) continue;
    const translated = await translateText(source, lang.toUpperCase() as Lang, fields.originalLang);
    if (translated) result[lang] = translated;
  }
  return result;
}
