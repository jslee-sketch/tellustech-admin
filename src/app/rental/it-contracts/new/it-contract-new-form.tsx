"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, TextInput } from "@/components/ui";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import { t, type Lang } from "@/lib/i18n";

type Props = {
  sessionCompany: string; // TV 또는 VR — 계약번호 prefix 안내용
  clientOptions: { value: string; label: string }[];
  lang: Lang;
};

type FormState = {
  clientId: string;
  installationAddress: string;
  startDate: string;
  endDate: string;
  deposit: string;
  installationFee: string;
  deliveryFee: string;
  additionalServiceFee: string;
  currency: "VND" | "USD" | "KRW" | "JPY" | "CNY";
  fxRate: string;
  contractMgrName: string;
  contractMgrPhone: string;
  contractMgrOffice: string;
  contractMgrEmail: string;
  technicalMgrName: string;
  technicalMgrPhone: string;
  technicalMgrOffice: string;
  technicalMgrEmail: string;
  financeMgrName: string;
  financeMgrPhone: string;
  financeMgrOffice: string;
  financeMgrEmail: string;
};

const initial: FormState = {
  clientId: "",
  installationAddress: "",
  startDate: "",
  endDate: "",
  deposit: "",
  installationFee: "",
  deliveryFee: "",
  additionalServiceFee: "",
  currency: "VND",
  fxRate: "1",
  contractMgrName: "",
  contractMgrPhone: "",
  contractMgrOffice: "",
  contractMgrEmail: "",
  technicalMgrName: "",
  technicalMgrPhone: "",
  technicalMgrOffice: "",
  technicalMgrEmail: "",
  financeMgrName: "",
  financeMgrPhone: "",
  financeMgrOffice: "",
  financeMgrEmail: "",
};

export function ItContractNewForm({ sessionCompany, clientOptions, lang }: Props) {
  const router = useRouter();
  const [value, setValue] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setValue((p) => ({ ...p, [k]: v }));

  const prefixPreview = sessionCompany === "TV" ? "TLS-" : "VRT-";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        clientId: value.clientId,
        installationAddress: value.installationAddress || null,
        startDate: value.startDate,
        endDate: value.endDate,
        status: "DRAFT",
        deposit: value.deposit || null,
        installationFee: value.installationFee || null,
        deliveryFee: value.deliveryFee || null,
        additionalServiceFee: value.additionalServiceFee || null,
        currency: value.currency,
        fxRate: value.fxRate || "1",
        contractMgrName: value.contractMgrName || null,
        contractMgrPhone: value.contractMgrPhone || null,
        contractMgrOffice: value.contractMgrOffice || null,
        contractMgrEmail: value.contractMgrEmail || null,
        technicalMgrName: value.technicalMgrName || null,
        technicalMgrPhone: value.technicalMgrPhone || null,
        technicalMgrOffice: value.technicalMgrOffice || null,
        technicalMgrEmail: value.technicalMgrEmail || null,
        financeMgrName: value.financeMgrName || null,
        financeMgrPhone: value.financeMgrPhone || null,
        financeMgrOffice: value.financeMgrOffice || null,
        financeMgrEmail: value.financeMgrEmail || null,
      };
      const res = await fetch("/api/rental/it-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string; reason?: string } };
        setError(data.details?.message ?? mapError(data.error, data.details?.reason, lang));
        return;
      }
      const data = (await res.json()) as { contract: { id: string } };
      router.push(`/rental/it-contracts/${data.contract.id}`);
      router.refresh();
    } catch {
      setError(t("msg.networkErrorAs", lang));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">
        {t("note.itContractAuto", lang)}
        <span className="font-mono">{prefixPreview}YYMMDD-###</span>
        {t("note.itContractEquipLater", lang)}
      </Note>

      <SectionTitle icon="📝" title={t("section.contractBasic", lang)} />
      <Row>
        <Field label={t("field.client", lang)} required>
          <Select
            required
            value={value.clientId}
            onChange={(e) => set("clientId", e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={clientOptions}
          />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.installAddress", lang)}>
          <TextInput
            value={value.installationAddress}
            onChange={(e) => set("installationAddress", e.target.value)}
            placeholder={t("field.installAddrEquip", lang)}
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

      <SectionTitle icon="💱" title={t("section.contractCurrency", lang)} />
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

      <SectionTitle icon="💰" title={t("section.amountCur", lang).replace("{currency}", value.currency)} />
      <Row>
        <Field label={t("field.depositOnly", lang)} width="200px">
          <TextInput
            type="number"
            value={value.deposit}
            onChange={(e) => set("deposit", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label={t("field.installFeeOnly", lang)} width="200px">
          <TextInput
            type="number"
            value={value.installationFee}
            onChange={(e) => set("installationFee", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label={t("field.deliveryFeeOnly", lang)} width="200px">
          <TextInput
            type="number"
            value={value.deliveryFee}
            onChange={(e) => set("deliveryFee", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label={t("field.addtlServiceFeeOnly", lang)} width="200px">
          <TextInput
            type="number"
            value={value.additionalServiceFee}
            onChange={(e) => set("additionalServiceFee", e.target.value)}
            placeholder="0"
          />
        </Field>
      </Row>

      <SectionTitle icon="📋" title={t("section.contractMgr", lang)} />
      <ManagerBlock
        prefix="contractMgr"
        value={value}
        onChange={set}
        lang={lang}
      />

      <SectionTitle icon="🔧" title={t("section.technicalMgr", lang)} />
      <ManagerBlock
        prefix="technicalMgr"
        value={value}
        onChange={set}
        lang={lang}
      />

      <SectionTitle icon="💼" title={t("section.financeMgr", lang)} />
      <ManagerBlock
        prefix="financeMgr"
        value={value}
        onChange={set}
        lang={lang}
      />

      {error && (
        <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? t("action.saving", lang) : t("btn.contractRegisterAndOpen", lang)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/rental/it-contracts")}>
          {t("action.cancel", lang)}
        </Button>
      </div>
    </form>
  );
}

type ManagerPrefix = "contractMgr" | "technicalMgr" | "financeMgr";

function ManagerBlock({
  prefix,
  value,
  onChange,
  lang,
}: {
  prefix: ManagerPrefix;
  value: FormState;
  onChange: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  lang: Lang;
}) {
  const nameKey = `${prefix}Name` as keyof FormState;
  const phoneKey = `${prefix}Phone` as keyof FormState;
  const officeKey = `${prefix}Office` as keyof FormState;
  const emailKey = `${prefix}Email` as keyof FormState;
  return (
    <Row>
      <Field label={t("field.mgrName", lang)}>
        <TextInput value={value[nameKey]} onChange={(e) => onChange(nameKey, e.target.value)} />
      </Field>
      <Field label={t("field.mgrPhone", lang)}>
        <TextInput
          value={value[phoneKey]}
          onChange={(e) => onChange(phoneKey, e.target.value)}
          placeholder="0912-xxx-xxxx"
        />
      </Field>
      <Field label={t("field.mgrOffice", lang)}>
        <TextInput
          value={value[officeKey]}
          onChange={(e) => onChange(officeKey, e.target.value)}
          placeholder="024-xxxx-xxxx"
        />
      </Field>
      <Field label={t("field.mgrEmail", lang)}>
        <TextInput
          type="email"
          value={value[emailKey]}
          onChange={(e) => onChange(emailKey, e.target.value)}
        />
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
      return t("msg.invalidClientItc", lang);
    case "invalid_input":
      return t("msg.invalidInputItc", lang);
    default:
      return t("msg.saveFailed", lang);
  }
}
