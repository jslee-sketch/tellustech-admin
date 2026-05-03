# Tellustech ERP Administrator Manual Supplement (v2 · 2026-05)

> This document provides an in-depth guide to the core modules (SNMP, Yield, Portal Operations, Inventory) of `B-admin-manual.md`. Read together with the user manual supplement (A-supplement) for `A-employee-manual.md` to understand the full flow.

---

# Supplement 1 — SNMP¹⁰ Auto-Collection (In-Depth)

> ¹⁰ SNMP = Simple Network Management Protocol. A protocol for querying status and counters of network devices via standard OIDs.

## Overall Workflow (Administrator Perspective)

```
[1] Install Windows Agent at the customer site (admin download → token issuance)
       │
       ▼
[2] Agent polls printer SNMP every hour (total page counter, etc.)
       │
       ▼
[3] Sends counter to /api/snmp/ingest (token auth)
       │
       ▼
[4] Saved to DB as SnmpReading (S/N + timestamp + counter value)
       │
       ▼
[5] Cron at 02:00 KST on the 1st of each month: 6-step usage confirmation workflow
        ① Calculate prior-month counter difference
        ② Compare with Item.expectedYield
        ③ Compute yield rate → save to YieldAnalysis
        ④ Assign YieldBadge
        ⑤ Notify ADMIN if fraud is suspected (3-language auto-translation)
        ⑥ Generate PDF → save to /admin/usage-confirmations
       │
       ▼
[6] Send PDF via customer portal (or email) → attach to invoice
```

## Token Management

- Issuance: `/admin/snmp` → `[+ Issue Agent]` → 1 token per customer. Shown only once at issuance (cannot be retrieved again).
- Revocation: `[Revoke]` → immediately stamps `tokenRevokedAt`. Agent receives 401 response.
- Reissuance: After revocation, `[+ Reissue]` → new token. Must be delivered to the customer.

## Agent Auto-Update

- `/api/snmp/agent-version` returns the latest `.exe` URL from GitHub Releases.
- Agent compares at startup / once daily → if a new version is available, downloads and auto-restarts.

## Exception Handling

| Situation | System Behavior | Administrator Action |
|---|---|---|
| Agent unreachable for 24 hours | Notification (`SNMP_AGENT_OFFLINE`) | Ask customer to restart PC |
| Counter regression (≤ previous value) | Ignore reading + log | Suspect printer replacement/firmware |
| 0 records for prior month | SKIP usage confirmation | Request manual report from customer |

---

# Supplement 2 — Consumable Yield Analysis (`/admin/yield-analysis`)

## Core Concept

Compare each toner cartridge's **rated page yield** (`Item.expectedYield`) against the **actual pages printed** (SNMP counter) → calculate the **yield rate** (yieldRate).

```
yieldRate = (actual pages printed) / (rated yield × yieldCoverageBase adjustment) × 100%
```

| Yield Rate | Badge | Meaning |
|---|---|---|
| ≥ 90% | 🔵 BLUE | Excellent (normal use) |
| 70~89% | 🟢 GREEN | Good |
| 50~69% | 🟡 YELLOW | Caution |
| 30~49% | 🟠 ORANGE | Warning |
| < 30% | 🔴 RED | **Fraud suspected** — auto-notify ADMIN |

> **Color Toner Formula** (cyan + magenta + yellow consumed simultaneously): 1 page = 1 sheet each of C+M+Y → use `MIN(sum_C, sum_M, sum_Y)` when calculating yield rate.

## 4-Tab Dashboard

| Tab | Purpose |
|---|---|
| **Overall Status** | Grouped by contract + average yield rate |
| **Fraud Suspected** | Filter only RED badges. Investigation completion can be marked |
| **Per-Technician Stats** | Future expansion — currently per-client |
| **Settings** | Adjust thresholds (BLUE/GREEN/YELLOW/ORANGE). Must remain monotonically decreasing |

## Threshold Changes

`/admin/yield-analysis` → **Settings** tab → slider or direct input. Applied from the next monthly cron after saving.

> Thresholds must be **monotonically decreasing** (BLUE > GREEN > YELLOW > ORANGE > 0). Saving rejected on violation.

## Fraud Suspicion Workflow

1. Cron on the 1st of each month auto-detects RED.
2. ADMINs receive `NotificationType.YIELD_FRAUD_SUSPECT` (3 languages).
3. `/admin/yield-analysis` → **Fraud Suspected** tab → expand row → check counter history.
4. After investigation, click `[Investigation Complete]` → records `fraudReviewedAt` + `fraudReviewNote`.

---

# Supplement 3 — Customer Portal Operations (Phases A·B·C·D)

## 4-Phase Overview

| Phase | Screen | Meaning |
|---|---|---|
| **A** | `/admin/portal-points` | Portal Points — auto-accrual based on sales + manual adjustment |
| **B** | `/admin/portal-banners` | Portal Banners — 3-language text + image schedule |
| **C** | `/admin/portal-posts` | Portal Posts — AI draft generation + publish after review |
| **D** | `/admin/feedback` + `/admin/surveys` + `/admin/referrals` | Customer feedback, surveys, referrals |

## Phase C — AI Auto-Generated Posts

- Cron `/api/jobs/portal-news-generate` runs automatically at **09:00 KST every Monday**.
- Sales data, yield rate stats, new customers, and other metrics are passed to the Claude API.
- Drafts in 3 languages (VI/EN/KO) are generated simultaneously → saved to the `draft` tab.
- After admin review, click `[Publish]` → exposed in the customer portal.

## Phase D Operations

- **Customer Feedback** (`/admin/feedback`): One-line opinions submitted by customers from the portal. After labeling category and priority, can be added to meeting agenda.
- **Surveys** (`/admin/surveys`): Periodic surveys such as quarterly NPS. Response rate + score trend.
- **Referrals** (`/admin/referrals`): New companies referred by existing customers. When the first payment is received, points are awarded to the referrer.

---

# Supplement 4 — Inventory 4-Axis Truth Table (Admin In-Depth)

Refer to section 6.2 of `A-supplement-2026-05.md`, with additional points administrators should know:

## ClientRuleOverride

For specific clients, **certain rows of BASE_RULES can be overridden**.

```sql
-- Example: For client ABC, do not auto-create purchase candidates after external repair recovery.
INSERT INTO "ClientRuleOverride" (clientId, referenceModule, overrideJson)
VALUES ('client_abc', 'REPAIR', '{"autoPurchaseCandidate": false}');
```

UI to be added later. Currently DB direct modification only.

## Truth Table Change Procedure

1. Modify the `BASE_RULES` object in `src/lib/inventory-rules.ts`.
2. When extending the `SubKind` type, add i18n combo labels.
3. Update `transaction-new-form.tsx` `COMBOS_BY_TYPE`.
4. Enhance the `/api/inventory/sn/[sn]/state` recommendation logic.
5. Add E2E test (`scripts/test-inv-e2e.ts`) scenarios.

> When adding rules, **autoPurchaseCandidate / autoSalesCandidate** triggers automatic PR DRAFT creation. Accounting flow validation is required.

---

# Supplement 5 — Accounting Closing (`/admin/closings`)

## Closing Behavior

Locks 4 types of records in bulk per month (`YYYY-MM`):

| Lock Target | Effect |
|---|---|
| `Sales` | Block edit/delete of sales |
| `Purchase` | Block edit/delete of purchases |
| `InventoryTransaction` | Block edit/delete of inbound/outbound |
| `PayableReceivable` | Block edit/delete of receivables/payables |

Each record is auto-stamped with `lockedAt = now()`, `lockReason = "Accounting Close YYYY-MM"`.

## Unlocking

In principle, unlocking after closing is not allowed. However, in emergencies, ADMIN privilege at `/admin/closings` → relevant month → **[Unlock]** → `lockedAt = NULL`. All changes are logged in `audit_log`.

---

# Supplement 6 — Permission Management (`/admin/permissions`)

## Role-Based

| Role | Meaning |
|---|---|
| `ADMIN` | Entire system (cross-company integrated view available) |
| `MANAGER` | All modules within a company |
| `EMPLOYEE` | Own data + some modules within department |
| `CLIENT` | Customer portal only (separate authentication) |

## allowedCompanies

Each user's `allowedCompanies` column:
- `["TV"]` or `["VR"]` → only that company
- `["TV","VR"]` → integrated view available (sidebar ALL button shown)

When switching companies, `WHERE company_code = :session` is automatically injected into all SQL queries.

---

# Supplement 7 — Audit Log (`/admin/audit-logs`)

## Auto-Recorded Targets

INSERT / UPDATE / DELETE on all business tables:
- Which table, which row (`record_id`)
- Value before change (`before` JSON)
- Value after change (`after` JSON)
- Who (`user_id`), when (`createdAt`), which company (`company_code`)

## Search / Filter

- Table name / period / user / company code.
- Auto-display change diff (before vs after with color).

---

# Supplement 8 — Trash (`/admin/trash`)

## 7-Day Restore Policy

All soft-deleted records are kept in the trash for **7 days**. After 7 days, automatically permanently deleted (in the next cron).

| Action | Permission |
|---|---|
| Restore (`Restore`) | ADMIN |
| Immediate permanent delete | ADMIN (ignores 7-day wait) |
| 7-day auto-delete | System cron (daily at 01:00 KST) |

## Considerations When Restoring

- Foreign key dependencies are auto-validated. Restore is denied if the parent record has already been permanently deleted.
- `restored_at` is recorded in `audit_log`.

---

# Supplement 9 — Mock Sales Workflow

Tool for auto-generating sales for testing/demo.

| Step | Action |
|---|---|
| ① Select IT contract | One of the active contracts |
| ② Select month | Month sales occurred |
| ③ Auto-apply unit price | Main unit + consumables unit price |
| ④ Generate Mock Sales | `OUT/TRADE/SALE/COMPANY` transaction + Sales row |

Generated sales are recorded in audit log with the `mock=true` flag. Cleanup before accounting close is recommended.

---

# Supplement 10 — Client Portal Account Management

## Auto-Creation Flow

Enter `email` in the `Client` master → on save, automatically:
1. Generate temporary password (one-time token).
2. Send Welcome email (3 languages).
3. Force password change on first login.

## Access Token / Session

- Portal login → cookie `tts_session` (separate from company ERP).
- Expires in 24 hours. Re-login required upon expiration.
- If password is lost, ADMIN can reissue via `[Reset]` button.

---

# Supplement 11 — Inventory Current State Description (Free Text)

`InventoryItem.stateNoteVi/En/Ko` + `stateNoteOriginalLang` — Per-S/N current state memo.

## Input Timing

- Entered together when changing state (NEEDS_REPAIR, etc.) on the inventory status screen.
- Result memo after AS dispatch.
- Monthly inspection results.

## Auto-Translation

On save, the Claude API instantly translates into the other 2 languages. Auto-displayed in the user's display language.

---

# Appendix (Administrator) — Additional Index

| Abbreviation/Term | Meaning |
|---|---|
| **AGENT_OFFLINE** | SNMP Agent unreachable for 24h notification |
| **CRON** | Periodically scheduled job (cron expression) |
| **fraudReviewedAt** | Timestamp when fraud suspicion investigation completed |
| **HMR** | Hot Module Replacement (development mode) |
| **SnmpReading** | Single SNMP counter record model |
| **softDelete** | Permanently deleted after 7-day trash retention |
| **YieldAnalysis** | Monthly yield analysis result model |
| **YieldConfig** | Threshold configuration model |
| **mock=true** | Mock sales marker |

---

# Change History (Administrator Manual v2 Supplement)

- **2026-05-02**: This supplement published.
- **2026-05-01**: 4-axis truth table 30→34 rows, SUPPLIES itemType, purchase return / disposal / inventory adjustment / disassemble-assemble combos.
- **Late 2026-04**: ClientRuleOverride, auto PR DRAFT, AI portal posts, SNMP 6-step workflow + PDF.
- **Mid 2026-04**: NIIMBOT B21 labels, QR multi-scan, color channel badges.
- **Early 2026-04**: Yield 4 tabs + fraud suspicion notification, client portal auto-account issuance.
