"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, ClientCombobox, Field, Note, Row, SectionTitle, Select, TextInput } from "@/components/ui";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import { t, type Lang } from "@/lib/i18n";

type ClientOption = { id: string; label: string; address: string };

type Props = { clients: ClientOption[]; lang: Lang };

type FormState = {
  clientId: string;
  contractNumber: string;
  address: string;
  startDate: string;
  endDate: string;
  currency: "VND" | "USD" | "KRW" | "JPY" | "CNY";
  fxRate: string;
  contractMgrName: string;
  contractMgrPhone: string;
  contractMgrEmail: string;
  technicalMgrName: string;
  technicalMgrPhone: string;
  technicalMgrEmail: string;
  financeMgrName: string;
  financeMgrPhone: string;
  financeMgrEmail: string;
};

const initial: FormState = {
  clientId: "",
  contractNumber: "",
  address: "",
  startDate: "",
  endDate: "",
  currency: "VND",
  fxRate: "1",
  contractMgrName: "",
  contractMgrPhone: "",
  contractMgrEmail: "",
  technicalMgrName: "",
  technicalMgrPhone: "",
  technicalMgrEmail: "",
  financeMgrName: "",
  financeMgrPhone: "",
  financeMgrEmail: "",
};

export function TmRentalNewForm({ clients, lang }: Props) {
  const router = useRouter();
  const [value, setValue] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setValue((p) => ({ ...p, [k]: v }));

  function onClientChange(next: string) {
    const c = clients.find((x) => x.id === next);
    setValue((p) => ({
      ...p,
      clientId: next,
      // 주소 미입력이면 거래처 주소 자동 채움
      address: p.address || (c?.address ?? ""),
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/rental/tm-rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...value,
          contractNumber: value.contractNumber || null,
          address: value.address || null,
          items: [], // 품목은 저장 후 상세에서 추가
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string; reason?: string } };
        setError(body.details?.message ?? mapError(body.error, body.details?.reason, lang));
        return;
      }
      const data = (await res.json()) as { rental: { id: string } };
      router.push(`/rental/tm-rentals/${data.rental.id}`);
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">
        {t("note.tmRentalAuto", lang)}<span className="font-mono">TM-YYMMDD-###</span>{t("note.tmRentalAutoSuffix", lang)}
      </Note>

      <SectionTitle icon="🏢" title={t("section.basicInfo", lang)} />
      <Row>
        <Field label={t("field.client", lang)} required>
          <ClientCombobox value={value.clientId} onChange={onClientChange} required lang={lang} />
        </Field>
        <Field label={t("field.contractNumberOpt", lang)} width="220px">
          <TextInput
            value={value.contractNumber}
            onChange={(e) => set("contractNumber", e.target.value)}
            placeholder={t("placeholder.contractNum", lang)}
          />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.address", lang)}>
          <TextInput
            value={value.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder={t("placeholder.installAddr", lang)}
          />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.rentalStart", lang)} required width="200px">
          <TextInput
            type="date"
            required
            value={value.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </Field>
        <Field label={t("field.rentalEnd", lang)} required width="200px">
          <TextInput
            type="date"
            required
            value={value.endDate}
            onChange={(e) => set("endDate", e.target.value)}
          />
        </Field>
      </Row>

      <SectionTitle icon="💱" title={t("field.currency", lang)} />
      <Row>
        <Field label={t("field.currency", lang)} required width="200px">
          <Select
            required
            value={value.currency}
            onChange={(e) => set("currency", e.target.value as FormState["currency"])}
            options={CURRENCY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
          />
        </Field>
        <Field label={t("field.fxRate", lang)} width="220px" hint={value.currency === "VND" ? t("hint.fxRateVndDefault", lang) : t("hint.fxRateConversion", lang).replace("{currency}", value.currency)}>
          <TextInput
            type="number"
            step="0.000001"
            min={0}
            value={value.fxRate}
            onChange={(e) => set("fxRate", e.target.value)}
            disabled={value.currency === "VND"}
          />
        </Field>
      </Row>

      <SectionTitle icon="📋" title={t("section.contractMgr", lang)} />
      <MgrBlock prefix="contractMgr" value={value} set={set} lang={lang} />

      <SectionTitle icon="🔧" title={t("section.technicalMgr", lang)} />
      <MgrBlock prefix="technicalMgr" value={value} set={set} lang={lang} />

      <SectionTitle icon="💼" title={t("section.financeMgr", lang)} />
      <MgrBlock prefix="financeMgr" value={value} set={set} lang={lang} />

      {error && (
        <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? t("action.saving", lang) : t("btn.tmCreateOpen", lang)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/rental/tm-rentals")}>
          {t("action.cancel", lang)}
        </Button>
      </div>
    </form>
  );
}

function MgrBlock({
  prefix,
  value,
  set,
  lang,
}: {
  prefix: "contractMgr" | "technicalMgr" | "financeMgr";
  value: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  lang: Lang;
}) {
  const nameK = `${prefix}Name` as keyof FormState;
  const phoneK = `${prefix}Phone` as keyof FormState;
  const emailK = `${prefix}Email` as keyof FormState;
  return (
    <Row>
      <Field label={t("field.mgrName", lang)}>
        <TextInput value={value[nameK]} onChange={(e) => set(nameK, e.target.value)} />
      </Field>
      <Field label={t("field.mgrPhone", lang)}>
        <TextInput value={value[phoneK]} onChange={(e) => set(phoneK, e.target.value)} />
      </Field>
      <Field label={t("field.mgrEmail", lang)}>
        <TextInput type="email" value={value[emailK]} onChange={(e) => set(emailK, e.target.value)} />
      </Field>
    </Row>
  );
}

function mapError(code: string | undefined, reason: string | undefined, lang: Lang): string {
  if (code === "invalid_input" && reason === "before_start") {
    return t("msg.endBeforeStart", lang);
  }
  switch (code) {
    case "invalid_client":
      return t("msg.invalidClient", lang);
    default:
      return t("msg.saveFailed", lang);
  }
}
