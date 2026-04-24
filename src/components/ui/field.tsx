import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

// 공통 폼 필드 — 프로토타입의 F/TI/SI/TA 컴포넌트 이식.
// Field: label + required * + child input + optional hint
// TextInput / Select / Textarea / Checkbox: 다크 팔레트 기반 표준 스타일

type FieldProps = {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  width?: string; // e.g. "120px" — 고정폭 필드용
  children: ReactNode;
  className?: string;
};

export function Field({ label, required, hint, error, width, children, className }: FieldProps) {
  const widthStyle = width ? { flex: `0 0 ${width}`, minWidth: width } : { flex: "1 1 220px", minWidth: "130px" };
  return (
    <div
      className={"flex flex-col gap-1" + (className ? " " + className : "")}
      style={widthStyle}
    >
      {label !== undefined && (
        <label className="text-[12px] font-semibold text-[color:var(--tts-sub)]">
          {label}
          {required && <span className="text-[color:var(--tts-danger)]"> *</span>}
        </label>
      )}
      {children}
      {hint && <span className="text-[10px] text-[color:var(--tts-muted)]">{hint}</span>}
      {error && <span className="text-[10px] text-[color:var(--tts-danger)]">{error}</span>}
    </div>
  );
}

const inputBase =
  "rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] placeholder:text-[color:var(--tts-muted)] outline-none focus:border-[color:var(--tts-border-focus)] disabled:cursor-not-allowed disabled:bg-[color:var(--tts-card)] disabled:text-[color:var(--tts-muted)]";

type TextInputProps = InputHTMLAttributes<HTMLInputElement>;
export function TextInput({ className, ...rest }: TextInputProps) {
  return <input {...rest} className={[inputBase, className].filter(Boolean).join(" ")} />;
}

type SelectOption = { value: string; label: string };
type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  options: SelectOption[];
  placeholder?: string;
};
export function Select({ options, placeholder, className, ...rest }: SelectProps) {
  return (
    <select {...rest} className={[inputBase, className].filter(Boolean).join(" ")}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
export function Textarea({ className, rows = 3, ...rest }: TextareaProps) {
  return (
    <textarea
      {...rest}
      rows={rows}
      className={[inputBase, "resize-y", className].filter(Boolean).join(" ")}
    />
  );
}

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
};
export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label
      className={
        "inline-flex items-center gap-2 text-[13px] text-[color:var(--tts-text)]" +
        (className ? " " + className : "")
      }
    >
      <input
        {...rest}
        type="checkbox"
        className="h-4 w-4 rounded border-[color:var(--tts-border)] bg-[color:var(--tts-input)] accent-[color:var(--tts-primary)]"
      />
      {label}
    </label>
  );
}

/** 파일 업로드 드롭존 — 실제 업로드는 consumer가 처리. 여기선 UI만. */
export function FileUpload({
  label = "파일 선택",
  accept = "PDF, JPG, PNG",
  onFile,
  name,
}: {
  label?: string;
  accept?: string;
  onFile?: (file: File) => void;
  name?: string;
}) {
  return (
    <label className="block cursor-pointer rounded-lg border-2 border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] p-3 text-center transition hover:border-[color:var(--tts-primary)]">
      <input
        type="file"
        name={name}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onFile) onFile(file);
        }}
      />
      <div className="text-[18px]">📎</div>
      <div className="text-[11px] text-[color:var(--tts-sub)]">{label}</div>
      <div className="text-[10px] text-[color:var(--tts-muted)]">{accept}</div>
    </label>
  );
}
