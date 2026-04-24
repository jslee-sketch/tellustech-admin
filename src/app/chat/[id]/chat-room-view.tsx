"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Select, Textarea } from "@/components/ui";

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
};

const LANG_LABELS: Record<Lang, string> = { VI: "Tiếng Việt", EN: "English", KO: "한국어" };

export function ChatRoomView({ roomId, currentUserId, currentLanguage, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [displayLang, setDisplayLang] = useState<Lang>(currentLanguage);
  const [content, setContent] = useState("");
  const [originalLang, setOriginalLang] = useState<Lang>(currentLanguage);
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
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
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
      const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, originalLang }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error ?? "전송 실패");
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
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] text-[color:var(--tts-muted)]">
          표시 언어 — 번역본이 없으면 원문 표시
        </div>
        <Select
          value={displayLang}
          onChange={(e) => setDisplayLang(e.target.value as Lang)}
          options={[
            { value: "VI", label: "VI · Tiếng Việt" },
            { value: "EN", label: "EN · English" },
            { value: "KO", label: "KO · 한국어" },
          ]}
          className="w-40"
        />
      </div>

      <div
        ref={listRef}
        className="h-[480px] overflow-y-auto rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3"
      >
        {messages.length === 0 ? (
          <p className="text-center text-[12px] text-[color:var(--tts-muted)]">아직 메시지가 없습니다. 첫 메시지를 보내보세요.</p>
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
                          {showOriginal[m.id] ? "원문 숨기기" : `원문 보기 (${LANG_LABELS[m.originalLang]})`}
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
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] text-[color:var(--tts-muted)]">원문 언어</span>
          <Select
            value={originalLang}
            onChange={(e) => setOriginalLang(e.target.value as Lang)}
            options={[
              { value: "VI", label: "VI" },
              { value: "EN", label: "EN" },
              { value: "KO", label: "KO" },
            ]}
            className="w-24"
          />
          <span className="text-[10px] text-[color:var(--tts-muted)]">저장 시 Claude API가 나머지 2개 언어로 자동 번역 (API 키 없으면 원문만 저장)</span>
        </div>
        <Textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="메시지 입력 — Shift+Enter 줄바꿈, Enter 전송"
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
            {sending ? "전송 중..." : "전송"}
          </Button>
        </div>
      </form>
    </div>
  );
}
