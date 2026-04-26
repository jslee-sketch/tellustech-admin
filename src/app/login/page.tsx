"use client";

// 로그인 화면 — 사내(내부 직원) + 고객 포탈 토글.
// 사내: 회사코드 + 아이디 + 비밀번호 + 언어
// 포탈: clientCode + 비밀번호 (회사코드/언어 생략, 성공 시 /portal)
// 라벨: 베트남어 / 한국어 동시 표기.

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

  const [mode, setMode] = useState<"staff" | "portal">("staff");
  const [companyCode, setCompanyCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("VI");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(LANG_STORAGE_KEY) : null;
    if (stored && ["VI", "EN", "KO"].includes(stored)) setLanguage(stored);
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = mode === "portal"
        ? { username, password, language: "VI" }                     // 포탈 = clientCode 로 username, 회사코드 없음
        : { companyCode, username, password, language };
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(mapError(data.error));
        return;
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANG_STORAGE_KEY, language);
      }
      router.push(mode === "portal" ? "/portal" : nextPath);
      router.refresh();
    } catch {
      setError("네트워크 오류 / Lỗi mạng");
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(m: "staff" | "portal") {
    setMode(m);
    setError(null);
    if (m === "portal") setCompanyCode("");
  }

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-4">
      <div className="w-[400px] max-w-full rounded-2xl border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-9">
        <div className="mb-6 text-center">
          <div className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)]">
            TELLUSTECH VINA
          </div>
          <div className="mt-1 text-[22px] font-extrabold text-[color:var(--tts-text)]">
            {mode === "portal" ? "고객 포탈 / Cổng khách hàng" : "ERP Login / Đăng nhập"}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "staff" && (
            <Field label="회사코드 / Mã công ty" required>
              <Select
                value={companyCode}
                onChange={setCompanyCode}
                placeholder="선택 / Chọn"
                options={[
                  { v: "TV", l: "TV — Tellustech Vina" },
                  { v: "VR", l: "VR — Vietrental" },
                ]}
                required
              />
            </Field>
          )}

          <Field label={mode === "portal" ? "고객코드 / Mã khách hàng" : "아이디 / Tên đăng nhập"} required>
            <TextInput
              value={username}
              onChange={setUsername}
              placeholder={mode === "portal" ? "CL-XXXXXX" : "username"}
              autoComplete="username"
              required
            />
          </Field>

          <Field label="비밀번호 / Mật khẩu" required>
            <TextInput
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Field>

          {mode === "staff" && (
            <Field label="언어 / Ngôn ngữ">
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
          )}

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
            {submitting ? "로그인 중… / Đang đăng nhập…" : "로그인 / Đăng nhập"}
          </button>
        </form>

        {/* 모드 토글 — 구분선 + 반대 모드 진입 버튼 */}
        <div className="mt-6 border-t border-[color:var(--tts-border)] pt-5">
          {mode === "staff" ? (
            <button
              type="button"
              onClick={() => switchMode("portal")}
              className="w-full rounded-lg border border-[color:var(--tts-border)] py-2.5 text-[13px] font-semibold text-[color:var(--tts-sub)] hover:bg-[color:var(--tts-card-hover)] hover:text-[color:var(--tts-text)]"
            >
              🛒 고객 포탈 로그인 / Đăng nhập cổng khách hàng
            </button>
          ) : (
            <button
              type="button"
              onClick={() => switchMode("staff")}
              className="w-full rounded-lg border border-[color:var(--tts-border)] py-2.5 text-[13px] font-semibold text-[color:var(--tts-sub)] hover:bg-[color:var(--tts-card-hover)] hover:text-[color:var(--tts-text)]"
            >
              🏢 사내 직원 로그인 / Đăng nhập nội bộ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function mapError(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "아이디 또는 비밀번호가 올바르지 않습니다 / Tên đăng nhập hoặc mật khẩu sai";
    case "company_not_allowed":
      return "이 회사 접근 권한이 없습니다 / Không có quyền truy cập công ty này";
    case "invalid_input":
      return "입력값이 올바르지 않습니다 / Đầu vào không hợp lệ";
    default:
      return "로그인 실패 / Đăng nhập thất bại";
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
