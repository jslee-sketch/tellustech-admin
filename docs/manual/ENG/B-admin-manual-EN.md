---
title: "Tellustech ERP — Administrator Manual"
subtitle: "ADMIN / MANAGER Only"
author: "Tellustech IT Team"
date: "2026-04"
lang: en
---

# Preface

This document is for ADMIN / MANAGER users when using the **operations / policy decision** features of the ERP.

- General user features → separate volume **A — User Manual**
- Customer-facing portal → separate volume **C — Portal Guide**

This volume covers the following 8 areas:

1. Permission management — per-user module access control
2. Accounting closing — monthly lock/unlock
3. Trash — restoring soft-deleted rows
4. Audit log — INSERT/UPDATE/DELETE tracking
5. Compatibility mapping — main item ↔ consumable/part M:N
6. Statistics in depth — KPI / per-S/N profit
7. System operations — backup, deployment, environment variables
8. Appendix — auto codes, company policy, S/N, translation, signatures

---

# Part 1. Administrator Permission Overview

## 1.1 Four roles

| Role | Sidebar | Company picker | Permission matrix |
|---|---|---|---|
| `ADMIN` | All modules + admin group | TV/VR/ALL | Auto `WRITE` on all modules (UserPermission ignored) |
| `MANAGER` | All modules + admin group | TV/VR/ALL | UserPermission applied (only assigned modules) |
| `EMPLOYEE` | Only granted modules | Own company only | UserPermission applied |
| `CLIENT` | Portal only, internal screens blocked | – | Separate |

> `ADMIN` is automatically granted `WRITE` for every module. `MANAGER` can access ADMIN screens, but per-module permissions must be granted separately.

## 1.2 Three permission levels

| Level | Meaning |
|---|---|
| `HIDDEN` | Hidden from sidebar, API GET also blocked |
| `VIEW` | View only — create/edit/delete blocked |
| `WRITE` | Create / edit / delete all allowed |

Level changes apply immediately, but pages already open by the user need a refresh.

## 1.3 Company scope and unified view

- A user with a single `allowedCompanies` (`["TV"]` or `["VR"]`) sees only that company's data.
- ADMIN/MANAGER usually have both `["TV","VR"]`, and the sidebar shows a company picker (`TV` / `VR` / `ALL`).
- `ALL` unified view → all screens combine the two companies. However, **new registrations are recommended only in an explicit company context** (to preserve the company prefix in auto-issued codes).

## 1.4 Permission vs. company separation

For the same module, the following two operate independently:

1. **Permission (UserPermission)** — module-level view/write capability.
2. **Company scope (companyScope)** — visible data range.

Even an ADMIN cannot see VR data in a `companyCode=TV` session. They must switch to `ALL` mode.

---

# Part 2. Permission Management (`/admin/permissions`)

## 2.1 Screen layout

On the left, the **user list** (CLIENT excluded); on the right, a **31-module × 3-level matrix**.

## 2.2 The 31 modules grouped

| Group | Module key |
|---|---|
| **Master** | `CLIENTS` · `ITEMS` · `WAREHOUSES` · `EMPLOYEES` · `DEPARTMENTS` · `PROJECTS` · `LICENSES` · `SCHEDULES` |
| **Sales** | `SALES` · `PURCHASES` |
| **Rental** | `IT_CONTRACTS` · `TM_RENTALS` |
| **AS** | `AS_TICKETS` · `AS_DISPATCHES` · `CALIBRATIONS` |
| **Inventory** | `INVENTORY` |
| **HR** | `HR_LEAVE` · `HR_ONBOARDING` · `HR_OFFBOARDING` · `HR_INCIDENT` · `HR_EVALUATION` · `HR_PAYROLL` · `HR_INCENTIVE` |
| **Finance** | `FINANCE_PAYABLE` · `FINANCE_RECEIVABLE` · `FINANCE_EXPENSE` |
| **Analytics & Communication** | `STATS` · `CHAT` · `CALENDAR` |
| **Administration** | `AUDIT` · `ADMIN` |

## 2.3 Data impact per input

| Input / action | **What this value does in the system** |
|---|---|
| **User selection** (left) | Calls API `GET /api/admin/permissions/{userId}` → fills the right-side table with current levels. CLIENT roles are excluded from the list |
| **Module radio** (HIDDEN/VIEW/WRITE) | Reflected in client state only — no DB change before save |
| **Save button** | API `PUT /api/admin/permissions/{userId}` body=full matrix → upserts all 31 modules |
| **Immediate effect** | When the user navigates next, the sidebar is auto-hidden. Pages already open need a refresh |

## 2.4 What happens on save

1. **Bulk upsert into `UserPermission` table** — all 31 rows (level=HIDDEN rows saved explicitly too).
2. **Permission cache for that user invalidated** — the new matrix applies on the next `/api/auth/me` call.
3. **Audit log written** — `tableName=user_permissions`, action=`UPDATE`, before/after matrix JSON.
4. **Sidebar hide applied immediately** — on the next page load, menus are auto-hidden via the `KEY_TO_MODULE` mapping.

## 2.5 Grant / revoke procedure

1. Select a user on the left → current permissions appear instantly on the right.
2. Change the per-module radio (`HIDDEN` / `VIEW` / `WRITE`).
3. Click the **Save** button at the bottom → API call.
4. Tell the affected user to refresh.

## 2.4 Security recommendations

- HR / Finance modules should be `HIDDEN` for everyone except the responsible parties — protect sensitive info such as payroll and receivables.
- Minimize the `ADMIN` role — when possible, use `MANAGER` + `WRITE` only on needed modules.
- New hires start as `EMPLOYEE` + `WRITE` only on their own work modules; everything else `HIDDEN`.
- For terminations, immediately deactivate the user (`status=TERMINATED`) — clearing the permission matrix is a secondary measure.

---

# Part 3. Accounting Closing (`/admin/closings`)

## 3.1 Effects of closing

For each month (`YYYY-MM`), `lockedAt` + `lockReason="Accounting closing YYYY-MM"` is applied to the following 4 row types:

| Model | Operations blocked once locked |
|---|---|
| **Sales** | PATCH (edit) · Adjustment registration |
| **Purchase** | PATCH · Adjustment |
| **Expense** | PATCH · Allocation line changes |
| **PayableReceivable** | PATCH · Adding payment / contact history |

Change attempts on locked rows are rejected by the API with `409 locked`. The user sees the message "This month is closed" on screen.

## 3.2 Data impact per input

| Input / action | **What this value does in the system** |
|---|---|
| **Target month** (`YYYY-MM`) | The `yearMonth` in the API body — covers all rows of the 4 models between 00:00 of the month start and 00:00 of the next month start |
| **Lock button** | `POST /api/admin/closings` → bulk-applies `lockedAt = now`, `lockReason = "Accounting closing YYYY-MM"` |
| **Unlock button** (ADMIN only) | `DELETE /api/admin/closings?yearMonth=` → bulk-clears `lockedAt = null`, `lockReason = null` on the 4-model rows for that month |

## 3.3 Closing procedure

1. Enter the **target month (YYYY-MM)** at the top of the screen (default: current month).
2. Click **Close (lock)** → confirm dialog → proceed.
3. Result: `Lock complete: Sales N / Purchases N / Expenses N / PR N` — the count of locked rows.

## 3.4 Unlock (ADMIN only)

Use only when a mistake is found after closing. The unlock button is hidden for `MANAGER`.

1. On the same screen, enter the target month.
2. Click **Unlock** → confirm → proceed.
3. Result: `Unlock complete: Sales N / Purchases N / Expenses N / PR N`.

## 3.5 What happens automatically on lock/unlock

1. **Bulk UPDATE on the 4 models** — Sales · Purchase · Expense · PayableReceivable.
2. **All PATCH/Adjustment/Amendment on locked rows** are rejected at the API layer with `409 locked`.
3. **New registrations are NOT blocked** — registering new sales for a locked month is itself possible (the lock state of the month is not checked at save time). **Operational recommendation**: after closing, register new entries only with dates in the next month.
4. **Audit log written** — UPDATE actions for all 4 models (the bulk closing change is traceable).

## 3.4 Operational recommendations

- The monthly closing schedule is recommended for the 5th of each month (for the previous month). Register it as a recurring entry in the schedule module.
- Before closing, perform pre-checks: receivables collection, payment registration, FX settlement, etc.
- Restrict unlock to exceptional situations and record the unlock reason in a separate meeting note (`/weekly-report`).

---

# Part 4. Trash (`/admin/trash`)

Restores soft-deleted (`deletedAt != null`) rows. There is no permanent delete (audit log preservation).

## 4.1 The 6 target models

| Model | Display label |
|---|---|
| `Client` | Client |
| `Item` | Item |
| `Warehouse` | Warehouse |
| `Employee` | Employee |
| `Sales` | Sales |
| `Purchase` | Purchase |

Up to 100 most recent rows per category are shown.

## 4.2 Restore action — data impact per input

| Input / action | **What this value does in the system** |
|---|---|
| **Restore button** | Calls `POST /api/admin/restore/{model}/{id}` — `model` is allowlisted to the 6 (Client/Item/Warehouse/Employee/Sales/Purchase) |
| **API behavior** | Single UPDATE setting that row's `deletedAt = null` |
| **Related rows** | Not auto-restored — restoring sales does not auto-restore sales lines (currently unimplemented; manually handled by the IT team) |

## 4.3 Restore procedure

1. In each category card (Client / Item / ...), find the row.
2. Click **Restore** on the right → confirm dialog → API call.
3. The page auto-refreshes on success. The row reappears in the regular module.

## 4.4 What happens automatically on restore

1. **`deletedAt = null` UPDATE** — single row.
2. **Audit log written** — UPDATE action, before=`{deletedAt: time}`, after=`{deletedAt: null}`.
3. **Module visibility** — appears in the regular list from the next page load.
4. **Reflected immediately in autosearch comboboxes** — Client/Item comboboxes show it again in search results.

## 4.3 Operational policy

- No restore expiry (no permanent delete supported). Wrong rows accumulate in trash if untouched.
- When restoring sales/purchase, related lines / inventory transactions may not be auto-restored together — consult the IT team.
- When restoring an employee, separately review permission and login info. For rehire cases, prefer fresh registration.

---

# Part 5. Audit Log (`/admin/audit-logs`)

## 5.1 Recording scope

INSERT / UPDATE / DELETE on all 21 business-data models is automatically recorded. Prisma middleware handles this in bulk, so no per-module code is required.

## 5.2 Table columns

| Column | Meaning |
|---|---|
| **Time** | Occurrence time (UTC) |
| **Company** | The data's `companyCode` |
| **User** | Username of the changer |
| **Action** | `INSERT` (green) · `UPDATE` (yellow) · `DELETE` (red) |
| **Table** | DB table name (e.g., `sales`, `inventory_items`) |
| **Record ID** | ID of the changed row |
| **Change** | before / after JSON diff |

## 5.3 Search / filter — input impact

| Input | **What this value does in the system** |
|---|---|
| **Company (companyCode)** | URL `?company=` → `WHERE companyCode = X` |
| **User (userId)** | `?user=` → `WHERE userId = X` |
| **Table (tableName)** | `?table=` → `WHERE tableName = X` (e.g., `sales`) |
| **Action** | `?action=` → one of INSERT/UPDATE/DELETE |
| **Date from/to** | `?from=&to=` → `WHERE occurredAt BETWEEN ...` |

All filters are AND. Empty values are ignored. Pagination is at the top right of the table — 50 rows per page. Excel download requires a separate permission (large-volume concern).

## 5.4 Use cases

- **Data integrity check** — track unexpected price/amount changes.
- **Anomaly detection** — pattern of one user issuing many DELETEs in a short period.
- **Customer request handling** — instant answer to "Who changed this and when?"
- **Legal evidence** — tracking all adjustments after accounting closing.

---

# Part 6. Compatibility Mapping (`/admin/item-compatibility`)

Registers M:N compatibility relations between main items (`PRODUCT`) and consumables/parts (`CONSUMABLE` / `PART`). This mapping is used as an automatic filter on the **customer portal supplies request screen**.

## 6.1 Registration model

| Field | Notes |
|---|---|
| `productItemId` | Main item (PRODUCT) |
| `consumableItemId` | Consumable or part (CONSUMABLE / PART) |

The combination `(productItemId, consumableItemId)` has a unique constraint, so duplicate registration is auto-prevented.

## 6.2 Data impact per input

| Input / action | **What this value does in the system** |
|---|---|
| **Main item selection** (search bar) | Shows the current compatibility mappings for that `productItemId` on the right |
| **+ Add** button → combobox | Inserts the chosen itemId as `consumableItemId` — silently ignored on `(productItemId, consumableItemId)` unique violation |
| **× Delete** button | DELETEs that one row. Main items whose mapping has been removed disappear from the customer portal "Supplies request" options on the next page load |

## 6.3 What happens automatically on add/delete

1. **`ItemCompatibility` INSERT/DELETE** — single row.
2. **Audit log written** — `INSERT` or `DELETE` action.
3. **Customer portal applies immediately** — `/api/portal/my-supplies` queries live every time, cache-independent.
4. **Internal dispatch parts auto-recommendation** — when an SN of that main item is selected on AS dispatch, compatible consumables/parts appear at the top of the ItemCombobox dropdown.

## 6.4 Registration procedure

1. Find a main item via the search bar at the top.
2. The list of consumables/parts compatible with it appears on the right.
3. Click **+ Add** → pick consumable/part in the combobox → save.
4. To remove a mistakenly added mapping, use **× Delete** for instant removal (recorded in audit log).

## 6.3 Excel bulk upload

For bulk mappings, use Excel.

| Column | Format |
|---|---|
| `productItemCode` | e.g., `ITM-260101-001` |
| `consumableItemCode` | e.g., `ITM-260101-005` |

Empty / header rows are auto-ignored. Duplicate rows are inserted only once; the rest are skipped.

## 6.4 Operational recommendations

- When registering a new IT contract, register the compatibility mapping at the same time — otherwise the customer portal will block supplies requests.
- For discontinued items, first remove the mapping, then move the item master to trash.
- Compatibility mapping changes are recorded as-is in the audit log, so accountability is traceable.

---

# Part 7. Statistics in Depth (`/stats`)

The 4-tab screen (Volume A, Part 10) exposes "view permission" only to general staff; administrators use it as an **analysis / aggregation / drilldown** tool.

## 7.1 KPI cards

At the very top of the dashboard:

| KPI | Formula |
|---|---|
| **Monthly sales** | Sum of sales for the current month (company scope) |
| **Rental revenue** | IT/TM billed amount + monthly fixed |
| **AS handling time (SLA)** | Average time from intake → COMPLETED |
| **Inventory turnover** | Outflow ÷ average inventory |

## 7.2 Per-SN cumulative profit / TCO analysis

Drilldown of `/stats?tab=rental` — per-SN cumulative sales / cumulative cost / cumulative parts cost → **per-SN net profit**.

| Column | Formula |
|---|---|
| **Cumulative sales** | Sum of all billings / settlements for that SN |
| **Cumulative parts** | Sum of parts and consumables cost used on that SN |
| **Cumulative shipping** | Sum of dispatch shipping costs related to that SN |
| **Cumulative net profit** | Sales − (Parts + Shipping + Depreciation) |

Use this analysis to identify **low-profit equipment** and inform decisions about recovery, replacement, or disposal.

## 7.3 Department / staff performance

`/stats?tab=hr` — sales by salesperson, AS handling volume by AS staff, headcount and evaluation score distribution by department.

## 7.4 Excel export

Use the **Excel** button at the top right of each chart to download the raw data as .xlsx. Numbers are split by currency and include FX-converted values (VND equivalent).

---

# Part 8. System Operations

## 8.1 Infrastructure overview

- **Hosting**: Railway (separate internal instance + customer portal instance)
- **DB**: PostgreSQL (Railway managed)
- **Deployment**: push to GitHub `main` branch → auto build & deploy
- **Build command**: `prisma db push --accept-data-loss && next build`

## 8.2 Two-instance architecture

| Domain | Environment variable | Allowed roles |
|---|---|---|
| `tellustech-admin-production.up.railway.app` | (no PORTAL_MODE) | ADMIN/MANAGER/EMPLOYEE |
| `portal.tellustech.co.kr` | `PORTAL_MODE=true` | CLIENT only |

The same codebase / same DB are shared, but routing branches on the `PORTAL_MODE` environment variable. See `docs/PORTAL_DEPLOY.md` for details.

## 8.3 Environment variables — value-by-value behavior

| Key | Value / Purpose | **What this value does in the system** |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Used by Prisma for every DB query. Must be identical across the two instances to share data |
| `JWT_SECRET` | Session token signing key | JWT issuance/verification. If different between instances, a session signed by one is unrecognized by the other |
| `ANTHROPIC_API_KEY` | Claude API key | Used for all calls of the 3-language auto-translation. If unset, only the 1 source language is saved (errors swallowed) |
| `NODE_ENV` | `production` | Next.js builds in prod mode — minimized error messages, static cache enabled |
| `PORTAL_MODE` | `true` only on portal instance | The proxy blocks all non-portal routes (`/admin/*`, `/master/*`, etc.). Auto-rejects non-CLIENT sessions |

> **Forbidden**: Do not commit `.env` to git (already in `.gitignore`). When rotating secrets, update both instances at the same time.

## 8.4 Backup / restore

- **Auto backup**: Railway daily auto backup (retention 7 days — varies by plan).
- **Point-in-time restore**: Railway Dashboard → Database → Backups → pick point → Restore.
- **Manual backup**: Export periodically with `pg_dump` (recommended monthly). Store the result in a safe internal location.

## 8.5 Deployment / rollback

| Action | Method |
|---|---|
| **Deploy** | Push to `main` or PR merge → auto build |
| **Rollback** | Railway Dashboard → Deployments → choose previous build → Redeploy |
| **Stop one instance** | Stop only one instance (e.g., portal maintenance) → no impact on the other |

## 8.6 Monitoring

- View live logs in the **Logs** tab of the Railway Dashboard.
- Notifications: configure deploy failure / crash alerts via email or Slack at Railway → Settings → Notifications.
- Recommended monitoring metrics: response time p95, error rate, DB connection pool utilization.

---

# Part 9. Appendix

## 9.1 Auto-code table (full)

| Target | Format | Notes |
|---|---|---|
| Client | `CL-YYMMDD-###` | Per-day serial |
| Item   | `ITM-YYMMDD-###` | Per-day serial |
| **Employee** | **`TNV-###` (TV) / `VNV-###` (VR)** | **Per-company serial, no YYMMDD** |
| IT contract | `TLS-YYMMDD-###` / `VRT-YYMMDD-###` | Per-company prefix |
| TM rental | `TM-YYMMDD-###` | |
| AS ticket | `YY/MM/DD-##` | Slash-delimited |
| Sales   | `SLS-YYMMDD-###` | |
| Purchase | `PUR-YYMMDD-###` | |
| Evaluation | `INC-YYMMDD-###` (incident) / `EVAL-YYMMDD-###` (regular) | |
| Onboarding/Offboarding | `ONB-YYMMDD-###` / `OFF-YYMMDD-###` | |
| Leave   | `LV-YYMMDD-###` | |
| Expense | `EXP-YYMMDD-###` | |
| Schedule | `SCH-YYMMDD-###` | |
| License | `LIC-YYMMDD-###` | |

Auto-code sequences are stored in the `code_sequences` table per company and per date.

## 9.2 Company code policy

- Only `TV` (Tellustech Vina) / `VR` (Vietrental) — two values.
- All business tables require `company_code`, enforced by index.
- Shared masters (`clients`, `items`, `warehouses`) have no company code — same data for both TV and VR.
- ADMIN/MANAGER unified view auto-injects an IN clause into every query using the virtual value `companyCode='ALL'`.

## 9.3 S/N as the unified key

- S/N is the join key across modules. Designs must allow joining via S/N.
- **Stock-check policy**:
  - **STRICT** — at IT rental registration. Allowed only if the SN exists in our own inventory.
  - **LOOSE** — TM rental / calibration / AS / sales / purchase. External / customer-supplied items allowed (warning only).
- SN master: `InventoryItem` (per-S/N stock + status + QR + history).
- SN search API: `GET /api/inventory/sn/search?q=` (auto company scope, options `itemId`, `inStock`).

## 9.4 3-language auto-translation

- Free-form fields use 3 columns `*_vi/_en/_ko` + `original_lang`.
- On save, the Claude API (`ANTHROPIC_API_KEY`) auto-translates the other 2 languages.
- Targets: AS symptoms / details, incident evaluation, memos, chat, meeting minutes, PR contact history, leave reason, department / client / employee names, etc.
- **Translation editing is admin-only** — general users can edit only the original.
- On translation failure (API outage, etc.), only the original 1 language is saved; users see "Show original" on screen.

## 9.5 Signature

- Mobile finger signature (HTML5 canvas) supported.
- Components: `SignatureCanvas` (inline) / `SignatureModal` (popup).
- Storage format: PNG data URL (`data:image/png;base64,...`).
- Used at: customer portal usage confirm, AS dispatch completion.
- After signing, that row is effectively locked — a new signature must be obtained to edit.

## 9.6 Quick troubleshooting guide

| Symptom | First check |
|---|---|
| "No permission" screen | UserPermission matrix — is that module `HIDDEN`? |
| "Out-of-company data" message | Is the sidebar company picker `ALL` or that company? |
| "This month is closed" | Unlock at accounting closing (`/admin/closings`) and retry — carefully |
| Repeated API 500 errors | Check Railway Logs, check ANTHROPIC_API_KEY balance |
| Sidebar menu disappeared | After permission matrix change, refresh required |
| Auto-translation saved only one language | Check ANTHROPIC_API_KEY, possibly Claude API timeout |

---

# Part 10. Portal Extension Management (NEW — Phase A/B/C/D)

5 new modules that extend the customer portal from a simple AS tool into a **customer lock-in + marketing channel**. All added to the sidebar "Administration" group.

## 10.1 Sidebar additions

| Path | Screen | Function |
|---|---|---|
| `/admin/portal-points` | 🏆 Portal point management | 4 tabs: Unit price / Manual grant / Exchange approval / History |
| `/admin/portal-banners` | 📣 Portal banner management | One-line ads + link URL per OA/TM slot |
| `/admin/quotes` | 💬 Quote request management | Quote assignment + send + contract conversion |
| `/admin/feedback` | 🌟 Customer feedback management | Praise / improve / suggest replies (3-language auto-translation) |
| `/admin/portal-posts` | 📰 Portal post management | 7-category CMS + AI draft generation + publish toggle |
| `/admin/surveys` | 📊 Survey management | Create RATING/CHOICE/TEXT questions + aggregate results |
| `/admin/referrals` | 🤝 Referral management | 5-stage status + auto-trigger 100,000d on first payment |

## 10.2 Portal point management (`/admin/portal-points`)

### Tab 0: Per-client policy + portal account (NEW — most important)

This tab is the **integrated console for portal operations** — issuing portal IDs / managing passwords + setting point usage policy in one place.

#### Table columns

| Column | Meaning | Action |
|---|---|---|
| Code | clientCode | — |
| Client name | KO display priority | — |
| **Portal ID** | Issued username; struck through if inactive; ⚠ if not issued | (action column below) |
| Point balance | SUM(PortalPoint.amount) — per client | — |
| Usage policy | NONE / INVOICE_DEDUCT_ONLY / GIFT_CARD_ONLY / BOTH | select reflects immediately |
| **Account actions** | [+ Issue ID] / [🔑 Reset password] / [Activate / Deactivate toggle] | (procedure below) |

#### Issue portal ID (run right after registering a new client)

1. Click **[+ Issue ID]** for the row marked "⚠ not issued"
2. Prompt 1: enter **Portal ID** (leave blank for auto-generation — `clientcode_portal`, e.g., `cl-260101-001_portal`)
3. Prompt 2: enter **initial password** (leave blank for an auto-generated 10-char random)
4. On success, an alert shows the **ID + temporary password**
5. **⚠ The password is not shown again** — copy and pass it to the customer's IT contact immediately

#### Password reset (for loss / periodic change)

1. Click **[🔑 Reset password]** for the issued client
2. Confirmation dialog warns "existing password invalidated immediately" → confirm
3. Prompt: enter new password (leave blank for auto-generation)
4. After reset, an alert shows the new password → deliver immediately to the customer

#### Activation toggle

- **Deactivate**: Temporary suspension (contract dispute / unpaid, etc.). Login attempts are immediately rejected. Accumulated points are preserved.
- **Activate**: Re-enable.
- Permanent delete is ADMIN only + DELETE API (deactivation recommended on point history conflicts).

#### Decide point-usage policy

**Set the per-client point usage method at contract time.** Configure carefully to handle compliance at large clients (no personal gift card receipt, etc.).

| Policy | Meaning | Use case |
|---|---|---|
| **NONE** | Earn only, no exchange (default) | New client — before policy decision |
| **INVOICE_DEDUCT_ONLY** | Deduct from invoice only | Large enterprises (Samsung/LG/Hyundai etc.) — block personal receipt |
| **GIFT_CARD_ONLY** | Gift card only | SMB / SOHO — when invoice is too small to deduct |
| **BOTH** | Either choice | Regular clients |

select changes are persisted to DB immediately. Applied from the next customer login.

#### Validation

- If the customer requests an exchange against the policy → API rejects `400 policy_violation`
- For policy = NONE clients → exchange button disabled with "Admin not configured" notice
- Balance is independent of policy — earning always works

### Tab 1: Unit price (ADMIN only can edit)

Earn rate per 15 reasons (`PointReason` enum):

| Reason | Default | When disabled |
|---|---|---|
| `AS_REQUEST` | 1,000 | No earnings on AS registration |
| `SUPPLIES_REQUEST` | 1,000 | |
| `SERVICE_CONFIRM` | 1,000 | |
| `USAGE_CONFIRM` | 1,000 | |
| `QUOTE_REQUEST` | 1,000 | |
| `FEEDBACK_PRAISE/IMPROVE/SUGGEST` | 1,000 each | |
| `SURVEY_COMPLETE` | 10,000 | (overridable per survey) |
| `POST_WRITE` | 1,000 | Community post writing |
| `POST_READ_BONUS` | 0 (per post) | |
| `REFERRAL_CONTRACT` | 100,000 | At first payment |
| `ADMIN_GRANT/DEDUCT` | 0 (manual) | — |
| `REWARD_EXCHANGE` | — (auto deduct) | — |

### Tab 2: Manual grant / deduct

Pick client + amount (positive=grant, negative=deduct) + reason → balance reflected immediately. Use for marketing events, compensation, refunds.

### Tab 3: Exchange approval

List of `PortalReward(PENDING)` requested by customers.
- **[Approve]** → `APPROVED` (proceed with actual processing)
- **[Reject]** → `REJECTED` + auto-restore deducted points
- **[Delivered]** → `DELIVERED`
  - For INVOICE_DEDUCT: enter the PayableReceivable ID to apply
  - For GIFT_CARD: enter delivery details (gift card number, message, etc.)

### Tab 4: All history

Search / filter all earnings / deductions (client / reason / period) + Excel download (Phase later).

## 10.3 Portal banner (`/admin/portal-banners`)

One-line ad text + link URL per OA/TM slot.

```
Slot: OA
KO: 프린터 걱정 없는 올인원 렌탈
VI: Cho thuê máy in trọn gói
EN: All-in-one printer rental
URL: https://tellustech.co.kr/oa
[Save]
```

Reflected on every customer portal immediately on save. The text in the user's language is shown under the business-line header in the sidebar.

## 10.4 Quote management (`/admin/quotes`)

### Quote workflow

1. Customer requests at `/portal/quotes` → `status = REQUESTED`, issued `QR-YYMMDD-###`
2. Salesperson auto-assigned (Phase later) or manually assigned by admin
3. Admin clicks [Create quote] → enter amount + memo (PDF attachment is Phase later)
4. → Transition to `status = QUOTED`; [Accept]/[Reject] enabled on customer screen
5. Customer accepts → `ACCEPTED` → convert to IT contract / TM rental / Sales form (Phase later)

### Quote rejection / expiration policy

- Reject (`REJECTED`): customer declined the quote
- Expire (`EXPIRED`): auto-expiration date reached (auto-expiration not yet implemented — admin changes manually)

## 10.5 Feedback management (`/admin/feedback`)

Per-type (`PRAISE / IMPROVE / SUGGEST`) feedback list + reply composition.

### Reply composition

- Enter Korean only and the Claude API auto-translates VI/EN
- On save, `status = REPLIED`; reply box appears on the customer screen
- Replies can be overwritten after the initial reply

### Praise → HR evaluation linkage (Phase later)

Clicking a praise comment shows a [Link to HR evaluation] button to auto-create `Incident(COMMENDATION)` — usable as bonus material for employee evaluation (currently manual).

## 10.6 Post management (`/admin/portal-posts`)

### Card list

- Status tabs: All / 📝 Draft / ✅ Published (counts auto-aggregated)
- Sort: latest first (createdAt desc)
- Click card → **edit modal** (3-language title, KO/VI/EN body tabs, category, publish, pin, bonus points)

### AI draft generation

Top "🤖 Generate AI draft" card:
- Category select (7 options)
- Topic text input (e.g., "May 2026 Vietnam holidays guide")
- [🤖 Generate AI draft] button

Internal flow:
1. Calls Claude haiku-4.5 (system + assistant prefill to enforce JSON)
2. Strict per-category guidance (`mustBe / mustNot / tone`) — blocks irrelevant content like TIPs in the marketing tab
3. `web_search_20250305` tool enabled — auto-search for external facts as needed
4. Parse response → Korean title, body, sources array
5. fillTranslations for VI/EN auto-translation
6. Auto-attached footer at end of body:
   ```
   ---
   Sources:
   - https://...
   - https://...

   Note: AI-generated draft — fact-check before publishing
   ```
7. Saved with `isPublished=false`, `isAiGenerated=true`
8. Auto-switch to "Draft" tab + auto-open the just-created post for review and publish

### 🧹 AI cleanup tool

Earlier posts (before the prefill fix) may carry reasoning text + a ```json``` block embedded in the body.
- Card auto-shows red ring + ⚠ "Cleanup needed" badge
- Click [🧹 AI cleanup] → extract JSON from body → cleanly replace title/body → attach footer → re-translate VI/EN
- For cases without JSON, auto-strip the reasoning preamble and use as-is
- If everything fails, "[Delete] then regenerate" guidance is shown

### Strict category policy

| Category | mustBe (required) | mustNot (forbidden) |
|---|---|---|
| MARKETING | Promotion / event / new product / one-line CTA included | Usage tips, company daily life, news summaries |
| COMPANY_NEWS | Personnel / org / new offices / awards | External news, marketing, usage tips |
| KOREA_NEWS | Korea / Korean community business / economy news | Tellustech marketing, usage tips |
| VIETNAM_NEWS | Vietnam policy / holidays / industry | Korean news, Tellustech marketing |
| INDUSTRY_NEWS | OA / instrumentation market / new products / tech | Tellustech marketing, usage tips |
| TIP | Usage / care / troubleshooting guides | Marketing, external news, company announcements |
| COMMUNITY | Customer-to-customer info sharing | Official announcements, marketing, technical tips |

## 10.7 Survey management (`/admin/surveys`)

### Create a survey

| Field | Meaning |
|---|---|
| Title (KO/VI/EN) | Auto-translated |
| Start / end date | Visible to customers only during this period |
| Reward points | Granted on completion (default 10,000d) |
| N questions | RATING (1–5) / CHOICE (single select) / TEXT (free text) |

### Result aggregation (Phase later)

- RATING: average score + distribution chart
- CHOICE: pie chart per option
- TEXT: free-text summary analysis via Claude API

## 10.8 Referral management (`/admin/referrals`)

### 5-stage status flow

| Stage | Action | Auto trigger |
|---|---|---|
| SUBMITTED | Customer submits | Salesperson auto-assigned (Phase later) |
| CONTACTED | First contact done | Admin sets |
| MEETING | Sales meeting in progress | Admin sets |
| CONTRACTED | Contract signed (before payment) | Admin sets |
| **PAID** | **First payment occurred** | [First payment] button → **+100,000d auto-credit + record `firstPaymentAt` + save `contractPointId`** |
| DECLINED | Declined / cancelled | Admin sets |

> **Self-referral block**: When registering a referral, if `companyName` matches the user's own client `companyNameVi`, the response is `400 self_referral`.

### First-payment trigger (duplicate prevention)

When transitioning to `PAID`:
- `Referral.firstPaymentAt = now`
- `Referral.contractPointId = id of PortalPoint created by grantPoints`
- Re-transitioning the same referral to PAID is rejected with `already_paid`

## 10.9 Operational recommendations

### Prevent point inflation

- Be careful changing unit prices — points already earned remain
- Expiration policy: out of Phase A scope (decide separately — after reviewing Vietnam consumer protection law)
- Monitor earn vs. usage ratio: review the 4-tab "History" totals monthly

### Validating AI posts

- AI drafts always start as `isPublished=false` — toggle to publish after review
- For external facts (Vietnamese holidays, Korean economy, etc.) click web_search source URLs to verify
- MARKETING posts do not call web_search → an empty sources array is normal

### Referral fraud prevention

- Referrals duplicated by company name / phone require manual review
- The first-payment trigger fires once per referral — no extra rewards for re-payments / additional contracts

---

# Part 11. Mobile Operations (NEW)

## 11.1 PWA manifest change cautions

When changing `public/manifest.webmanifest`, to ensure users see the change immediately:
1. Bump the service-worker cache name (`tts-portal-v2` → `v3`)
2. Remove manifest from the `ASSETS` array
3. In the fetch handler, always use network-first for the manifest

After deploy, the `controllerchange` event auto-refreshes → users do not need to clear cache manually.

## 11.2 Users who installed the PWA (Add to Home Screen)

On iOS Safari, the manifest is cached at install time at the OS level. If you change values like orientation:
- Guide users: "Delete the home-screen icon → revisit in Safari → add to home screen again"
- Android Chrome auto-refreshes via SW for instant effect

## 11.3 Releasing screen-orientation lock

Call `screen.orientation.unlock()` — releases residual locks on Chrome/Edge. iOS Safari does not support it, but if the manifest is correct the OS allows rotation by itself.

---

# Part 12. SNMP counter auto-collection + usage confirmation

A small program (= the agent) installed on customer-site PCs automatically reads print counters from MFPs / printers and sends them to the ERP. Every month those values flow into the **usage confirmation** (a customer-signed PDF) → sales voucher in a single workflow. This part is a **field-ready procedure manual** anyone can follow.

## 12.0 One-page summary — what to do for a brand-new client

```
[Admin]                     [Admin / Sales]                [Customer PC]
1) Register model OIDs ─┐
                        └──→ 2) Register contract / equipment / pricing ──→ 3) Issue tokens
                                                          ↓
                                              4) Download agent package (ZIP)
                                                          ↓
                                                    5) Deliver via USB → install.bat
                                                          ↓
                                              6) Verify first collection (Collection Status)
                                                          ↓
[Admin]
7) Monthly: auto-generate usage confirmation → notify customer → sign → PDF → sales voucher
```

## 12.1 SNMP management screen (`/admin/snmp`)

To open: Sidebar → **Rental** group → **SNMP management**.

It is composed of three tabs.

### Tab 1 — Model OID management

Define **which OID to use** to read counters per MFP / printer model. One entry covers many devices of the same model.

Six already-seeded models (use as-is):

| deviceModel | Notes |
|---|---|
| `SAMSUNG_SCX8123` · `SAMSUNG_X7500` | Samsung color MFP standard OIDs |
| `SINDOH_D330` · `SINDOH_D410` · `SINDOH_D320` | Sindoh mono / color |
| `GENERIC_PRINTER` | RFC 3805 standard OIDs only (fallback for unknown brands) |

#### Add a new model — step by step

1. Click **[+ Add model]**.
2. Fill the table as below:

| Field | Example | How to find it |
|---|---|---|
| `deviceModel` | `BROTHER_HL5470` | Uppercase + underscore. Groups many devices of the same model |
| `brand` | `BROTHER` | For display |
| `modelName` | `HL-5470DW` | For display |
| `oidTotal` | `1.3.6.1.2.1.43.10.2.1.4.1.1` | **RFC 3805 standard** — 90% of printers respond at this OID for total count. Use this value at first. |
| `oidBw` | (optional) | Mono-only counter. Private OID — manufacturer manual / web search (e.g., "Samsung X7500 SNMP OID BW counter") |
| `oidColor` | (optional) | Color counter. Color models only |
| `oidSerial` | `1.3.6.1.2.1.43.5.1.1.17.1` | Standard S/N OID. Used for auto detection |
| `isMonoOnly` | ☑ / ☐ | Check for mono-only → color OIDs ignored |

3. **[Save]**. Effective immediately — appears in the dropdown when registering new equipment.

#### Verifying a new model OID (optional, IT team)

> Verify just one device of that model.

1. Connect one of that model to LAN with a chosen IP.
2. From any PC in PowerShell:
   ```
   snmpwalk -v2c -c public <printerIP> 1.3.6.1.2.1.43.10.2.1.4.1.1
   ```
   A numeric response means OK. No response → SNMP is off or community differs — enable SNMP v2c with community=`public` in the printer's web UI.
3. Use the same OID in the `oidTotal` field above.

### Tab 2 — Collection Status

Most recent 500 `SnmpReading` rows in reverse chronological order.

| Column | Meaning |
|---|---|
| Collected at | Time the agent's data reached ERP (UTC → KST display) |
| Contract / S/N / Model | Which device the data belongs to |
| Total / Mono / Color | Cumulative counter (raw, not delta) |
| Mode | `AGENT` (auto) / `MANUAL` (admin manual entry) |
| Badge | Normal / **⚠ Reset** (negative delta detected) |

#### What to do when "⚠ Reset" badge shows

1. Open the IT contract detail of that device → Equipment tab → **[Edit]**.
2. Enter the reset date in **`resetAt`** (e.g., mainboard replacement date, or the collected date as is).
3. Save → from the next usage calculation onward only counters after that point are used (earlier values ignored).
4. If it is a counter glitch and not a mainboard swap, add a corrected counter via **Manual SnmpReading entry**.

### Tab 3 — Equipment tokens

Table grouped by ACTIVE IT contract — one row per equipment.

| Column | Meaning / Action |
|---|---|
| Equipment (S/N · model) | ItContractEquipment info |
| Token status | `None` / `Valid (D-N until expiry)` / `Expired` / `Revoked` |
| Last collection | `lastReadingAt` (or "—") |
| Action | **[🔑 Issue]** / **[Revoke]** / **[📦 Download agent package]** |

#### Token policy

- **Equipment token** (`tok_*`) — one per device. Used by the agent when sending SNMP counters.
- **Contract token** (`ctr_*`) — one per contract. Used by the agent to register newly discovered devices.
- **TTL 60 days** — sliding renewal on every contact (auto-extension). Auto-expires after 60 days of inactivity.
- **Revoke** — immediately invalid (DB `revokedAt` set). The agent's next request returns `401`. Use for **loss / termination / contract end**.

#### [🔑 Issue] button

- Unissued or expired → issues a new UUID immediately. Shown once on screen and never again (DB only).
- If a valid token already exists, the button becomes [Reissue]; the existing token is revoked + a new token is issued.

### [📦 Download agent package]

This button is the **starting point of field installation**. Clicking it triggers:

1. ERP generates a `config-{contractCode}.json` file — contains contract token + N equipment tokens + ERP URL.
2. Browser download.
3. The admin bundles the received file + (separately stored) `tellustech-agent.exe` + `install.bat` + `uninstall.bat` + `README.txt` into a **single ZIP** copied to a USB stick.

> Security: tokens in `config-*.json` are plaintext — if the USB is lost, immediately Sidebar → SNMP → that contract → [Revoke] then [Reissue].

---

## 12.2 Onboarding a new client — step-by-step walk-through

### Step 1. Register contract & equipment (Sales / Admin)

1. Sidebar → **Rental** → **IT contracts** → **[+ New]** → register contract (TLS-/VRT-YYMMDD-### auto-issued).
2. Contract detail → **Equipment list** tab → **[+ Add equipment]**.
3. The following fields are **required for SNMP auto-collection**:

| Field | Meaning | Example |
|---|---|---|
| Item (ItemCombobox) | Body unit registered in our inventory | "Samsung X7500" |
| **S/N** | Exact S/N from our inventory | `SN-X7500-001` |
| Manufacturer | Free text | "SAMSUNG" |
| **deviceModel** (dropdown) | Model OID key from 12.1 | `SAMSUNG_X7500` |
| **deviceIp** | Auto-filled by scan — **may be blank** | (DHCP) |
| **snmpCommunity** | Default `public` | Change per company policy |
| **installCounterBw / installCounterColor** | Counter at install | 0 (new) / 12,345 (used) |
| **baseIncludedBw / Color** | Monthly included count | 5,000 / 1,000 |
| **extraRateBw / Color** | Extra unit price (₫/page) | 30 / 200 |

> If `deviceIp` is empty, the agent **scans the LAN on first run** and auto-detects / updates DB.

### Step 2. Issue tokens (Admin)

1. Sidebar → **Rental** → **SNMP management** → Tab 3.
2. Expand the registered contract and click **[🔑 Issue]** for each equipment row.
3. Confirm tokens for all equipment are issued.

### Step 3. Build the agent package (Admin, HQ PC)

1. On the same screen, [📦 **Download agent package**] → save `config-{contractCode}.json`.
2. Gather the master file set held at HQ on a USB or temporary folder:
   - `tellustech-agent.exe` (download latest from [GitHub Releases](https://github.com/jslee-sketch/tellustech-admin/releases))
   - The `config-{contractCode}.json` you just downloaded → rename to **`config.json`**
   - `installer/install.bat`
   - `installer/uninstall.bat`
   - `installer/README.txt`
3. Bundle these 5 files into a **single ZIP** → filename: `tellustech-agent-{clientName}.zip`.

### Step 4. Install on the customer PC (on-site visit / remote guidance)

#### Pre-checks

- **OS**: Windows 10 / 11 (64-bit). Windows Server is also fine.
- **Network**: That PC is on the same LAN as the printers. Internet (HTTPS to the ERP domain) reachable.
- **Permission**: A PC account capable of admin password (UAC consent required).
- **Firewall**: Allow SNMP traffic (UDP 161). Verify internal firewall policy.

#### Install flow

1. Copy the ZIP to the PC via USB → extract to any folder.
2. **Right-click `install.bat` → Run as administrator**.
3. UAC dialog → "Yes".
4. Console screen (TUI):
   ```
   ╔════════════════════════════════════╗
   ║  TELLUSTECH SNMP AGENT — Setup     ║
   ╚════════════════════════════════════╝
   1. Scanning network... (192.168.1.0/24)
      → 5 SNMP devices found
   2. Which devices to register? (managed by this PC)
      [1] 192.168.1.10  Samsung X7500  SN: K0123456
      [2] 192.168.1.11  Sindoh D330    SN: D0234567
      ...
      Choose (comma-separated, all=all): _
   ```
5. Pick numbers → register to ERP → result shown on screen.
6. At the end auto-enters silent mode → hides into the tray.
7. **`install.bat` deletes `config.json` at the end** (prevents token leakage if USB is lost).

#### Install location / auto start

- Install folder: `C:\Tellustech\` (user-only access)
- Startup registration: `tellustech-agent.exe --silent` runs at boot
- Local queue DB: `C:\Tellustech\agent.db` (SQLite — kept for retry on send failure)

### Step 5. Verify first collection (Admin, HQ)

1. Within 5 minutes of install, on HQ ERP → Sidebar → SNMP → **Tab 2 Collection Status**.
2. Confirm the registered S/Ns appear with **Mode=AGENT**.
3. **If any S/N is missing**:
   - **Tab 1 (Model OID)**: Verify that the printer responds for the model's OID (snmpwalk in Step 12.1).
   - **Customer PC**: Right-click the agent in the tray → "View status" (or in cmd `tellustech-agent.exe --status`) → most recent attempt log + pending queue.
   - **Firewall**: From that PC `Test-NetConnection <printerIP> -Port 161 -Information Detailed` (UDP is hard to test directly → snmpwalk is more reliable).

### Step 6. Auto collection flow (henceforth automatic)

| Time | Action | Where |
|---|---|---|
| Daily 00:00 (PC time) | Polls only equipment whose `snmpCollectDay` matches | Agent |
| Polling success | Sends to ERP `POST /api/snmp/readings` → SnmpReading row created | Agent → ERP |
| Polling failure | Hourly retry up to 5 times. After 5 reports an error in heartbeat | Agent |
| Hourly | heartbeat (`POST /api/snmp/heartbeat`) — agentVersion / online time | Agent |
| Daily 12:00 (PC time) | Auto-update check (`/api/snmp/agent-version`) | Agent |
| 1st of every month 03:00 KST | UsageConfirmation auto-creation (`/api/jobs/snmp-usage-check`) | ERP cron |

### Step 7. Monthly usage confirmation handling (section 12.3)

→ Move to 12.3.

---

## 12.3 Usage confirmation (`/admin/usage-confirmations`)

The flow that builds the **customer-signed confirmation** + **sales voucher** auto-generated each month from collected counters.

### 6-step workflow

```
COLLECTED → CUSTOMER_NOTIFIED → CUSTOMER_CONFIRMED → ADMIN_CONFIRMED → PDF_GENERATED → BILLED
   ⬜            🟡                    🟢                  🔵              📄          ✅
   Collected     Customer notified     Customer confirmed  Admin confirmed PDF created Sales linked
```

The [Action] button at the right of each row exposes only the next valid step from the current status.

### Auto-creation (no admin action needed)

On the day **after** an ACTIVE IT contract's `snmpCollectDay` (default 25), at 03:00 KST a cron runs:
- Have all SnmpReadings arrived for every equipment in that contract?
  - **All arrived** → `UsageConfirmation` auto-created (status=COLLECTED).
  - **Partial** → moved to admin review queue (manual entry needed).
  - **None** → no notification; tries again the next day.

### Manual counter entry (no agent / temporary outage)

1. Sidebar → SNMP → Tab 2 → **[+ Manual entry]**.
2. Enter contract / S/N / mono / color counters → save.
3. The UsageConfirmation cron will auto-process it at the scheduled next time using that data.

### Usage calculation formulas (auto)

```
Monthly usage (pages)   = This month counter - Last month counter
Excess usage (pages)    = max(0, monthly usage - included pages)
Excess charge (₫)       = excess usage × extra unit price
Total billing (₫)       = monthly base fee + mono excess + color excess
```

#### Negative / counter-reset handling (auto)

- If negative (this < last) → clip usage to 0 + flag `isCounterReset=true`.
- ⚠ marker on PDF + that line auto-excluded from billing.
- If `resetAt` of ItContractEquipment is between prev~curr, prev is ignored (e.g., mainboard swap).

#### First-month handling

- prev = none → use `installCounterBw / installCounterColor` as prev.
- First-month bill = usage between install time and first reading.

### Per-status actions (right-side button on each row)

| Status | Button shown | What happens on click |
|---|---|---|
| ⬜ COLLECTED | **[Notify customer]** | Creates a Notification for the client's portal users + email (if configured). status → CUSTOMER_NOTIFIED |
| 🟡 CUSTOMER_NOTIFIED | **[Re-notify]** / **[Manual confirm]** | Re-notify: send the same notification again. Manual confirm: memo required (e.g., "Confirmed by phone 04-26") |
| 🟢 CUSTOMER_CONFIRMED | **[Admin confirm]** | One more admin review and approval |
| 🔵 ADMIN_CONFIRMED | **[Generate PDF]** | pdf-lib + Noto Sans CJK + customer signature embedded. status → PDF_GENERATED |
| 📄 PDF_GENERATED | **[📄 PDF]** / **[Sales voucher]** | PDF: download. **Sales voucher**: confirm modal → Sales newly issued + PayableReceivable (receivable) auto-created. status → BILLED |
| ✅ BILLED | **[📄 PDF]** | Locked — no further edits. PDF can still be downloaded |

### Recommended monthly flow

```
1st 03:00  → cron auto-processes → 1 COLLECTED row created per client (no admin action)
1st 09:00  → Admin: bulk click [Notify customer] on all COLLECTED rows
1st – 5th  → Customer logs into portal → check counter → sign → CUSTOMER_CONFIRMED
6th        → Admin: [Re-notify] for unconfirmed clients, or [Manual confirm] after a phone call
6th PM     → Admin: [Admin confirm] all CUSTOMER_CONFIRMED rows → [Generate PDF] → [Sales voucher]
8th        → Send invoice (attach PDF in the Finance receivable module)
```

---

## 12.4 IT contract detail — SNMP-related fields (equipment registration / edit)

SNMP-related fields on ItContractEquipment at a glance:

| Field | Category | Notes |
|---|---|---|
| `deviceIp` | Auto | Updated on the agent's first run via LAN scan. Updated on every DHCP change. |
| `deviceModel` | Entered at registration | Key into SnmpModelOid (dropdown) |
| `snmpCommunity` | Default `public` | Change per company policy |
| `deviceToken` / `contractToken` | System | UUID, DB only |
| `deviceTokenExpiresAt` / `RevokedAt` | System | 60-day sliding + revoke timestamp |
| `snmpCollectDay` (contract) | Default 25 | Only 1–28 (avoid months without 31) |
| `installCounterBw` / `Color` | At registration | Used as prev for the first month |
| `baseIncludedBw` / `Color` | At registration | Monthly included pages |
| `extraRateBw` / `Color` | At registration | Extra unit price (₫/page) |
| `resetAt` | Entered during operation | Counter reset time. Only counters after it are used |
| `lastReadingAt` | Auto | Time of last SNMP collection (agent health monitor) |

---

## 12.5 Agent operations — daily / troubleshooting / upgrade

### Health check (monthly)

1. Sidebar → SNMP → Tab 3 (Equipment tokens).
2. Verify the **last collection** column for every ACTIVE equipment is within the current month.
3. Equipment with no collection for 30+ days → see 12.5.1 troubleshooting.

### 12.5.1 Common issues — quick triage

| Symptom | Likely cause | Action |
|---|---|---|
| Last collection more than a month ago | PC off / network broken | Ask client to reboot. Check tray icon |
| `Mode=AGENT` row never appears | Token not issued / config.json missing / polling failure | Verify token status in Tab 3 → reissue → redeploy package |
| Frequent negative / reset badges | Counter actually reset (mainboard swap / service) | Edit equipment → set resetAt |
| New rows appear in `SnmpUnregisteredDevice(PENDING)` | Agent discovered new printers on LAN | Process unregistered queue (12.5.2) |
| Agent auto-update failing | AGENT_DOWNLOAD_URL wrong / GitHub download blocked | Check Railway env vars. If internal firewall blocks github.com, switch to an internal mirror |
| heartbeat error: "snmp_timeout" | Printer SNMP off / community mismatch | Enable SNMP v2c · public in printer web UI |

### 12.5.2 Unregistered device queue (`SnmpUnregisteredDevice`)

Devices the agent finds on LAN scan but cannot match to an `ItContractEquipment` go into the queue with PENDING.

How to handle:
1. Sidebar → SNMP → (future) unregistered queue tab — currently direct DB query (P2.B follow-up).
2. After review, choose one of:
   - **Register as new equipment** → IT contract → add equipment → enter S/N · IP → issue tokens. Queue row's status auto-changes to `REGISTERED`.
   - **Ignore** → status `IGNORED` (e.g., printer for internal use)

### 12.5.3 Token revocation scenarios

| Situation | Action |
|---|---|
| Customer PC lost / stolen | Immediately Sidebar → SNMP → that contract → [Revoke] all equipment tokens. After preparing a new PC, [Reissue] + new package |
| Employee leaves (that PC was theirs) | [Revoke] → [Reissue] on the successor PC + redeploy package |
| Contract terminates | [Revoke] (auto-expires after 60 days, but immediate cutoff is recommended) |

### 12.5.4 Agent upgrade (Admin, HQ)

#### Prepare new version

1. Developer modifies `agent/` code → version bump.
2. Build:
   ```
   cd agent
   build.cmd
   ```
   → `agent/build/tellustech-agent.exe` (single exe, ~57MB)

#### Release

```
gh release create v1.0.1-agent agent/build/tellustech-agent.exe \
  --title "SNMP Agent v1.0.1" \
  --notes "Bug fixes / feature summary"
```

#### Update environment variables (Railway or hosting console)

| Variable | Value |
|---|---|
| `AGENT_LATEST_VERSION` | `1.0.1` (semver) |
| `AGENT_DOWNLOAD_URL` | `https://github.com/jslee-sketch/tellustech-admin/releases/download/v1.0.1-agent/tellustech-agent.exe` |

#### Auto deployment flow

- Daily 12:00 (each PC time) the agent calls `/api/snmp/agent-version`.
- If the response's `latestVersion` exceeds the current version → exe downloaded → saved as `tellustech-agent.exe.pending`.
- On the next PC reboot or install.bat re-run, the `.pending` file replaces the live binary and the new version starts.

> If you must enforce immediate effect, instruct the customer to reboot the PC. In environments where reboot is hard, `tellustech-agent.exe --restart` works in cmd (P2.B follow-up).

### 12.5.5 Heartbeat monitoring

- The agent calls `POST /api/snmp/heartbeat` hourly → recorded in the AgentHeartbeat table.
- No heartbeat for 30+ days → admin alert (P2.B follow-up; for now, direct SQL).
- SQL:
  ```sql
  SELECT contract_id, agent_machine_id, MAX(reported_at)
  FROM agent_heartbeats
  GROUP BY contract_id, agent_machine_id
  HAVING MAX(reported_at) < NOW() - INTERVAL '30 days';
  ```

---

## 12.6 Security / policy summary

- Plaintext token storage exists only inside `config.json`. Stored as plaintext in the ERP DB (no hashing) — verification is required on every request. Risk is managed instead via revocation, expiration, and sliding renewal.
- `config.json` is auto-deleted at the end of install.bat (prevents leakage if USB is lost).
- The agent install folder `C:\Tellustech` is accessible only to that user.
- On suspected token loss → admin revokes immediately → reissue + new package.
- On the ERP side, every token-use event is recorded in `audit_log` (Prisma middleware).

---

## 12.7 Technician appendix — commands / logs / SNMP packet verification

> This section collects the commands, paths, and debug procedures for **field IT technicians / internal IT teams**.

### 12.7.1 Agent command-line options

| Option | Action | Used for |
|---|---|---|
| `tellustech-agent.exe --setup` | First run — network scan + user choice + ERP registration | Auto-called by install.bat |
| `tellustech-agent.exe --silent` | Background — runs the cron scheduler | Auto-runs at boot |
| `tellustech-agent.exe --collect` | One-shot collection (debug) | Run directly when tray is unresponsive |
| `tellustech-agent.exe --status` | Recent log + pending queue dump | Diagnostics |
| `tellustech-agent.exe --version` | Print exe version | Update verification |

### 12.7.2 File / folder paths

| Path | Contents | Permissions |
|---|---|---|
| `C:\Tellustech\tellustech-agent.exe` | The exe (~57MB, Node 18 + pkg) | User RX |
| `C:\Tellustech\config.json` | erpUrl + contract / device tokens (auto-deleted after install → memory only at first setup; subsequently empty / missing) | User RW |
| `C:\Tellustech\agent.db` | SQLite — pending queue (kept on send failure, retry queue) | User RW |
| `C:\Tellustech\agent.log` | Daily-rotated log (info/warn/error) | User RW |
| `C:\Tellustech\tellustech-agent.exe.pending` | Auto-update download temp file. Replaces the live binary on reboot / re-run, then deleted | User RW |
| `C:\Users\<user>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\TellustechAgent.lnk` | Boot auto-run shortcut (`--silent`) | User RW |

### 12.7.3 Viewing logs / diagnostics

```cmd
:: Last 100 lines
type C:\Tellustech\agent.log | more

:: Errors only
findstr /I "ERROR WARN" C:\Tellustech\agent.log | more

:: Live tail
powershell -c "Get-Content C:\Tellustech\agent.log -Wait -Tail 50"
```

Log line format:
```
2026-04-28T10:15:32+09:00 [INFO]  poll  192.168.1.10  total=12345 bw=10000 color=2345
2026-04-28T10:15:33+09:00 [INFO]  send  contract=TLS-260101-001  rows=1  ok=200
2026-04-28T10:15:34+09:00 [WARN]  poll  192.168.1.11  snmp_timeout (3s)
2026-04-28T10:15:35+09:00 [ERROR] send  401 unauthorized — token revoked or expired
```

### 12.7.4 Direct query of the pending queue

Failed-to-send readings sit in the SQLite queue. If the system has sqlite3:

```cmd
sqlite3 C:\Tellustech\agent.db "SELECT id, equipment_sn, total_pages, attempts, last_error FROM pending ORDER BY id DESC LIMIT 20;"
```

Then force a resend:
```cmd
tellustech-agent.exe --flush-pending
```

### 12.7.5 Verify SNMP responses directly

#### Windows + snmpwalk (Net-SNMP Windows build or PowerShell)

PowerShell (`SNMP-Tools` module or `Olive.SnmpSharpNet`):
```powershell
# Standard RFC 3805 total counter
$ip = "192.168.1.10"
snmpwalk -v2c -c public $ip 1.3.6.1.2.1.43.10.2.1.4.1.1
# Expected: HOST-RESOURCES-MIB::hrPrinterDetectedErrorState.1 = INTEGER: 12345

# S/N
snmpwalk -v2c -c public $ip 1.3.6.1.2.1.43.5.1.1.17.1
```

#### Linux / WSL (snmpwalk)
```bash
sudo apt install snmp -y
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.2.1.43.10.2.1.4.1.1
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.2.1.43.5.1.1.17.1
```

#### Checklist when there is no response

1. Are the PC and the printer in the **same subnet**? (`route print` or `ip route`)
2. Is SNMP turned on at the printer? Printer web UI → Network → SNMP → **enable v2c, public, Read**.
3. Does the internal firewall block UDP 161? (`Test-NetConnection -ComputerName 192.168.1.10 -Port 161` — UDP can't be tested directly, snmpwalk above is more reliable)
4. Is the community something other than `public` per company policy (e.g., `tellustech`)? → Change `snmpCommunity` on the model OID screen in 12.1 + PATCH the equipment.
5. Some printers only support SNMPv1 → try `-v1`. Some only v3 — those need a separate model definition.

### 12.7.6 Packet capture for end-to-end verification (last resort)

```
1. Install Wireshark on that PC, or tcpdump in WSL
2. Filter: udp.port == 161 and ip.addr == <printerIP>
3. Run snmpwalk
4. Are SNMP GetRequest / GetResponse both visible?
   - GetRequest only → printer is not responding (firewall / SNMP off / community mismatch)
   - Both visible but response is noSuchObject → wrong OID (verify model OID)
   - Response is a valid INTEGER → all is well. Issue is on the agent side (config.json / token)
```

### 12.7.7 Tray vs. service mode (current vs. future)

Current (v1.0.x):
- **User-session** based. Auto-runs only after that user logs in (Startup shortcut).
- Works only for one user account on one PC. Collection stops if that PC is logged out.

Future (v2.0 planned):
- **Windows Service** mode. Always running regardless of login.
- Can be registered with `nssm install TellustechAgent C:\Tellustech\tellustech-agent.exe --silent` (when using NSSM).

> The current build is optimized for environments where the PC is always on and the user is mostly logged in. For 24/7 unattended environments, prefer the upcoming service mode.

### 12.7.8 ERP-side diagnostic endpoints

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /api/snmp/agent-version` | Latest exe version + download URL | None (static) |
| `POST /api/snmp/heartbeat` | Hourly heartbeat from agent | `Authorization: Bearer <contractToken>` |
| `POST /api/snmp/readings` | Counter submission from agent | `Authorization: Bearer <deviceToken>` |
| `POST /api/snmp/register-devices` | Register newly discovered devices | `Authorization: Bearer <contractToken>` |

For diagnostics from HQ (browser or curl):
```bash
# Latest version info
curl https://tellustech-admin-production.up.railway.app/api/snmp/agent-version

# Token validity (200 = valid, 401 = revoked/expired)
curl -X POST https://.../api/snmp/heartbeat \
  -H "Authorization: Bearer ctr_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"agentVersion":"1.0.0","agentMachineId":"test"}'
```

### 12.7.9 Frequently-used ERP-side SQL (admin console / direct IT)

```sql
-- Equipment that received data in the last 24 hours
SELECT contract_id, equipment_id, MAX(collected_at) AS last
  FROM snmp_readings
  WHERE collected_at >= NOW() - INTERVAL '1 day'
  GROUP BY contract_id, equipment_id
  ORDER BY last DESC;

-- Equipment with no collection for 30+ days (heartbeat monitor)
SELECT eq.id, eq.serial_number, c.contract_number, eq.last_reading_at
  FROM it_contract_equipment eq
  JOIN it_contracts c ON eq.it_contract_id = c.id
  WHERE c.status = 'ACTIVE' AND eq.removed_at IS NULL
    AND (eq.last_reading_at IS NULL OR eq.last_reading_at < NOW() - INTERVAL '30 days')
  ORDER BY eq.last_reading_at NULLS FIRST;

-- Tokens expiring soon (within D-7)
SELECT serial_number, device_token_expires_at
  FROM it_contract_equipment
  WHERE device_token_revoked_at IS NULL
    AND device_token_expires_at < NOW() + INTERVAL '7 days';

-- Equipment with frequent counter resets (admin integrity check)
SELECT equipment_id, COUNT(*) AS reset_count
  FROM snmp_readings
  WHERE is_counter_reset = TRUE
    AND collected_at >= NOW() - INTERVAL '90 days'
  GROUP BY equipment_id
  HAVING COUNT(*) >= 3
  ORDER BY reset_count DESC;
```

# Part 13. Consumable yield analysis (NEW)

A module that compares the inputs of consumables (toner, drum, etc.) with the actual SNMP output to auto-detect efficiency, inventory signals, and **suspected fraudulent use**.

## 13.1 Core formula

```
Expected output  = input quantity × rated yield × (reference coverage ÷ actual coverage)
Yield rate (%)   = actual output ÷ expected output × 100
```

- **Mono (B/W)**: sum of Black toner / Drum / Fuser
- **Color (C)**: sum per C/M/Y group then **MIN** (1 page = C+M+Y consumed together) — if any one color is not input, color analysis is skipped

### 5-tier badges

| Yield rate | Badge | Meaning | Auto action |
|---|---|---|---|
| 120% or higher | 🔵 BLUE | Toner short — needs more input | (planned) reorder alert |
| 80–119% | 🟢 GREEN | Normal | None |
| 50–79% | 🟡 YELLOW | Caution — suspicion of over-input | Monitor |
| 30–49% | 🟠 ORANGE | Warning — verify reason | Admin notification |
| Under 30% | 🔴 RED | Suspected fraud | Admin notification + audit_log auto-record + isFraudSuspect=true |

Thresholds can be adjusted from the **Settings** tab of `/admin/yield-analysis` (validated as monotonically decreasing).

## 13.2 Pre-work — fill yield on item master

1. **Item master** → CONSUMABLE or PART type → edit
2. Fill the "Output-related (consumable)" section:
   - **Rated yield (pages)** (manufacturer-published, at 5% coverage): e.g., 25,000
   - **Reference coverage (%)**: default 5

> If left blank, that part is ignored in yield calculations. Seeds auto-map to existing toner / drum (built-in patterns).

## 13.3 Pre-work — actual coverage per equipment

IT contract detail → **Equipment list** tab → enter inline in the **"Actual coverage"** column (1–100%).
- Default 5% — typical office.
- Photo / graphics-heavy customers can adjust to 10–15%.
- Reflected immediately on yield recalculation.

## 13.4 Run yield calculation

### Auto — monthly cron
- `/api/jobs/yield-analysis-monthly` (every month 1st 02:00 KST)
- Computes for all equipment of ACTIVE contracts for the previous month.
- Targeted if at least one SNMP reading or AsDispatchPart exists.
- RED badge → auto-notification to all ADMIN users (`YIELD_FRAUD_SUSPECT` type, 3 languages).

### Manual — single equipment recalculation
IT contract → equipment list row → 📊 button → calculates the prior 6 months.

### Manual — sync bulk (test / admin)
```
curl -X POST "<host>/api/jobs/yield-analysis-monthly?sync=1&targetMonth=2026-04" \
  -H "Authorization: Bearer $CRON_SECRET"
```
Response: `{ total, created, fraudCount, skippedNoData }`

## 13.5 Dashboard (`/admin/yield-analysis`)

### Tab 1 — Overview
- **Per-contract group view**: clicking the contract-number row expands ▾ to show equipment S/N rows.
- The group row displays the **lowest yield rate** within the contract + the count of fraud suspicions.
- Sort: lowest yield first (ascending) — most risky first.
- **Search / filter**: contract number / client / equipment S/N / period start–end / badge (5 tiers) — partial match, **Reset** button.

### Tab 2 — Fraud suspicion management
- Shows only isFraudSuspect=true; same search/filter as above.
- Row action [Investigation memo] → modal for memo input → on save records fraudReviewedById/At automatically.
- Even after review completion, the memo can be edited via [Investigation result].

### Tab 3 — Per-client statistics
- Per-client analysis count, average yield rate, fraud suspicion count.
- (Future expansion: **per-technician statistics** based on AsDispatchPart.dispatchEmployee)

### Tab 4 — Settings
- Adjust BLUE/GREEN/YELLOW/ORANGE thresholds + fraud notification threshold.
- Validates monotonic decrease (Blue > Green > Yellow > Orange > 0).

## 13.6 Yield rate column on sales list

`/sales` sales list — for RENTAL project sales only, the per-client **lowest yield rate** is shown:
- Format: `B/W 🟢 90%  C 🟢 90%` (B/W=mono, C=color)
- Based on the most concerning value across the IT-contract equipment of that client
- Click navigates to the yield analysis dashboard
- Non-RENTAL sales (TRADE/MAINTENANCE etc.) display "—"

## 13.7 Notifications

When fraud suspicion occurs, a `Notification` is auto-created for every ADMIN user:
- Title: `Consumable yield anomaly detected — {S/N}`
- Body: contract number, client, mono / color yield rate
- Link: `/admin/yield-analysis?id={analysisId}`
- Stored in 3 languages (vi/en/ko) at the same time

## 13.8 Data model summary

| Model | Role |
|---|---|
| `Item.expectedYield`, `yieldCoverageBase` | Per-item rated / reference values |
| `ItContractEquipment.actualCoverage` | Per-customer actual coverage (default 5) |
| `ItContractEquipment.lastYieldRateBw/Color/CalcAt` | Last computation cache (for sort / filter) |
| `YieldAnalysis` | Analysis history (period / actual / expected / badge / fraud / memo) |
| `YieldConfig` | Threshold settings (single row, id="default") |
| `YieldBadge` enum | BLUE / GREEN / YELLOW / ORANGE / RED |
| `NotificationType.YIELD_FRAUD_SUSPECT` | Fraud-suspect notification type |

---

# Part 14. Download / upload — administrator responsibilities

While appendix D of manual A is geared toward general users, this part covers **downloads / uploads accessible only to administrators** + **operational policy for full-batch operations**.

## 14.1 ECOUNT migration import (`/admin/ecount-import` — internal tool)

**Purpose**: One-shot bulk import of clients / items / sales / purchases masters from the existing ECOUNT ERP.

**File format**: ECOUNT export XLSX as-is. Headers in Korean (`거래처코드`, `품목명`, `구분`, `카테고리`, etc.).

⚠️ **One-time tool**. Periodic imports during operations are not supported — re-importing after editing values in ECOUNT does not sync. Already-imported clients are matched by itemCode / clientCode and updated like a PATCH, but unintended overwrite is risky.

⚠️ **Company code must be specified**. Choose whether the ECOUNT data belongs to TV or VR right before import. Wrong choice means hours of cleanup afterward.

💡 **Tips**:
- **Clean the data first**. Dormant / duplicate clients in ECOUNT should be cleaned in ECOUNT before import.
- **Dry-run** with 3 rows first. Verify column mapping (`구분=PRODUCT/CONSUMABLE/PART`, `카테고리=description`).
- **Order matters**: clients → items → purchases → sales. Sales-first will be rejected because clients don't yet exist.

## 14.2 SNMP agent package download (`/admin/snmp` Tab 3)

**Purpose**: Build the ZIP bundle to install on the customer PC.

⚠️ **`config-{contractCode}.json` contains plaintext tokens**. If a USB is lost, immediately [Revoke] all equipment tokens for that contract.

⚠️ **install.bat auto-deletes config.json at the end** — re-installing on the same PC requires a freshly downloaded package.

⚠️ **Agent exe (~57MB)** is held in GitHub Releases. Don't re-download every time — store on one HQ PC and reuse.

💡 **Tips**:
- **One ZIP per contract**. If a client has multiple PCs, the same ZIP can be reused (the contract token is the same; only the equipment tokens differ).
- **Checksum compare** is recommended: SHA256 from the GitHub Release page vs. the downloaded exe.
- **Versioning**: include version in the ZIP filename, e.g., `tellustech-agent-{client}-v1.0.0.zip`.

## 14.3 Usage confirmation PDF (`/admin/usage-confirmations`)

**Purpose**: Customer-signed monthly usage PDF + sales-voucher attachment.

⚠️ **After PDF generation, counters are no longer editable**. Just before PDF generation is the last review chance.

⚠️ **Noto Sans CJK font embedded**. Korean and Vietnamese must render in the PDF; missing font shows □□□ — call IT in that case.

💡 **Tips**:
- **Bulk-process biweekly**: month-start cron → 5th customer confirm → 6th bulk [Admin CFM] → [Generate PDF] → [Sales voucher]. The flow stays clean.
- **Customer non-confirmation**: after 5 days unconfirmed, [Re-notify] or [Manual confirm] (memo required) after a phone call. PDF will display "Confirmed by phone".

## 14.4 Yield report (`/admin/yield-analysis`)

⚠️ Currently view-only. CSV / Excel export to be added (backlog).

💡 **Tip**: From the screen "Fraud suspicion management" tab → right-click on row → print page (sidebar auto-hidden — see 12.1) for an ad-hoc PDF.

## 14.5 Audit log export (`/admin/audit-logs`)

⚠️ **Volume warning**. One year can be millions of rows. Apply search filters first, then export.

⚠️ **Export is a separate permission**. Even regular ADMIN can browse logs, but export needs a separate permission grant (information protection).

💡 **Tips**:
- **Right after accounting closing**, export a backup of that month's audit logs. For external audit readiness.
- **Retention**: at least 5 years (Vietnam accounting law). The DB retains forever, but quarterly off-loading 30-day chunks to external S3 / backup storage is recommended.

## 14.6 Common operational policy

| Task | Permission | Frequency |
|---|---|---|
| ECOUNT import | ADMIN | Once (during migration) |
| Bulk upload of clients / items / sales | MANAGER+ | As needed |
| Bulk-create user accounts | ADMIN | Quarterly (new-hire batch) |
| Bulk permission matrix change | ADMIN | On HR transfers |
| SNMP agent package | MANAGER+ | On new client onboarding |
| Usage confirmation PDF | MANAGER+ | Once a month, batched |
| Audit log export | ADMIN (extra permission) | External audit / accounting closing |
| Full DB backup (Railway console) | DevOps | Daily, automatic |

⚠️ **Every bulk operation is auto-recorded in audit_log**. Who, when, what was bulk-changed is traceable.

⚠️ **On re-upload after partial failure**: if the same code (`itemCode/clientCode/salesNumber`) exists, an upsert occurs (overwrite). Back up an export before import to avoid unintended overwrite.

---

# Part 15. Mock sales workflow (NEW — introduced late 2026-04)

Auto-issued monthly DRAFT sales + persona (technician / sales / finance) action flow.

## 15.1 Core concept

The cron `/api/jobs/rental-mock-sales-monthly` at 09:00 KST on the 1st of every month:
- Auto-issues 1 **DRAFT Sales** per ACTIVE IT contract + ongoing TM rental from the previous month (idempotent).
- IT sales = base fee tentatively entered, extra usage = 0 (auto-filled after UC ADMIN_CONFIRMED).
- TM sales = sum of all lines.

cron-job.org registration: see Part 14.

## 15.2 4-stage badges + auto progress

| Stage | Condition | Auto-transition trigger |
|---|---|---|
| 🟡 TECH | `isDraft=true && !technicianReady` | (IT) on usage confirmation ADMIN_CONFIRMED → 🟠 |
| 🟠 SALES | `isDraft=true && technicianReady` | Sales clicks [Issue sales] → 🔵 |
| 🔵 FINANCE | `!isDraft && !financeConfirmedAt` | Finance clicks [CFM] → 🟢 |
| 🟢 DONE | `financeConfirmedAt!=null` | (subject to accounting closing) |

> TM has no SNMP flow, so from the cron-issuance time `technicianReady=true` → starts at 🟠.

## 15.3 New screens

- `/sales` — stage KPI + stage select + per-column badge + "My action needed" filter
- `/sales/[id]` — top stage badge + [🟠 Issue sales] / [🔵 Finance CFM] / [Unlock finance] buttons
- `/finance/sales-confirm` — collects only 🔵 stage sales for **bulk CFM** with checkboxes

## 15.4 New APIs

- `POST /api/jobs/rental-mock-sales-monthly?sync=1&targetMonth=YYYY-MM` — cron + sync option
- `POST /api/sales/[id]/confirm` — sales issuance (auto-issues PR)
- `POST /api/sales/[id]/finance-confirm` — finance CFM (lock)
- `DELETE /api/sales/[id]/finance-confirm` — only ADMIN can unlock
- `POST /api/rental/it-contracts/[id]/terminate` — early termination (recover equipment + delete future DRAFT)
- `POST /api/rental/tm-rentals/[id]/terminate` — same for TM

## 15.5 Backfill script

One-shot fill for past months:
```
DATABASE_URL=... npx tsx scripts/backfill-mock-sales.ts 2026-01 2026-02 2026-03
```

---

# Part 16. Client portal account management (NEW)

Previously: API only, no UI → a card has been added on the client detail page.

## 16.1 Location

Open `/master/clients/[id]` → bottom card **🔐 Customer portal account**.

## 16.2 Actions

- **No account** → `[+ Issue account (ID = {clientCode})]` — username = clientCode, default password `1234`, mustChangePassword=true.
- **Account exists** →
  - Login ID / status / last login / "default password in use" displayed.
  - **🔑 Reset password to 1234** — for customer-reported loss.
  - **🚫 Deactivate / ✅ Activate** — for contract end, etc.

## 16.3 Employee password reset

`/admin/permissions` → select user on left → header **🔑 Reset password (1234)** button.
- ADMIN only, password `1234` + mustChangePassword=true.

## 16.4 Password policy change history

- Old policy: `username = "{clientCode}-portal"`, password arbitrary
- Current policy: `username = clientCode`, default password `1234`, forced change on first login

> For clients unable to log in with the old ID (`xxx-portal`), use [Reissue] or [Reset password] in 16.1 to fix immediately.

---

# Part 17. Inventory state description (NEW)

New fields on InventoryItem:
- `stateNoteVi / stateNoteEn / stateNoteKo` — free text (auto-translated to 3 languages on save).
- `stateNoteOriginalLang` — original input language.

The good / defective classification still uses the existing `status` enum:
- 🟢 **Good** = `NORMAL`
- 🔴 **Defective** = `NEEDS_REPAIR` / `PARTS_USED` / `IRREPARABLE`

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

- **v2.5.0 · 2026-05-03**: Finance Layer 4 — Financial Statements (Trial Balance/PL/BS/CF) + Period Close (verify→close→reopen) + AccountMonthlyBalance, /admin/closings consolidated. Sidebar +4 items, Excel·Print. Full details in Appendix K of the employee manual.
- **v2.4.0 · 2026-05-03**: Finance Layer 3 — General Ledger (VAS ChartOfAccounts + JournalEntry/Line + AccountMapping). 5 auto-journal hooks for Sales/Purchase/Cash/Expense/Payroll, 3 new screens (Chart of Accounts · Journal Entries · Mappings), +3 sidebar items. Full details in Appendix K of the employee manual.
- **v2.3.2 · 2026-05-03**: Bulk-fix of 14 Layer 1·2 gaps — bank-account picker in PR payment modal, Expense reimbursement workflow (status filter + badge + [Approve reimbursement] action), per-row cash in/out/transfer actions on accounts page, month-end cron (`/api/jobs/finance-monthly-snapshot` — creates BankAccountMonthlySnapshot + accumulates Budget actualAmount + budget-overrun notifications), integrity check (`/api/finance/bank-accounts/integrity-check` cache vs computed balance), cash-shortage alert (emits `CASH_SHORTAGE_ALERT` notification), profitability Excel export, 2 new NotificationType enums. Full details in Appendix K of the employee manual.
- **v2.3.1 · 2026-05-03**: Expense UI enhancement — fills the gap from Layer 1 task 13 (exposes paymentMethod / vendor / targetClient / cashOut input fields).
- **v2.3.0 · 2026-05-03**: Finance Layer 2 — Cost / Profitability (CostCenter + AllocationRule + Budget + per-client profitability). 2 new sidebar items. Full details in Appendix K of the employee manual.
- **v2.2.0 · 2026-05-03**: Finance Layer 1 — Cash management (BankAccount/CashTransaction + Expense expansion + Payroll bulk-pay + cash-shortage cron). Three new items in the Finance sidebar group. Full details in Appendix K of the employee manual.
- **v2.1.2 · 2026-05-03**: Added `resolveSessionCompanyCode()` fallback in the Prisma extension — when the ALS store is empty it reads the `x-session-user` header directly to determine `companyCode`. Resolves the case in v2.1.1 where `enterWith` failed because RSC forked the async context.
- **v2.1.1 · 2026-05-03**: Server Component auto company-filter fix — `getSession()` now sets sticky ALS context. The server-component path missed in v2.1.0 now also auto-filters.
- **v2.1.0 · 2026-05-03**: companyCode rollout — 34 transactional models gained the column (`@default(TV)` to backfill existing rows). `COMPANY_SCOPED_MODELS` set in `src/lib/prisma.ts` auto-filters reads + auto-injects on writes. `CodeSequence` migrated to composite PK `(companyCode, key)` to keep TNV vs VNV sequences race-free. `@@index([companyCode, createdAt])` added across the board. Master tables (Client/Item/Warehouse) + system tables (File/User/AuditLog) intentionally excluded (shared). Child tables (SalesItem/PurchaseItem/AsDispatchPart, …) get the column via parent propagation.
- **v2.0.0 · 2026-05-02 (PM)**: 4-rule commit policy adopted — ① new `src/lib/version.ts` + display at top of sidebar (under TTS logo) ② all 3 languages updated together ③ manual change-log kept in sync ④ Chrome verification required. Violations may trigger rework requests on the next task.
- **2026-05-02 (AM)**: This supplement published.
- **2026-05-01**: 4-axis truth table 30→34 rows, SUPPLIES itemType, purchase return / disposal / inventory adjustment / disassemble-assemble combos.
- **Late 2026-04**: ClientRuleOverride, auto PR DRAFT, AI portal posts, SNMP 6-step workflow + PDF.
- **Mid 2026-04**: NIIMBOT B21 labels, QR multi-scan, color channel badges.
- **Early 2026-04**: Yield 4 tabs + fraud suspicion notification, client portal auto-account issuance.
