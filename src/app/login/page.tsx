"use client";

// 로그인 화면 — docs/ui-prototypes/erp-input-forms.jsx 의 P0 를 다크모드 Tailwind 로 포팅.
// 4필드: 회사코드(TV/VR) · 아이디 · 비밀번호 · 언어(VI/KO/EN).
// 제출 → POST /api/auth/login → 성공 시 ?next 또는 / 로 이동.

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LANG_STORAGE_KEY = "tts_preferred_lang";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/";

  const [companyCode, setCompanyCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("VI");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 마지막 선택 언어 기본값 복원
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(LANG_STORAGE_KEY) : null;
    if (stored && ["VI", "EN", "KO"].includes(stored)) setLanguage(stored);
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode, username, password, language }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(mapError(data.error));
        return;
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANG_STORAGE_KEY, language);
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("네트워크 오류. 잠시 후 다시 시도하세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-4">
      <div className="w-[380px] max-w-full rounded-2xl border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-9">
        <div className="mb-6 text-center">
          <div className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)]">
            TELLUSTECH VINA
          </div>
          <div className="mt-1 text-[22px] font-extrabold text-[color:var(--tts-text)]">
            ERP Login
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="회사코드" required>
            <Select
              value={companyCode}
              onChange={setCompanyCode}
              placeholder="회사 선택"
              options={[
                { v: "TV", l: "TV — Tellustech Vina" },
                { v: "VR", l: "VR — Vietrental" },
              ]}
              required
            />
          </Field>

          <Field label="아이디" required>
            <TextInput
              value={username}
              onChange={setUsername}
              placeholder="사원코드 또는 아이디"
              autoComplete="username"
              required
            />
          </Field>

          <Field label="비밀번호" required>
            <TextInput
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Field>

          <Field label="언어">
            <Select
              value={language}
              onChange={setLanguage}
              options={[
                { v: "VI", l: "Tiếng Việt" },
                { v: "KO", l: "한국어" },
                { v: "EN", l: "English" },
              ]}
            />
          </Field>

          {error && (
            <div className="rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-[color:var(--tts-primary)] py-3 text-[15px] font-bold text-white disabled:opacity-60"
          >
            {submitting ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}

function mapError(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "아이디 또는 비밀번호가 올바르지 않습니다.";
    case "company_not_allowed":
      return "선택한 회사에 접근 권한이 없습니다.";
    case "invalid_input":
      return "입력값을 확인해 주세요.";
    default:
      return "로그인에 실패했습니다.";
  }
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-semibold text-[color:var(--tts-sub)]">
        {label}
        {required && <span className="text-[color:var(--tts-danger)]"> *</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      autoComplete={autoComplete}
      className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
    />
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: { v: string; l: string }[];
  required?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
}
