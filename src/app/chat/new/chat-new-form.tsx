"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button, Checkbox, Field, Note, Row, Select, TextInput } from "@/components/ui";

type UserOption = { value: string; label: string };

export function ChatNewForm({ users }: { users: UserOption[] }) {
  const router = useRouter();
  const [type, setType] = useState<"DIRECT" | "GROUP">("DIRECT");
  const [name, setName] = useState("");
  const [directUserId, setDirectUserId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.label.toLowerCase().includes(q));
  }, [users, filter]);

  function toggleMember(id: string) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload =
        type === "DIRECT"
          ? { type, memberIds: directUserId ? [directUserId] : [] }
          : { type, name: name || null, memberIds };
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error ?? "생성 실패");
        return;
      }
      router.push("/chat");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">
        DIRECT 는 상대 1명과의 1:1 채팅. GROUP 은 여러 명과 주제방. 생성자는 자동 멤버.
      </Note>
      <Row>
        <Field label="유형" required width="200px">
          <Select
            required
            value={type}
            onChange={(e) => setType(e.target.value as "DIRECT" | "GROUP")}
            options={[
              { value: "DIRECT", label: "DIRECT · 1:1" },
              { value: "GROUP", label: "GROUP · 그룹" },
            ]}
          />
        </Field>
        {type === "GROUP" && (
          <Field label="방 이름">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 영업팀 · 프로젝트 A" />
          </Field>
        )}
      </Row>

      {type === "DIRECT" ? (
        <Row>
          <Field label="상대 사용자" required>
            <Select
              required
              value={directUserId}
              onChange={(e) => setDirectUserId(e.target.value)}
              placeholder="선택"
              options={users}
            />
          </Field>
        </Row>
      ) : (
        <Row>
          <Field label={`멤버 (${memberIds.length}명 선택)`} required>
            <div className="mb-2">
              <TextInput value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="이름으로 필터" />
            </div>
            <div className="max-h-[320px] overflow-y-auto rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-2">
              {filtered.length === 0 ? (
                <p className="px-2 py-1 text-[12px] text-[color:var(--tts-muted)]">사용자 없음</p>
              ) : (
                <ul className="space-y-1">
                  {filtered.map((u) => (
                    <li key={u.value}>
                      <Checkbox
                        checked={memberIds.includes(u.value)}
                        onChange={() => toggleMember(u.value)}
                        label={u.label}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>
        </Row>
      )}

      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2">
        <Button type="submit" disabled={submitting || (type === "DIRECT" ? !directUserId : memberIds.length === 0)}>
          {submitting ? "생성 중..." : "채팅방 생성"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/chat")}>취소</Button>
      </div>
    </form>
  );
}
