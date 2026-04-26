"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Textarea } from "@/components/ui";
import { t, type Lang as I18nLang } from "@/lib/i18n";

type Lang = "VI" | "EN" | "KO";

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  contentVi: string | null;
  contentEn: string | null;
  contentKo: string | null;
  originalLang: Lang;
  mentions: string[];
  createdAt: string;
};

type Props = {
  roomId: string;
  currentUserId: string;
  currentLanguage: Lang;
  initialMessages: Message[];
  lang: I18nLang;
};

const LANG_LABELS: Record<Lang, string> = { VI: "Tiếng Việt", EN: "English", KO: "한국어" };

// 텍스트 → 언어 자동 감지. 한글 1자라도 있으면 KO, 베트남어 특수문자 있으면 VI, 그 외 EN.
function detectLang(text: string): Lang {
  if (/[가-힣]/.test(text)) return "KO";
  if (/[ăâđêôơưĂÂĐÊÔƠƯáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ]/.test(text)) return "VI";
  return "EN";
}

export function ChatRoomView({ roomId, currentUserId, initialMessages, lang }: Props) {
  // 표시 언어 = 사이드바의 세션 언어(lang). 별도 state 불필요.
  // 원문 언어 = 입력 텍스트에서 자동 감지. 별도 셀렉터 불필요.
  const displayLang: Lang = lang;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages`, { cache: "no-store" });
      if (!res.ok) return;
      const j = await res.json();
      if (Array.isArray(j?.messages)) {
        setMessages((prev) => {
          const next = j.messages as Array<{
            id: string;
            senderId: string;
            contentVi: string | null;
            contentEn: string | null;
            contentKo: string | null;
            originalLang: Lang;
            mentions: string[];
            createdAt: string;
            sender?: { username: string };
          }>;
          const prevIds = new Set(prev.map((m) => m.id));
          if (next.length === prev.length && next.every((m) => prevIds.has(m.id))) return prev;
          return next.map((m) => ({
            id: m.id,
            senderId: m.senderId,
            senderName: m.sender?.username ?? "?",
            contentVi: m.contentVi,
            contentEn: m.contentEn,
            contentKo: m.contentKo,
            originalLang: m.originalLang,
            mentions: m.mentions ?? [],
            createdAt: m.createdAt,
          }));
        });
      }
    } catch {
      // 네트워크 에러는 조용히 무시 (다음 폴링에서 재시도)
    }
  }, [roomId]);

  useEffect(() => {
    const tm = setInterval(poll, 5000);
    return () => clearInterval(tm);
  }, [poll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    try {
      const detectedLang = detectLang(text);
      const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, originalLang: detectedLang }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error ?? t("msg.sendFailed", lang));
        return;
      }
      setContent("");
      await poll();
    } finally {
      setSending(false);
    }
  }

  function getDisplay(m: Message): { text: string; isFallback: boolean } {
    const byLang: Record<Lang, string | null> = { VI: m.contentVi, EN: m.contentEn, KO: m.contentKo };
    if (byLang[displayLang]) return { text: byLang[displayLang]!, isFallback: false };
    const fallback = byLang[m.originalLang] ?? byLang.VI ?? byLang.EN ?? byLang.KO ?? "";
    return { text: fallback, isFallback: true };
  }

  function getOriginal(m: Message): string {
    const byLang: Record<Lang, string | null> = { VI: m.contentVi, EN: m.contentEn, KO: m.contentKo };
    return byLang[m.originalLang] ?? "";
  }

  return (
    <div className="flex flex-col">
      <div
        ref={listRef}
        className="h-[480px] overflow-y-auto rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3"
      >
        {messages.length === 0 ? (
          <p className="text-center text-[12px] text-[color:var(--tts-muted)]">{t("msg.noMessagesYet", lang)}</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => {
              const mine = m.senderId === currentUserId;
              const { text, isFallback } = getDisplay(m);
              const original = getOriginal(m);
              const ts = new Date(m.createdAt).toLocaleString("vi-VN", { hour12: false });
              const hasOriginalDifferent = isFallback && original && original !== text;
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 ${mine ? "bg-[color:var(--tts-primary-dim)]" : "bg-[color:var(--tts-card)]"}`}>
                    {!mine && <div className="mb-0.5 text-[10px] font-bold text-[color:var(--tts-accent)]">{m.senderName}</div>}
                    <div className="whitespace-pre-wrap text-[13px] text-[color:var(--tts-text)]">{text}</div>
                    {(isFallback || m.originalLang !== displayLang) && original && (
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => setShowOriginal((s) => ({ ...s, [m.id]: !s[m.id] }))}
                          className="text-[10px] text-[color:var(--tts-muted)] hover:underline"
                        >
                          {showOriginal[m.id] ? t("label.hideOriginal", lang) : t("label.viewOriginal", lang).replace("{lang}", LANG_LABELS[m.originalLang])}
                        </button>
                        {showOriginal[m.id] && hasOriginalDifferent && (
                          <div className="mt-1 whitespace-pre-wrap border-t border-[color:var(--tts-border)] pt-1 text-[12px] text-[color:var(--tts-sub)]">
                            {original}
                          </div>
                        )}
                      </div>
                    )}
                    {m.mentions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.mentions.map((x) => (
                          <Badge key={x} tone="accent">@{x}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] text-[color:var(--tts-muted)]">{ts}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={handleSend} className="mt-3">
        <div className="mb-1 text-[10px] text-[color:var(--tts-muted)]">
          {t("label.aiAutoTranslateNote", lang)}
        </div>
        <Textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("placeholder.chatInput", lang)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
            }
          }}
        />
        {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
        <div className="mt-2 flex justify-end">
          <Button type="submit" disabled={sending || !content.trim()}>
            {sending ? t("btn.sending", lang) : t("btn.send", lang)}
          </Button>
        </div>
      </form>
    </div>
  );
}
