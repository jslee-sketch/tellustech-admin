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
};

const INDUSTRY_OPTIONS = [
  { value: "MANUFACTURING", label: "제조" },
  { value: "LOGISTICS", label: "물류" },
  { value: "EDUCATION", label: "교육" },
  { value: "IT", label: "IT" },
  { value: "OTHER", label: "기타" },
];

const TABS: TabDef[] = [
  { key: "basic", label: "기본정보", icon: "📋" },
  { key: "contacts", label: "담당자", icon: "👤" },
  { key: "sales", label: "영업관리", icon: "💼" },
  { key: "marketing", label: "마케팅", icon: "📧" },
  { key: "transactions", label: "거래현황", icon: "📊" },
  { key: "ar", label: "미수금", icon: "💰" },
];

export function ClientDetail({
  clientId,
  initial,
  contacts: initialContacts,
  referrerCandidates,
  employeeOptions,
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
        setError(body.details?.message ?? mapError(body.error));
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("네트워크 오류가 발생했습니다.");
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
    if (!window.confirm("이 거래처를 삭제하시겠습니까? 관련 이력이 있으면 실패합니다.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/clients/${clientId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(body.details?.message ?? mapError(body.error));
        return;
      }
      router.push("/master/clients");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <Tabs tabs={TABS} active={active} onChange={setActive} />

      {error && (
        <div className="mb-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      {active === "basic" && (
        <form onSubmit={handleBasicSubmit}>
          <SectionTitle icon="🏢" title="기본 정보" />
          <Row>
            <Field label="거래처코드" width="200px">
              <TextInput value={core.clientCode} disabled />
            </Field>
            <Field label="거래처명 (VI)" required>
              <TextInput
                required
                value={core.companyNameVi}
                onChange={(e) => set("companyNameVi", e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label="거래처명 (EN)">
              <TextInput
                value={core.companyNameEn}
                onChange={(e) => set("companyNameEn", e.target.value)}
              />
            </Field>
            <Field label="거래처명 (KO)">
              <TextInput
                value={core.companyNameKo}
                onChange={(e) => set("companyNameKo", e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label="대표자" width="200px">
              <TextInput
                value={core.representative}
                onChange={(e) => set("representative", e.target.value)}
                placeholder="Mr / Ms ..."
              />
            </Field>
            <Field label="업종" width="180px">
              <Select
                value={core.industry}
                onChange={(e) => set("industry", e.target.value)}
                placeholder="선택 안 함"
                options={INDUSTRY_OPTIONS}
              />
            </Field>
            <Field label="결제조건 (일)" width="160px" hint="공란 = 30일 기본">
              <TextInput
                type="number"
                value={core.paymentTerms}
                onChange={(e) => set("paymentTerms", e.target.value)}
                placeholder="30"
              />
            </Field>
          </Row>
          <Row>
            <Field label="MST (사업자번호)" width="200px">
              <TextInput value={core.taxCode} onChange={(e) => set("taxCode", e.target.value)} />
            </Field>
            <Field label="사업자등록번호">
              <TextInput
                value={core.businessLicenseNo}
                onChange={(e) => set("businessLicenseNo", e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label="전화">
              <TextInput value={core.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="이메일">
              <TextInput type="email" value={core.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="이메일 수신 동의" width="160px">
              <Checkbox
                checked={core.emailConsent}
                onChange={(e) => set("emailConsent", e.target.checked)}
                label="마케팅 수신 동의"
              />
            </Field>
          </Row>
          <Row>
            <Field label="주소">
              <TextInput value={core.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
          </Row>

          <SectionTitle icon="💳" title="계좌/결제" />
          <Row>
            <Field label="은행명" width="200px">
              <TextInput value={core.bankName} onChange={(e) => set("bankName", e.target.value)} />
            </Field>
            <Field label="계좌번호">
              <TextInput
                value={core.bankAccountNumber}
                onChange={(e) => set("bankAccountNumber", e.target.value)}
              />
            </Field>
            <Field label="예금주" width="200px">
              <TextInput
                value={core.bankHolder}
                onChange={(e) => set("bankHolder", e.target.value)}
              />
            </Field>
          </Row>

          <SectionTitle icon="📝" title="메모" />
          <Row>
            <Field label="비고">
              <Textarea
                value={core.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="자유 메모"
              />
            </Field>
          </Row>

          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingBasic}>
              {savingBasic ? "저장 중..." : "기본정보 저장"}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto"
            >
              {deleting ? "삭제 중..." : "거래처 삭제"}
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
        />
      )}

      {active === "sales" && (
        <form onSubmit={handleSalesSubmit}>
          <SectionTitle icon="💼" title="영업 관리" />
          <Row>
            <Field label="유입경로" width="220px">
              <Select
                value={core.leadSource}
                onChange={(e) => set("leadSource", e.target.value)}
                placeholder="선택 안 함"
                options={[
                  { value: "visit", label: "방문" },
                  { value: "exhibition", label: "전시회" },
                  { value: "referral", label: "소개" },
                  { value: "website", label: "웹사이트" },
                  { value: "existing", label: "기존고객" },
                  { value: "other", label: "기타" },
                ]}
              />
            </Field>
            <Field label="등급" width="140px">
              <Select
                value={core.grade}
                onChange={(e) => set("grade", e.target.value)}
                placeholder="선택 안 함"
                options={[
                  { value: "A", label: "A" },
                  { value: "B", label: "B" },
                  { value: "C", label: "C" },
                  { value: "D", label: "D" },
                ]}
              />
            </Field>
            <Field label="소개자 (다른 거래처)">
              <Select
                value={core.referrerId}
                onChange={(e) => set("referrerId", e.target.value)}
                placeholder="선택 안 함"
                options={referrerCandidates}
              />
            </Field>
          </Row>
          <Row>
            <Field label="영업담당 (직원)">
              <Select
                value={core.salesPicId}
                onChange={(e) => set("salesPicId", e.target.value)}
                placeholder="선택 안 함"
                options={employeeOptions}
              />
            </Field>
            <Field label="소개자 (내부 직원)" hint="거래처 대신 직원이 소개한 경우">
              <Select
                value={core.referrerEmployeeId}
                onChange={(e) => set("referrerEmployeeId", e.target.value)}
                placeholder="선택 안 함"
                options={employeeOptions}
              />
            </Field>
          </Row>

          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingSales}>
              {savingSales ? "저장 중..." : "영업정보 저장"}
            </Button>
          </div>
        </form>
      )}

      {active === "marketing" && (
        <form onSubmit={handleMarketingSubmit}>
          <SectionTitle icon="📧" title="마케팅" />
          <MarketingTagsEditor
            tags={core.marketingTags}
            onChange={(tags) => set("marketingTags", tags)}
          />
          <Note tone="info">
            태그는 일괄 이메일 발송 / 캠페인 세분화에 사용됩니다 (Phase 2 마케팅 모듈).
          </Note>
          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingMarketing}>
              {savingMarketing ? "저장 중..." : "마케팅 정보 저장"}
            </Button>
          </div>
        </form>
      )}

      {active === "transactions" && (
        <div>
          <SectionTitle icon="📊" title="거래 현황" />
          <Note tone="info">
            매출 / 매입 / 계약 이력은 Phase 2 매출·매입 · Phase 2 렌탈/IT 계약 모듈 구현 후
            이 탭에 집계되어 표시됩니다. 지금은 거래 데이터가 없습니다.
          </Note>
        </div>
      )}

      {active === "ar" && (
        <form onSubmit={handleArSubmit}>
          <SectionTitle icon="💰" title="미수금" />
          <Row>
            <Field label="미수금 상태" required width="240px">
              <Select
                required
                value={core.receivableStatus}
                onChange={(e) => set("receivableStatus", e.target.value)}
                options={[
                  { value: "NORMAL", label: "정상" },
                  { value: "WARNING", label: "경고" },
                  { value: "BLOCKED", label: "차단" },
                ]}
              />
            </Field>
            <div className="flex items-end pb-1 text-[11px] text-[color:var(--tts-muted)]">
              현재:{" "}
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
                {arLabel(core.receivableStatus)}
              </Badge>
            </div>
          </Row>
          <Note tone="warn">
            "차단" 상태에서는 Phase 3 AS 접수가 자동 차단됩니다. 미수금 자동 생성·지연 사유
            이력은 Phase 4 재경 모듈 구현 후 이 탭에서 조회 가능합니다.
          </Note>
          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingAr}>
              {savingAr ? "저장 중..." : "미수금 상태 저장"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function arLabel(s: string): string {
  return s === "NORMAL" ? "정상" : s === "WARNING" ? "경고" : "차단";
}

function mapError(code: string | undefined): string {
  switch (code) {
    case "invalid_input":
      return "입력값이 올바르지 않습니다.";
    case "invalid_referrer":
      return "선택한 소개자 거래처가 존재하지 않습니다.";
    case "has_dependent_rows":
      return "연결된 거래 이력이 있어 삭제할 수 없습니다.";
    case "not_found":
      return "거래처를 찾을 수 없습니다.";
    default:
      return "저장에 실패했습니다.";
  }
}

// ─── Contacts Tab ───────────────────────────────────────────────────────

function ContactsTab({
  clientId,
  contacts,
  onChange,
  onError,
}: {
  clientId: string;
  contacts: Contact[];
  onChange: (next: Contact[]) => void;
  onError: (msg: string | null) => void;
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
          onError("담당자 수정에 실패했습니다.");
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
          onError("담당자 추가에 실패했습니다.");
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
    if (!window.confirm("이 담당자를 삭제하시겠습니까?")) return;
    onError(null);
    const res = await fetch(`/api/master/clients/${clientId}/contacts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      onError("담당자 삭제에 실패했습니다.");
      return;
    }
    onChange(contacts.filter((c) => c.id !== id));
    router.refresh();
  }

  const columns: DataTableColumn<Contact>[] = [
    {
      key: "name",
      label: "담당자명",
      render: (v, row) => (
        <span className="flex items-center gap-2 font-semibold">
          {v as string}
          {row.isPrimary && <Badge tone="success">주</Badge>}
        </span>
      ),
    },
    { key: "position", label: "직책" },
    { key: "phone", label: "전화" },
    { key: "email", label: "이메일" },
    {
      key: "id",
      label: "",
      width: "150px",
      align: "right",
      render: (_, row) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => startEdit(row)}>
            수정
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
            삭제
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
            + 담당자 추가
          </Button>
        )}
      </div>
      {(showAdd || editingId) && (
        <form
          onSubmit={handleSaveContact}
          className="mb-4 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3"
        >
          <Row>
            <Field label="담당자명" required>
              <TextInput
                required
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <Field label="직책">
              <TextInput
                value={draft.position}
                onChange={(e) => setDraft((p) => ({ ...p, position: e.target.value }))}
              />
            </Field>
          </Row>
          <Row>
            <Field label="전화">
              <TextInput
                value={draft.phone}
                onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
              />
            </Field>
            <Field label="이메일">
              <TextInput
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
              />
            </Field>
            <Field label="주담당자" width="120px">
              <Checkbox
                checked={draft.isPrimary}
                onChange={(e) => setDraft((p) => ({ ...p, isPrimary: e.target.checked }))}
                label="지정"
              />
            </Field>
          </Row>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "저장 중..." : editingId ? "수정 저장" : "담당자 추가"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={resetDraft}>
              취소
            </Button>
          </div>
        </form>
      )}
      <DataTable
        columns={columns}
        data={contacts}
        rowKey={(c) => c.id}
        emptyMessage="등록된 담당자가 없습니다"
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
}: {
  tags: string[];
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addTag() {
    const t = input.trim();
    if (!t) return;
    if (tags.includes(t)) {
      setInput("");
      return;
    }
    onChange([...tags, t]);
    setInput("");
  }

  function removeTag(t: string) {
    onChange(tags.filter((x) => x !== t));
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {tags.length === 0 ? (
          <span className="text-[12px] text-[color:var(--tts-muted)]">태그 없음</span>
        ) : (
          tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded bg-[color:var(--tts-purple-dim)] px-2 py-0.5 text-[12px] text-[color:var(--tts-purple)]"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
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
          placeholder="예: VIP, 신규, 북부지역"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={addTag}>
          + 추가
        </Button>
      </div>
    </div>
  );
}
