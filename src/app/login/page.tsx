"use client";

// 로그인 화면 — 사내(내부 직원) + 고객 포탈 토글.
// 사내: 회사코드 + 아이디 + 비밀번호 + 언어
// 포탈: clientCode + 비밀번호 (회사코드/언어 생략, 성공 시 /portal)

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";

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
  const initialMode = (params.get("portal") === "1" || params.get("mode") === "portal") ? "portal" : "staff";

  const [mode, setMode] = useState<"staff" | "portal">(initialMode);
  const [companyCode, setCompanyCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState<Lang>("VI");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(LANG_STORAGE_KEY) : null;
    if (stored && ["VI", "EN", "KO"].includes(stored)) setLanguage(stored as Lang);
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = mode === "portal"
        ? { username, password, language }
        : { companyCode, username, password, language };
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(mapError(data.error, language));
        return;
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANG_STORAGE_KEY, language);
      }
      router.push(mode === "portal" ? "/portal" : nextPath);
      router.refresh();
    } catch {
      setError(t("login.networkError", language));
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
            {mode === "portal" ? t("login.titlePortal", language) : t("login.titleErp", language)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "staff" && (
            <Field label={t("login.companyLabel", language)} required>
              <Select
                value={companyCode}
                onChange={setCompanyCode}
                placeholder={t("login.companySelect", language)}
                options={[
                  { v: "TV", l: "TV — Tellustech Vina" },
                  { v: "VR", l: "VR — Vietrental" },
                ]}
                required
              />
            </Field>
          )}

          <Field label={mode === "portal" ? t("login.clientCode", language) : t("login.username", language)} required>
            <TextInput
              value={username}
              onChange={setUsername}
              placeholder={mode === "portal" ? "CL-XXXXXX" : "username"}
              autoComplete="username"
              required
            />
          </Field>

          <Field label={t("login.password", language)} required>
            <TextInput
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Field>

          <Field label={t("login.language", language)}>
            <Select
              value={language}
              onChange={(v) => setLanguage(v as Lang)}
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
            {submitting ? t("login.signingIn", language) : t("login.signIn", language)}
          </button>
        </form>

        <div className="mt-6 border-t border-[color:var(--tts-border)] pt-5">
          {mode === "staff" ? (
            <button
              type="button"
              onClick={() => switchMode("portal")}
              className="w-full rounded-lg border border-[color:var(--tts-border)] py-2.5 text-[13px] font-semibold text-[color:var(--tts-sub)] hover:bg-[color:var(--tts-card-hover)] hover:text-[color:var(--tts-text)]"
            >
              🛒 {t("login.titlePortal", language)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => switchMode("staff")}
              className="w-full rounded-lg border border-[color:var(--tts-border)] py-2.5 text-[13px] font-semibold text-[color:var(--tts-sub)] hover:bg-[color:var(--tts-card-hover)] hover:text-[color:var(--tts-text)]"
            >
              🏢 {t("portal.sidebar.staffLogin", language).replace("🏢 ", "")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function mapError(code: string | undefined, lang: Lang): string {
  switch (code) {
    case "invalid_credentials":
      return t("login.errInvalidCreds", lang);
    case "company_not_allowed":
      return t("login.errCompanyForbidden", lang);
    case "invalid_input":
      return t("login.errInvalidInput", lang);
    default:
      return t("login.errLoginFailed", lang);
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
