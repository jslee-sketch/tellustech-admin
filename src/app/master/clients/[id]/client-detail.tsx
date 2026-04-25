"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  DataTable,
  Field,
  Note,
  Row,
  SectionTitle,
  Select,
  Tabs,
  TextInput,
  Textarea,
} from "@/components/ui";
import type { DataTableColumn, TabDef } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type ClientCore = {
  clientCode: string;
  companyNameVi: string;
  companyNameEn: string;
  companyNameKo: string;
  representative: string;
  taxCode: string;
  businessLicenseNo: string;
  industry: string;
  bankName: string;
  bankAccountNumber: string;
  bankHolder: string;
  paymentTerms: string; // UI 편의상 문자열. 서버에서 숫자로 파싱.
  address: string;
  phone: string;
  email: string;
  emailConsent: boolean;
  notes: string;
  leadSource: string;
  referrerId: string;
  referrerEmployeeId: string;
  salesPicId: string;
  grade: string;
  receivableStatus: string;
  marketingTags: string[];
};

type Contact = {
  id: string;
  name: string;
  position: string;
  phone: string;
  email: string;
  isPrimary: boolean;
};

type Props = {
  clientId: string;
  initial: ClientCore;
  contacts: Contact[];
  referrerCandidates: { value: string; label: string }[];
  employeeOptions: { value: string; label: string }[];
  lang: Lang;
};

function buildIndustryOptions(lang: Lang) {
  return [
    { value: "MANUFACTURING", label: t("industry.manufacturing", lang) },
    { value: "LOGISTICS", label: t("industry.logistics", lang) },
    { value: "EDUCATION", label: t("industry.education", lang) },
    { value: "IT", label: t("industry.it", lang) },
    { value: "OTHER", label: t("industry.other", lang) },
  ];
}

function buildTabs(lang: Lang): TabDef[] {
  return [
    { key: "basic", label: t("tab.basicInfo", lang), icon: "📋" },
    { key: "contacts", label: t("tab.contacts", lang), icon: "👤" },
    { key: "sales", label: t("tab.salesMgmt", lang), icon: "💼" },
    { key: "marketing", label: t("tab.marketing", lang), icon: "📧" },
    { key: "transactions", label: t("tab.transactions", lang), icon: "📊" },
    { key: "ar", label: t("tab.ar", lang), icon: "💰" },
  ];
}

export function ClientDetail({
  clientId,
  initial,
  contacts: initialContacts,
  referrerCandidates,
  employeeOptions,
  lang,
}: Props) {
  const router = useRouter();
  const [active, setActive] = useState<string>("basic");
  const [core, setCore] = useState<ClientCore>(initial);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [savingBasic, setSavingBasic] = useState(false);
  const [savingSales, setSavingSales] = useState(false);
  const [savingMarketing, setSavingMarketing] = useState(false);
  const [savingAr, setSavingAr] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ClientCore>(k: K, v: ClientCore[K]) =>
    setCore((p) => ({ ...p, [k]: v }));

  async function patchClient(
    data: Partial<ClientCore>,
    setSaving: (v: boolean) => void,
  ): Promise<boolean> {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/master/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(body.details?.message ?? mapError(body.error, lang));
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError(t("msg.networkError", lang));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleBasicSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await patchClient(
      {
        companyNameVi: core.companyNameVi,
        companyNameEn: core.companyNameEn,
        companyNameKo: core.companyNameKo,
        representative: core.representative,
        taxCode: core.taxCode,
        businessLicenseNo: core.businessLicenseNo,
        industry: core.industry,
        bankName: core.bankName,
        bankAccountNumber: core.bankAccountNumber,
        bankHolder: core.bankHolder,
        paymentTerms: core.paymentTerms,
        address: core.address,
        phone: core.phone,
        email: core.email,
        emailConsent: core.emailConsent,
        notes: core.notes,
      },
      setSavingBasic,
    );
  }

  async function handleSalesSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await patchClient(
      {
        leadSource: core.leadSource,
        grade: core.grade,
        referrerId: core.referrerId,
        referrerEmployeeId: core.referrerEmployeeId,
        salesPicId: core.salesPicId,
      },
      setSavingSales,
    );
  }

  async function handleMarketingSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await patchClient({ marketingTags: core.marketingTags }, setSavingMarketing);
  }

  async function handleArSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await patchClient({ receivableStatus: core.receivableStatus }, setSavingAr);
  }

  async function handleDelete() {
    if (!window.confirm(t("msg.deleteClientConfirm", lang))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/clients/${clientId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(body.details?.message ?? mapError(body.error, lang));
        return;
      }
      router.push("/master/clients");
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <Tabs tabs={buildTabs(lang)} active={active} onChange={setActive} />

      {error && (
        <div className="mb-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      {active === "basic" && (
        <form onSubmit={handleBasicSubmit}>
          <SectionTitle icon="🏢" title={t("section.basicInfo", lang)} />
          <Row>
            <Field label={t("field.clientCode", lang)} width="200px">
              <TextInput value={core.clientCode} disabled />
            </Field>
            <Field label={t("field.companyNameVi", lang)} required>
              <TextInput
                required
                value={core.companyNameVi}
                onChange={(e) => set("companyNameVi", e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.companyNameEn", lang)}>
              <TextInput
                value={core.companyNameEn}
                onChange={(e) => set("companyNameEn", e.target.value)}
              />
            </Field>
            <Field label={t("field.companyNameKo", lang)}>
              <TextInput
                value={core.companyNameKo}
                onChange={(e) => set("companyNameKo", e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.representative", lang)} width="200px">
              <TextInput
                value={core.representative}
                onChange={(e) => set("representative", e.target.value)}
                placeholder="Mr / Ms ..."
              />
            </Field>
            <Field label={t("field.industry", lang)} width="180px">
              <Select
                value={core.industry}
                onChange={(e) => set("industry", e.target.value)}
                placeholder={t("placeholder.notSelected", lang)}
                options={buildIndustryOptions(lang)}
              />
            </Field>
            <Field label={t("field.paymentTerms", lang)} width="160px" hint={t("hint.paymentTermsDefault", lang)}>
              <TextInput
                type="number"
                value={core.paymentTerms}
                onChange={(e) => set("paymentTerms", e.target.value)}
                placeholder="30"
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.taxCode", lang)} width="200px">
              <TextInput value={core.taxCode} onChange={(e) => set("taxCode", e.target.value)} />
            </Field>
            <Field label={t("field.businessLicenseNo", lang)}>
              <TextInput
                value={core.businessLicenseNo}
                onChange={(e) => set("businessLicenseNo", e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.phone", lang)}>
              <TextInput value={core.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label={t("field.email", lang)}>
              <TextInput type="email" value={core.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label={t("field.emailConsent", lang)} width="160px">
              <Checkbox
                checked={core.emailConsent}
                onChange={(e) => set("emailConsent", e.target.checked)}
                label={t("field.marketingConsent", lang)}
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.address", lang)}>
              <TextInput value={core.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
          </Row>

          <SectionTitle icon="💳" title={t("section.bankPayment", lang)} />
          <Row>
            <Field label={t("field.bank", lang)} width="200px">
              <TextInput value={core.bankName} onChange={(e) => set("bankName", e.target.value)} />
            </Field>
            <Field label={t("field.bankAccountNo", lang)}>
              <TextInput
                value={core.bankAccountNumber}
                onChange={(e) => set("bankAccountNumber", e.target.value)}
              />
            </Field>
            <Field label={t("field.bankHolder", lang)} width="200px">
              <TextInput
                value={core.bankHolder}
                onChange={(e) => set("bankHolder", e.target.value)}
              />
            </Field>
          </Row>

          <SectionTitle icon="📝" title={t("section.memo", lang)} />
          <Row>
            <Field label={t("field.note", lang)}>
              <Textarea
                value={core.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder={t("placeholder.note", lang)}
              />
            </Field>
          </Row>

          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingBasic}>
              {savingBasic ? t("action.saving", lang) : t("btn.saveBasicAlt", lang)}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto"
            >
              {deleting ? t("action.deleting", lang) : t("btn.deleteClient", lang)}
            </Button>
          </div>
        </form>
      )}

      {active === "contacts" && (
        <ContactsTab
          clientId={clientId}
          contacts={contacts}
          onChange={setContacts}
          onError={setError}
          lang={lang}
        />
      )}

      {active === "sales" && (
        <form onSubmit={handleSalesSubmit}>
          <SectionTitle icon="💼" title={t("section.salesMgmt", lang)} />
          <Row>
            <Field label={t("field.leadSource", lang)} width="220px">
              <Select
                value={core.leadSource}
                onChange={(e) => set("leadSource", e.target.value)}
                placeholder={t("placeholder.notSelected", lang)}
                options={[
                  { value: "visit", label: t("leadSource.visit", lang) },
                  { value: "exhibition", label: t("leadSource.exhibition", lang) },
                  { value: "referral", label: t("leadSource.referral", lang) },
                  { value: "website", label: t("leadSource.website", lang) },
                  { value: "existing", label: t("leadSource.existing", lang) },
                  { value: "other", label: t("leadSource.other", lang) },
                ]}
              />
            </Field>
            <Field label={t("field.grade", lang)} width="140px">
              <Select
                value={core.grade}
                onChange={(e) => set("grade", e.target.value)}
                placeholder={t("placeholder.notSelected", lang)}
                options={[
                  { value: "A", label: "A" },
                  { value: "B", label: "B" },
                  { value: "C", label: "C" },
                  { value: "D", label: "D" },
                ]}
              />
            </Field>
            <Field label={t("field.referrerClient", lang)}>
              <Select
                value={core.referrerId}
                onChange={(e) => set("referrerId", e.target.value)}
                placeholder={t("placeholder.notSelected", lang)}
                options={referrerCandidates}
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.salesPic", lang)}>
              <Select
                value={core.salesPicId}
                onChange={(e) => set("salesPicId", e.target.value)}
                placeholder={t("placeholder.notSelected", lang)}
                options={employeeOptions}
              />
            </Field>
            <Field label={t("field.referrerEmployee", lang)} hint={t("hint.refByEmployee", lang)}>
              <Select
                value={core.referrerEmployeeId}
                onChange={(e) => set("referrerEmployeeId", e.target.value)}
                placeholder={t("placeholder.notSelected", lang)}
                options={employeeOptions}
              />
            </Field>
          </Row>

          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingSales}>
              {savingSales ? t("action.saving", lang) : t("btn.saveSalesInfo", lang)}
            </Button>
          </div>
        </form>
      )}

      {active === "marketing" && (
        <form onSubmit={handleMarketingSubmit}>
          <SectionTitle icon="📧" title={t("section.marketing", lang)} />
          <MarketingTagsEditor
            tags={core.marketingTags}
            onChange={(tags) => set("marketingTags", tags)}
            lang={lang}
          />
          <Note tone="info">
            태그는 일괄 이메일 발송 / 캠페인 세분화에 사용됩니다 (Phase 2 마케팅 모듈).
          </Note>
          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingMarketing}>
              {savingMarketing ? t("action.saving", lang) : t("btn.saveMarketingInfo", lang)}
            </Button>
          </div>
        </form>
      )}

      {active === "transactions" && (
        <div>
          <SectionTitle icon="📊" title={t("section.transactions", lang)} />
          <Note tone="info">
            매출 / 매입 / 계약 이력은 Phase 2 매출·매입 · Phase 2 렌탈/IT 계약 모듈 구현 후
            이 탭에 집계되어 표시됩니다. 지금은 거래 데이터가 없습니다.
          </Note>
        </div>
      )}

      {active === "ar" && (
        <form onSubmit={handleArSubmit}>
          <SectionTitle icon="💰" title={t("section.ar", lang)} />
          <Row>
            <Field label={t("field.arStatus", lang)} required width="240px">
              <Select
                required
                value={core.receivableStatus}
                onChange={(e) => set("receivableStatus", e.target.value)}
                options={[
                  { value: "NORMAL", label: t("status.normal", lang) },
                  { value: "WARNING", label: t("status.warning", lang) },
                  { value: "BLOCKED", label: t("status.blocked", lang) },
                ]}
              />
            </Field>
            <div className="flex items-end pb-1 text-[11px] text-[color:var(--tts-muted)]">
              {t("field.status", lang)}:{" "}
              <Badge
                tone={
                  core.receivableStatus === "NORMAL"
                    ? "success"
                    : core.receivableStatus === "WARNING"
                    ? "warn"
                    : "danger"
                }
                className="ml-1"
              >
                {arLabel(core.receivableStatus, lang)}
              </Badge>
            </div>
          </Row>
          <Note tone="warn">
            "차단" 상태에서는 Phase 3 AS 접수가 자동 차단됩니다. 미수금 자동 생성·지연 사유
            이력은 Phase 4 재경 모듈 구현 후 이 탭에서 조회 가능합니다.
          </Note>
          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingAr}>
              {savingAr ? t("action.saving", lang) : t("btn.saveArStatus", lang)}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function arLabel(s: string, lang: Lang): string {
  return s === "NORMAL" ? t("status.normal", lang) : s === "WARNING" ? t("status.warning", lang) : t("status.blocked", lang);
}

function mapError(code: string | undefined, lang: Lang): string {
  switch (code) {
    case "invalid_input":
      return t("msg.invalidInput", lang);
    case "invalid_referrer":
      return t("msg.invalidReferrer", lang);
    case "has_dependent_rows":
      return t("msg.hasDependentsClient", lang);
    case "not_found":
      return t("msg.clientDeleteFail", lang);
    default:
      return t("msg.saveFailed", lang);
  }
}

// ─── Contacts Tab ───────────────────────────────────────────────────────

function ContactsTab({
  clientId,
  contacts,
  onChange,
  onError,
  lang,
}: {
  clientId: string;
  contacts: Contact[];
  onChange: (next: Contact[]) => void;
  onError: (msg: string | null) => void;
  lang: Lang;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Contact, "id">>({
    name: "",
    position: "",
    phone: "",
    email: "",
    isPrimary: false,
  });
  const [submitting, setSubmitting] = useState(false);

  function resetDraft() {
    setDraft({ name: "", position: "", phone: "", email: "", isPrimary: false });
    setShowAdd(false);
    setEditingId(null);
  }

  function startEdit(c: Contact) {
    setEditingId(c.id);
    setShowAdd(false);
    setDraft({
      name: c.name,
      position: c.position,
      phone: c.phone,
      email: c.email,
      isPrimary: c.isPrimary,
    });
  }

  async function handleSaveContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    setSubmitting(true);
    try {
      const body = {
        name: draft.name,
        position: draft.position || null,
        phone: draft.phone || null,
        email: draft.email || null,
        isPrimary: draft.isPrimary,
      };
      if (editingId) {
        const res = await fetch(
          `/api/master/clients/${clientId}/contacts/${editingId}`,
          { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
        );
        if (!res.ok) {
          onError(t("msg.contactSaveFail", lang));
          return;
        }
        const data = (await res.json()) as { contact: Contact };
        const normalized = normalizeContact(data.contact);
        const next = contacts.map((c) =>
          c.id === editingId
            ? normalized
            : normalized.isPrimary
            ? { ...c, isPrimary: false }
            : c,
        );
        onChange(next);
      } else {
        const res = await fetch(`/api/master/clients/${clientId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          onError(t("msg.contactAddFail", lang));
          return;
        }
        const data = (await res.json()) as { contact: Contact };
        const normalized = normalizeContact(data.contact);
        const next = contacts.map((c) =>
          normalized.isPrimary ? { ...c, isPrimary: false } : c,
        );
        onChange([normalized, ...next]);
      }
      resetDraft();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("msg.deleteContactConfirm", lang))) return;
    onError(null);
    const res = await fetch(`/api/master/clients/${clientId}/contacts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      onError(t("msg.contactDeleteFail", lang));
      return;
    }
    onChange(contacts.filter((c) => c.id !== id));
    router.refresh();
  }

  const columns: DataTableColumn<Contact>[] = [
    {
      key: "name",
      label: t("col.contactName", lang),
      render: (v, row) => (
        <span className="flex items-center gap-2 font-semibold">
          {v as string}
          {row.isPrimary && <Badge tone="success">{lang === "VI" ? "Chính" : lang === "EN" ? "Main" : "주"}</Badge>}
        </span>
      ),
    },
    { key: "position", label: t("col.position", lang) },
    { key: "phone", label: t("col.phone", lang) },
    { key: "email", label: t("col.email", lang) },
    {
      key: "id",
      label: "",
      width: "150px",
      align: "right",
      render: (_, row) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => startEdit(row)}>
            {t("action.edit", lang)}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
            {t("action.delete", lang)}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {!showAdd && !editingId && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            {t("btn.addContact", lang)}
          </Button>
        )}
      </div>
      {(showAdd || editingId) && (
        <form
          onSubmit={handleSaveContact}
          className="mb-4 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3"
        >
          <Row>
            <Field label={t("field.contactName", lang)} required>
              <TextInput
                required
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <Field label={t("field.position", lang)}>
              <TextInput
                value={draft.position}
                onChange={(e) => setDraft((p) => ({ ...p, position: e.target.value }))}
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.phone", lang)}>
              <TextInput
                value={draft.phone}
                onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
              />
            </Field>
            <Field label={t("field.email", lang)}>
              <TextInput
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
              />
            </Field>
            <Field label={t("field.primaryContact", lang)} width="120px">
              <Checkbox
                checked={draft.isPrimary}
                onChange={(e) => setDraft((p) => ({ ...p, isPrimary: e.target.checked }))}
                label={t("field.designate", lang)}
              />
            </Field>
          </Row>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? t("action.saving", lang) : editingId ? t("btn.editSave", lang) : t("btn.addContact", lang).replace("+ ", "")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={resetDraft}>
              {t("action.cancel", lang)}
            </Button>
          </div>
        </form>
      )}
      <DataTable
        columns={columns}
        data={contacts}
        rowKey={(c) => c.id}
        emptyMessage={t("empty.contacts", lang)}
      />
    </div>
  );
}

function normalizeContact(c: Contact | (Omit<Contact, "position" | "phone" | "email"> & { position: string | null; phone: string | null; email: string | null })): Contact {
  return {
    id: c.id,
    name: c.name,
    position: c.position ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    isPrimary: c.isPrimary,
  };
}

// ─── Marketing Tags Editor ──────────────────────────────────────────────

function MarketingTagsEditor({
  tags,
  onChange,
  lang,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  lang: Lang;
}) {
  const [input, setInput] = useState("");

  function addTag() {
    const tg = input.trim();
    if (!tg) return;
    if (tags.includes(tg)) {
      setInput("");
      return;
    }
    onChange([...tags, tg]);
    setInput("");
  }

  function removeTag(tg: string) {
    onChange(tags.filter((x) => x !== tg));
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {tags.length === 0 ? (
          <span className="text-[12px] text-[color:var(--tts-muted)]">{t("empty.tags", lang)}</span>
        ) : (
          tags.map((tg) => (
            <span
              key={tg}
              className="inline-flex items-center gap-1 rounded bg-[color:var(--tts-purple-dim)] px-2 py-0.5 text-[12px] text-[color:var(--tts-purple)]"
            >
              {tg}
              <button
                type="button"
                onClick={() => removeTag(tg)}
                className="text-[11px] opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <TextInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("placeholder.tagExample", lang)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={addTag}>
          {t("action.add", lang)}
        </Button>
      </div>
    </div>
  );
}
