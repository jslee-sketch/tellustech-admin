---
title: "Tellustech ERP — Customer Portal Guide"
subtitle: "For Customer Representatives (v2 — Reflects Portal Expansion)"
author: "Tellustech IT Team"
date: "2026-04-28"
lang: en
---

# Welcome

Thank you for using Tellustech's IT Rental, Measurement Equipment Rental, and Maintenance Services.

The **Customer Portal** is more than just an AS request channel — it is an integrated platform for managing all services across both the OA and Measurement Equipment business divisions in one place.

## What Can You Do?

### OA Division (Printers / Multifunction Devices)
- 📠 **OA Rental Status** — View your contracts, equipment, and payment status at a glance
- 🛠 **AS Request** — Report failures of equipment you own
- 📦 **Supplies Request** — Order toner, ink, parts, and other compatible items
- ✍️ **Usage Confirmation** — Review monthly billing usage and sign on mobile

### Measurement Equipment Division
- 🔬 **Rental / Repair / Calibration / Maintenance / Trade Status** — Including payment for all 5 service types
- 📄 **Calibration Certificate Download**

### Communication (NEW)
- 💬 **Quote Request** — Instantly request quotes for IT rental, measurement equipment, calibration, repair, and trade
- 🤝 **Business Referral** — Earn 100,000d when a referred company makes its first payment
- 🌟 **Praise / Improvement / Suggestion** — Praise for staff, opinions on service improvement
- 📰 **News** — Marketing, holidays, industry trends, usage tips
- 📊 **Survey** — Earn 10,000d for participating in customer satisfaction surveys

### 🏆 Points System (NEW)
All activities are automatically credited. 1,000d for each AS request / supplies request / service confirmation / usage confirmation, 1,000d for quote requests / opinion submissions, variable bonuses for posts, 10,000d for surveys, 100,000d for the first payment from a referred contract. Starting from 1,000,000d, points can be deducted from invoices or exchanged for gift certificates.

The portal works identically on PC, tablet, and smartphone, and supports 3 languages: Korean / Vietnamese / English.

> This guide is intended for **customer representatives** when using the portal. It is a separate document from the internal staff ERP manual (separate volume A).

---

# 1. Getting Started — Access and Login

## 1.1 Portal Access

In your browser (Chrome / Safari / Edge), access the portal address provided by your Tellustech contact.

```
https://portal.tellustech.co.kr
```

> Confirm the exact domain with your contact. It is separated from the internal staff domain.

## 1.2 Login Input Values — Where Do They Flow?

| Input Field | Example | **What This Value Does in the System** |
|---|---|---|
| **Customer Code** | `CL-260101-001` | Matches `Client.clientCode` in the DB → fixes your client ID in the session. All subsequent screens filter data by this ID |
| **Password** | (Issued by your contact) | bcrypt hash comparison. On match, JWT is issued; after 5 mismatches, the account is temporarily locked |
| **Language** | Korean / Tiếng Việt / English | Saved to `User.language` → applied immediately to all screen labels and messages. The data itself is stored in 3 language columns simultaneously |

**Result of input:**
- Login success → `JWT` cookie (`tts_session`) is issued, redirect to `/portal` main.
- All data displayed after login (IT contracts, request status, etc.) is automatically filtered by your client ID. Data from other companies is never exposed.
- 5 incorrect password attempts will temporarily lock the account (your contact must unlock it).

> **No company code (TV/VR) input is needed.** Whether your transaction Tellustech entity is TV or VR is already linked in the customer code itself, so routing is automatic.

## 1.3 Entering the Login Screen

On the login page, click the **🛒 Customer Portal Login / Customer Portal** button at the bottom of the screen, or if the URL has a `?portal=1` parameter attached, the portal mode form will be displayed automatically (the company code field disappears and changes to "Customer Code").

## 1.4 Forgotten Password

If you have forgotten your password, please contact your Tellustech representative to request a reset. For security reasons, self-reset is not provided (the portal does not send email-based reset links — to prevent impersonation).

---

# 1.4.5 Membership Policy (NEW)

## One Client = One Portal ID

Your company (client) is issued **one** portal login ID. If multiple representatives within one company will be using it, the password and ID should be managed by one IT representative and shared as needed.

> **Why is only one issued?**
> All activities — AS, supplies requests, quote requests, surveys, etc. — are accumulated per client. Issuing multiple IDs would result in duplicate credits for the same activity, or distribution that makes accountability tracking difficult. Additionally, points are treated as company (client) assets and consolidated into company-level usage such as invoice deduction.

## No Self-Registration

The portal uses an **administrator-issued model**. When a new client is registered, Tellustech issues an ID and delivers it to the IT representative. Self-reset is not provided for forgotten passwords; please contact your representative for reissuance (to prevent impersonation).

## Points are Client Assets

Whether one employee requests a quote and earns +1,000d, or another employee responds to a survey and earns +10,000d, **everything accumulates in one client balance**. Usage is also at the company level (individuals cannot take it).

## Points Usage Policy — Decided at Contract (NEW)

To address large-corporate compliance requirements (such as prohibition of personal gift certificate receipt), the **points usage method is decided at the time of contract**.

| Policy | Meaning |
|---|---|
| **❌ Not Set (NONE)** | Earning only, no exchange — pending policy decision |
| **💰 Invoice Deduction Only** | Automatic deduction from the next IT contract / sales invoice only |
| **🎫 Gift Certificate Only** | Gift certificate receipt only |
| **✅ Both** | Choose freely at the time of application |

Your company's policy is shown as a notice on the points page (sidebar 🏆 → click) ("Contractual usage method: Invoice deduction only"). Options that don't match the policy are **automatically hidden**.

> If you need to change the policy, please contact your sales representative.

---

# 1.5 Sidebar (NEW — Phase A Introduction)

After login, a **3-group sidebar** is displayed on the left (PC) or a hamburger ☰ menu at the top (mobile).

## 1.5.1 PC Sidebar (width ≥ 768px)

```
┌─────────────────────────┐
│ TELLUSTECH PORTAL    ◀  │ ← Collapse toggle
│ Company Name             │
│ 🏆 87,000d              │ ← Points balance (click → /portal/points)
│                          │
│ ── OA Division ──    ▼  │ ← Section collapse/expand
│ 📠 [OA Ad Banner]        │
│   Rental Status          │
│   AS Request             │
│   Supplies Request       │
│   Usage Confirmation     │
│                          │
│ ── Measurement ──    ▼  │
│ 🔬 [TM Ad Banner]        │
│   Rental / Repair / Calib│
│                          │
│ ── Communication ──  ▼  │
│ 💬 Quote Request         │
│ 🤝 Business Referral     │
│ 🌟 Praise/Improve/Suggest│
│ 📰 News                  │
│ 📊 Survey                │
│                          │
│ 🇻🇳 🇺🇸 🇰🇷  ☀/🌙     │ ← Language / Theme
│ [Logout]                │
│ [🏢 Internal Staff Login]│
└─────────────────────────┘
```

- **◀** Collapse button → only 64px icons displayed (click ▶ to expand again)
- **Section header ▼/▶** click to expand/collapse by group. State persists across refresh (localStorage).
- The current page's group is automatically expanded.
- **🏢 Internal Staff Login** — Switch to the internal ERP of the same system (auto-logout then move to internal login screen).

## 1.5.2 Mobile Hamburger Menu (width < 768px)

On smartphones, the sidebar is automatically hidden and a hamburger menu appears at the top.

```
┌──────────────────────────┐
│ ☰  TELLUSTECH  🏆 87,000d │
└──────────────────────────┘
```

- Click **☰** → 280px drawer slides in from the left (slide-in).
- The drawer closes automatically when a menu item is clicked.
- Free rotation (landscape/portrait) — manifest is set to `orientation: any`.

## 1.5.3 Ad Banner (Below Division Header)

The `📠 OA Ad / 🔬 TM Ad` text is a one-line ad that the Tellustech administrator can change. Click to open the company homepage (e.g., tellustech.co.kr/oa) in a new tab.

---

# 2. Main Screen at a Glance

The **main screen** displayed immediately after login consists of 4 areas.

## 2.1 Header — Company Name / Customer Code

Your company name and customer code (`CL-...`) are displayed at the top of the screen.
If the **Receivables Suspended state** (e.g., overdue payment), a red `Suspended / Bị khóa` badge is displayed, and new AS / supplies requests are temporarily disabled. The lock is automatically released after payment confirmation, or please contact your representative.

## 2.2 Quick Request Cards — 4

- 🛠 **AS Request / Yêu cầu BH**
- 📦 **Supplies Request / Yêu cầu vật tư**
- ✍️ **Usage Confirmation / Xác nhận sử dụng**
- 📄 **Calibration Certificate / Chứng chỉ** (the number in parentheses is the count available for download)

Click each item to navigate to the corresponding screen.

## 2.3 My IT Contracts Card

Displays the most recent 10 active/imminent IT contracts in contract number order. Each line shows the **contract number**, **status** (`ACTIVE` / `DRAFT`, etc.), and **number of equipment**.

## 2.4 My Request Status Table

Status of the most recent 20 AS/supplies requests you have registered. Flows in 4 stages.

| Stage | DB Value | Meaning | Who Changes It |
|---|---|---|---|
| **Request / Yêu cầu** | `RECEIVED` | Reception complete, awaiting representative assignment | Automatic (at registration) |
| **In Progress / Đang xử lý** | `IN_PROGRESS` | Representative assigned, work in progress | Tellustech representative changes |
| **Completed / Hoàn tất** | `COMPLETED` | Work completed, awaiting customer confirmation | Tellustech representative dispatch complete + signature |
| **Confirmed / Đã xác nhận** | `CONFIRMED` | Customer confirmed → closed | **Your company** clicks the "Confirm" button |

### What the "Confirm" Button Does

The **Confirm** button is only activated on the right side of rows whose status is `COMPLETED`. When you click this button:

1. API `POST /api/portal/tickets/{id}/confirm` is called.
2. Server validation: Is the ticket of your client? Is the current status `COMPLETED`?
3. On pass → updates `status = CONFIRMED`, `confirmedAt = now` → work closed.
4. The page automatically refreshes and the row updates to "Confirmed".

> Once confirmed, it cannot be undone. If you have objections to the work results, **before clicking the confirm button**, please contact your Tellustech representative.

---

# 3. AS Request

Use this when equipment is broken or needs inspection.

## 3.1 Data Impact by Input Value

| Input Field | Source / Value | **What This Value Does in the System** |
|---|---|---|
| **Equipment SN** (dropdown) | Your active equipment list returned by `/api/portal/my-equipment` | The selected SN is saved to `AsTicket.serialNumber` → the Tellustech representative can immediately query that equipment's contract, history, and calibration records |
| **Original Language** (VI/KO/EN) | Radio / Select | Saved to `AsTicket.originalLang`. The criterion the system uses to determine which language to view as the original during automatic translation |
| **Symptom (VI/KO/EN)** 1 of 3 fields | Free-form text | Upon save, the Claude API automatically translates to the other 2 languages → all 3 columns `symptomVi` / `symptomEn` / `symptomKo` are filled. Result: content written in Korean is read by a Vietnamese representative in Vietnamese, and the UK headquarters in English, instantly |

**Format displayed in the dropdown:**
```
SN-12345 · ITM-260101-001 LaserPrinter X7500 (TLS-260101-001)
```
In order: **Serial Number · Item Code Item Name (Contract Number)**.

**Which SNs appear in the dropdown:**
- Equipment registered in active IT contracts (`itContractEquipment.removedAt = null`) + equipment in TM rentals before end (`tmRentalItem.endDate >= today`).
- Therefore, recovered/replaced equipment automatically disappears, and newly registered equipment automatically appears (after page refresh).

## 3.2 Input Value Validation Rules (At Save)

| Validation | If Failed |
|---|---|
| At least **1** of the 3 symptom fields must contain text | `invalid_input` error, "Please enter symptoms" displayed |
| Your client session (role=CLIENT) | `client_only` error — does not occur in normal flow |
| Free-form SN input is allowed | SNs not in the dropdown are saved as-is (e.g., equipment brought in from outside) |

## 3.3 What Happens After Reception

When you click the **AS Reception / Tiếp nhận BH** button, the system performs the following at once.

1. **Automatic ticket number issuance** — Format `YY/MM/DD-NN` (e.g., `26/04/27-01`) — that day's serial number.
2. **Ticket creation** — `kind = AS_REQUEST`, `status = RECEIVED`, reception datetime and your client ID auto-filled.
3. **3-language translation storage** — The two language fields you didn't enter are auto-translated and saved.
4. **Internal notification** — Immediate notification to the Tellustech AS representative (displayed as a red unread badge on the internal ERP "AS Reception" screen).
5. **Customer notification** — Sends the message "Reception complete — number 26/04/27-01" to the registered email or KakaoTalk.
6. **Main screen refresh** — Immediately displayed as a new row in "My Request Status".

## 3.4 Blocking Behavior on Receivables Suspended (BLOCKED)

When your client is in `BLOCKED` status:
- The "AS Request" quick card is displayed in gray with strikethrough.
- Forced direct URL entry is rejected by the API with `403 receivable_blocked`.
- Once payment is confirmed, the client status automatically returns to `WARNING` or `NORMAL` → the menu is also activated immediately.

---

# 4. Supplies Request

Request regular supplies such as toner, ink, and parts.

## 4.1 Data Impact by Input Value

| Input Field | Source / Value | **What This Value Does in the System** |
|---|---|---|
| **Item** (dropdown) | `/api/portal/my-supplies` — the result of compatibility mapping (`ItemCompatibility`) for your active equipment | The selected itemId is saved to the line. itemIds not in the compatibility whitelist are rejected by the server with `not_compatible` |
| **Quantity** | Integer ≥ 1 | Saved to the line's `quantity`. The Tellustech outbound representative uses this value for ordering and warehouse outbound processing |
| **Note** (optional) | Free-form text | Saved to the line's `note`. Color, model, urgency, etc. communicated directly to the representative |

## 4.2 How Compatibility Mapping is Determined

The items shown in the dropdown are calculated in a flow equivalent to the following SQL.

```
Set of itemIds of your active equipment (PRODUCT)
   ↓
(productItemId, consumableItemId) mapping in the ItemCompatibility table
   ↓
Set of consumableItemId = candidates displayed in the dropdown
```

Therefore:
- **Even if new equipment is registered**, if the compatibility mapping is not also registered, new supplies may not be visible → request mapping registration from the representative.
- **When equipment is recovered**, supplies dedicated to that equipment automatically disappear from the dropdown if not common with other equipment.
- Compatibility mapping is managed directly by Tellustech in the admin screen (`/admin/item-compatibility`).

## 4.3 Multi-Line Input

You can include multiple items in one request using the `+ Add Item / Thêm vật tư` button. **All lines are bundled under one reception number** — the outbound representative processes them in a single outbound operation.

## 4.4 What Happens After Reception

When you click the **Send Request / Gửi yêu cầu** button:

1. **Compatibility validation per line** — If even one line is an incompatible item, the entire request is rejected (`not_compatible` + the corresponding itemId is shown).
2. **Reception number issuance** — Format `YY/MM/DD-NN` (shares the same sequence as AS).
3. **Ticket creation** — `kind = SUPPLIES_REQUEST`, `status = RECEIVED`, line information saved to the `suppliesItems` JSON column.
4. **Automatic summary message generation** — Exposed on the front screen as "[Supplies Request] Black Toner × 2, Color Ink × 1".
5. **Internal notification** — Notification to the Tellustech outbound representative.
6. **Main screen refresh** — Immediately displayed in "My Request Status" (with "📦 Supplies" notation in the type column).

> When in receivables suspension (`BLOCKED`), the quick card is disabled identically to AS.

---

# 5. Usage Confirmation (NEW — SNMP Auto-Collection Integration)

Confirm and sign monthly usage of IT (printers / multifunction devices).

## New Workflow (From 2026-04)

Previous: Administrator manually entered counters → issued billing
**New**: Agent automatically collects monthly → Usage Confirmation (UC) auto-generated → notification → customer signature → PDF → sales

### Auto-Collection Flow
1. On every monthly [Collection Date] (varies by contract, default 25th), the agent installed on the office PC automatically collects SNMP counters
2. ERP automatically generates "Usage Confirmation (UC-YYMMDD-###)" (status=COLLECTED)
3. The next day at 03:00 KST, cron sends a notification to the customer (status=CUSTOMER_NOTIFIED)
4. Portal sidebar notification + "Awaiting Confirmation" displayed on the main screen
5. Customer clicks [Confirm] → reviews per-equipment usage / fee → signs → confirmed (status=CUSTOMER_CONFIRMED)
6. Administrator review → PDF generation → sales slip issuance → automatic receivables generation

### New Screen — Per-Equipment Detail Cards

An individual card is displayed for each piece of equipment in each IT contract:

```
┌─ Equipment 1: Samsung SCX-8123 (SEC30CDA760C1FD) ─┐
│              │  B&W   │ Color  │
│ Cumulative  │ 70,767 │   —    │
│ Last Month  │ 69,500 │   —    │
│ This Month  │ 1,267  │   —    │
│ Base Fee            500,000₫  │
│ Base Included (B&W) 1,000 pgs │
│ Additional (B&W)    267 pgs   │
│ Extra Charge (@500₫) 133,500₫ │
│ ────────────────────────────  │
│ Subtotal            633,500₫  │
└────────────────────────────────┘

(N pieces of equipment → N cards)

═══════════════════════════════
Total: 1,433,500₫
[✍️ Sign]  [Confirm]  → +1,000d earned!
```

### ⚠ Counter Anomaly Detection

If the value drops unnaturally (motherboard replacement, etc.) or usage less than 0 is calculated, ⚠ is displayed. **Before confirming**, please contact your Tellustech representative.

## 5.1 Display Data — Where Does It Come From?

Each row visible on the screen is one **monthly billing row (`itMonthlyBilling`)** registered by an internal staff member. Only IT contract billings of your client are automatically exposed.

| Column | Source / Meaning |
|---|---|
| **Month / Tháng** | `billingMonth` (e.g., `2026-04`) — registered monthly by the Tellustech representative |
| **S/N** | Serial of the IT equipment that the billing points to |
| **B&W / B&W** | `counterBw` — cumulative value entered by the internal representative after meter reading |
| **Color / Color** | `counterColor` — same |
| **Amount / Phí** | `computedAmount` — automatically calculated by the system as counter difference × unit price |

## 5.2 Data Impact by Input Value

| Input / Action | **What This Value Does in the System** |
|---|---|
| **✍️ Signature** (canvas drawing) | Finger/mouse trajectory is converted to PNG (data URL) and held only in memory — not yet saved to DB |
| **Confirm / Xác nhận** button | The signature PNG is sent to the API → saved to the `itMonthlyBilling.customerSignature` column → that billing row is locked (cannot re-sign) → triggers automatic receivables generation in the internal ERP |

## 5.3 Mobile Finger Signature Procedure

1. Click the **✍️ Sign / Ký tên** button on the right of the billing row → the signature modal opens.
2. Draw your signature in the white area inside the modal with your mouse (or smartphone finger).
3. Save the signature with the **Confirm** button in the modal. (Modal closes and ✓ mark appears on the row)
4. Click the **Confirm / Xác nhận** button on the table row to send the signature to the server and complete confirmation.

## 5.4 Validation Rules (At Save)

| Validation | If Failed |
|---|---|
| Only your client's billing rows can be confirmed | `forbidden` error |
| Already-signed rows cannot be re-signed | `already_confirmed` error displayed |
| If signature is missing, "Confirm" button is disabled | Blocked on the client |

## 5.5 What Happens After Confirmation

1. The billing row is locked (`customerSignature` not null).
2. In the internal ERP receivables module, that billing amount is automatically generated as a **new receivable** (`PayableReceivable`, `kind=RECEIVABLE`, `status=OPEN`).
3. The payment due date is automatically calculated based on the client master's payment terms (e.g., 30 days).
4. Begins to be affected by accounting closing (lock) policy.

## 5.6 Independent of Suspended (BLOCKED) State

Usage confirmation can always be used regardless of receivables suspension state — confirmation itself is a "value finalization" procedure separate from payment.

> Once confirmed, it cannot be modified. If you have objections to the counter values, **before confirming, you must** contact your Tellustech representative.

---

# 6. Calibration Certificate Download

Search and download PDF certificates for equipment whose calibration (verification) has been completed.

## 6.1 Data Impact by Input Value

Each search condition is added to the server query as a partial match (`contains`) AND condition. Leave all blank and click "Search" to display all certificates of your client in descending order of issue date.

| Condition | Matching Column | **Search Behavior** |
|---|---|---|
| **S/N** | `SalesItem.serialNumber` | Partial match (case-insensitive) — e.g., when entering `SN-12`, both `SN-12345` and `ASN-12` match |
| **Certificate No.** | `SalesItem.certNumber` | Partial match |
| **Item** | `Item.itemCode` or `Item.name` | Partial match — either code or name |
| **Start Date** | `SalesItem.issuedAt >= start date` | Issue date lower bound |
| **End Date** | `SalesItem.issuedAt <= end date` | Issue date upper bound |

## 6.2 Which Rows Are Search Targets — Automatic Filter

The data shown on this screen is sales lines that simultaneously satisfy the following 4 conditions.

1. `Sales.clientId` = your client (automatic — data of other clients is never visible)
2. `Sales.project.salesType` = `CALIBRATION` (calibration projects only)
3. **At least one** of `SalesItem.certNumber` or `SalesItem.certFileId` has a value
4. (In addition to the above) the screen search conditions match

Therefore, regular sales (`TRADE`, etc.) lines or calibration lines whose PDF has not yet been uploaded are not exposed.

## 6.3 Result Table

| Column | Meaning |
|---|---|
| **Issue Date** | `SalesItem.issuedAt` |
| **Certificate No.** | `SalesItem.certNumber` |
| **S/N** | `SalesItem.serialNumber` |
| **Item** | `itemCode · name` |
| **Next Due** | `SalesItem.nextDueAt` — next scheduled calibration recommendation date |
| **Download** | 📄 PDF button — only displayed when `certFileId` has a value |

## 6.4 Download Behavior

When you click the 📄 PDF button, `/api/files/{certFileId}` opens in a new window.
- Only files of your client can be downloaded — even a direct URL attempt with another client's ID file is rejected with `403`.
- Once the file is open, you can save it locally via the browser's print/download menu.
- The N value of "📄 Calibration Certificate ({N})" on the main screen is the same as the total number of items this screen can display.

---

# 7. Service Status Dashboards 6 Types (NEW)

Confirm **contract + payment status** of all OA / measurement equipment services on a single screen.

## 7.1 6 Service Types

| Menu | Path | Data |
|---|---|---|
| 📠 OA Rental Status | `/portal/oa/rentals` | IT contracts + equipment + monthly billing |
| 🔬 TM Rental Status | `/portal/tm/rentals` | TM rentals + equipment lines + sales |
| 🔧 Repair Status | `/portal/tm/repairs` | Per-repair sales |
| 📐 Calibration Status | `/portal/tm/calibrations` | Calibration sales + certificates |
| 🛠️ Maintenance Status | `/portal/tm/maintenance` | Maintenance contracts + monthly proration |
| 💼 Trade Status | `/portal/tm/purchases` | New/used purchase history |

## 7.2 Screen Composition — Common

Each dashboard follows the same pattern.

### (When Available) My Contracts / Rentals — Card-Style Expansion
```
TLS-260426-007  🟢ACTIVE  5 units  2026-01-01 ~ 2027-12-31  ▶
```
▶ Click → Equipment lines expand (S/N · item name · monthly fee · installation date).

### Payment Status — Table

| Column | Meaning |
|---|---|
| **Month / Item** | Billing month or slip number |
| **Billing Amount** | `PayableReceivable.amount` |
| **Scheduled Date** | `revisedDueDate ?? dueDate` (revised date takes priority) |
| **Actual Payment Date** | If `status=PAID`, the last payment date |
| **Days Remaining** | `Scheduled date - today`. Negative=days remaining (green), 0=today (yellow), positive=days overdue (red) |
| **Status** | `🟢 Not Yet Due / 🟡 Today / 🟠 Imminent (±3 days) / 🔴 Overdue / ✅ Paid` |

### Summary (Below Table)
- **Outstanding Total**: count and amount of unpaid items
- **Overdue**: count and amount of overdue items (red if any)

## 7.3 When There Is No Data

If there is no usage history, a guidance message + **[Request Quote]** CTA button — when clicked, navigates to the quote request page with the corresponding service type pre-filled.

---

# 8. Quote Request (NEW)

Instantly request quotes for new IT rental, measurement equipment rental, calibration, repair, trade, and maintenance.

## 8.1 Data Impact by Input Value

| Input | DB Field | Effect |
|---|---|---|
| **Type** | `quoteType` (RENTAL_IT/RENTAL_TM/CALIBRATION/REPAIR/PURCHASE/MAINTENANCE/OTHER) | Criterion for automatic sales rep assignment |
| **Title** (1 or more of KO/VI/EN) | `titleKo/Vi/En` | Languages not entered are auto-translated by the Claude API |
| **Detailed Description** | `descriptionKo/Vi/En` | Same auto-translation |
| **Desired Quantity / Start Date / End Date** | `quantity / desiredStartDate / desiredEndDate` | Reference for the sales rep when preparing the quote |

## 8.2 Flow After Reception

1. **Automatic code issuance** — `QR-YYMMDD-###`
2. **Status = REQUESTED** → awaiting sales rep assignment
3. Tellustech sales rep prepares quote PDF + amount → **Status = QUOTED**
4. [Accept] / [Reject] buttons activate on the customer screen
5. On accept, `Status = ACCEPTED` → sales rep converts to IT contract / TM rental / sales
6. **Points credit**: +1,000d automatically at the time of request

## 8.3 My Quote History

All quotes you have requested are managed in a table — request date, code (`QR-...`), type, status, quote amount, action (accept/reject).

---

# 9. Praise / Improvement / Suggestion (NEW)

Submit opinions about services or staff.

## 9.1 Type Selection

| Type | Meaning | Points |
|---|---|---|
| 🌟 **Praise (PRAISE)** | Praise good response from an individual staff member | +1,000d |
| 🔧 **Improvement (IMPROVE)** | Points needing improvement in current service | +1,000d |
| 💡 **Suggestion (SUGGEST)** | Ideas for new features / services | +1,000d |

## 9.2 Composition

- Select type → write content (1 or more of KO/VI/EN). Auto-translated.
- For praise, you can select the **target staff member** (list of AS / sales reps for your client).
- After registration, code `FB-YYMMDD-###` is issued.

## 9.3 Reply

When Tellustech writes a reply, a reply box is additionally displayed at the bottom of the opinion card (in 3 languages).

---

# 10. News (CMS Bulletin Board) (NEW)

A bulletin board collecting marketing news, company notices, Korea / Vietnam / industry news, usage tips, and customer community posts.

## 10.1 Category Tabs

All / MARKETING / COMPANY_NEWS / KOREA_NEWS / VIETNAM_NEWS / INDUSTRY_NEWS / TIP / COMMUNITY

## 10.2 Viewing Posts

- Click the card → the body expands below the card.
- If a **source URL** is included in the body, it is automatically displayed as a clickable link.
- An **AI auto-generated draft** notice may appear at the end of the body — in that case it may be modified after fact verification.
- Posts marked as **pinned at the top (📌)** are always at the top.

## 10.3 Bonus Points

- Some posts have a `+N d` badge (set by the administrator).
- Auto-credited only once on first viewing — no credit on subsequent re-views.
- Sidebar 🏆 balance is updated immediately upon credit.

## 10.4 Community Post Writing (Optional)

The `COMMUNITY` category allows customers to write posts as well (activated at Phase C operation). +1,000d credited immediately upon writing.

---

# 11. Survey (NEW)

Respond to surveys issued by Tellustech, such as customer satisfaction surveys.

## 11.1 Active Survey Card

Each survey card:
- Title, period (start ~ end)
- **🏆 +10,000d** reward indicator
- **[Participate]** button (or "Participation Complete" if already participated)

## 11.2 Participation Modal

Question types:
- **RATING** — select 1~5 score
- **CHOICE** — single choice from options
- **TEXT** — free-form description (auto-translated)

When [Participate] is submitted:
1. Server validation → your client + within active period + not yet participated
2. Save answers (`SurveyResponse.answers` JSON)
3. **+10,000d auto-credited** (the unit price may differ per survey)
4. Toast notification + sidebar balance refresh

> **One client = one response** is allowed.

---

# 12. Business Referral (NEW)

Introduce another company you know to Tellustech. When the first payment is made, **100,000d** is credited to the referrer.

## 12.1 Input Items

| Item | Required |
|---|---|
| Company Name | ✓ |
| Contact Name | ✓ |
| Phone Number | ✓ |
| Email | (Optional) |
| Reason for Referral | (Optional) |

> **Self-referral blocked** — the same company name as your client is rejected at registration (`self_referral` error).

## 12.2 Progress Stages

| Stage | DB Value | Meaning | Points |
|---|---|---|---|
| Submitted | SUBMITTED | Registration complete | — |
| Contacted | CONTACTED | Sales rep made first contact | — |
| Meeting in Progress | MEETING | Sales meeting in progress | — |
| Contract Signed | CONTRACTED | Formal contract (not yet paid) | — |
| **First Payment** | PAID | New client first transfer confirmed | **+100,000d auto-credited** |
| Rejected / Failed | DECLINED | Discontinued | — |

> **Credit at the time of first payment, not contract signing** — designed to block non-cash contracts and cancellation risks.

## 12.3 My Referral History

All referrals you have requested are managed in a table.

---

# 13. My Points (NEW)

Enter via `/portal/points` or by clicking the sidebar 🏆.

## 13.1 Balance + Progress Bar

```
🏆 87,000d
[████████░░░░░░░░░░░░░░░░] 8.7%
913,000d remaining to 1,000,000d
[Exchange Points] (activated from 1,000,000d)
```

## 13.2 Credit / Deduction History

Date · Reason · Credit/Deduction · (each row accumulates so balance = SUM is always accurate).

## 13.3 Credit Guide (Summary)

| Activity | Unit Price |
|---|---|
| AS Request / Supplies Request / Service Confirmation / Usage Confirmation | 1,000d |
| Quote Request / Praise·Improvement·Suggestion | 1,000d |
| Community Post Writing | 1,000d |
| Bonus Post Viewing (1 time) | Differs by post |
| Survey Response | 10,000d |
| Referral Company First Payment | 100,000d |

> The credit unit price can be changed by the Tellustech administrator (immediately reflected upon policy change).

## 13.4 Points Exchange (From 1,000,000d)

Click [Exchange Points] button → modal:

### Method 1: 💰 Invoice Deduction
Automatic deduction from the next IT contract / sales invoice. Processed within 3 business days.

### Method 2: 🎫 Gift Certificate
Gift certificate sent (the representative sends to the registered email / mobile).

### Units
- Minimum **1,000,000d**
- **In units of 1,000,000d** (2 million, 3 million, etc.)
- Within balance limit

### Processing Flow
1. Apply → `PortalReward(status=PENDING)` created, balance immediately deducted
2. Tellustech administrator approval → `APPROVED` (actual processing proceeds)
3. Processing complete → `DELIVERED` (within 3 business days)
4. On rejection → `REJECTED` + deducted points automatically refunded

> **Duplicate deduction prevention** — while one application is being processed, you can register a duplicate application for the same amount, but all are deducted from the balance.

---

# 14. Mobile PWA Installation

Since the portal operates as a PWA (Progressive Web App), it can be installed on the smartphone home screen like an app.

## 7.1 iOS Safari

1. Access the portal address in Safari and complete login.
2. Click the **Share** button (□↑) in the bottom center.
3. Select **"Add to Home Screen"**.
4. Confirm the name and click **Add** to create an icon on the home screen.

## 7.2 Android Chrome

1. Access the portal address in Chrome and complete login.
2. Select **⋮ menu in the upper right → "Add to Home Screen"**.
3. Click **Install** to create an icon in the app drawer / home.

## 7.3 Use Like an App

- After installation, it runs in full screen without the browser address bar.
- Some screens (main, my request status, etc.) display the last viewed data as cache even when offline. New requests and real-time status updates require an internet connection.

---

# 15. FAQ

**Q. I forgot my password.**
A. Please contact your Tellustech representative to request a reset. Self-reset is not provided.

**Q. Where can I see the AS request progress?**
A. Tracked in 4 stages (Request → In Progress → Completed → Confirmed) in the "My Request Status" table on the main screen. Notifications are also sent to the registered email / KakaoTalk.

**Q. The item I want is not visible in the supplies list.**
A. The compatibility mapping is likely not registered. Please ask your representative to map the item to your equipment.

**Q. I think the counter value in the usage confirmation is incorrect.**
A. **Before clicking the confirm button**, contact your representative. Once confirmation is complete, it cannot be modified.

**Q. There is a red suspended badge in the company header.**
A. The new request menu has been temporarily disabled due to delayed receivables payment. It is automatically released after payment confirmation. Usage confirmation and calibration certificate download can be used regardless of the suspension.

**Q. Where do notifications come?**
A. Sent to the registered email / KakaoTalk. To change the receiving channel, contact your representative.

**Q. I want to see Korean and Vietnamese simultaneously.**
A. When entering, select only one original language. The system automatically translates and stores the remaining languages. The display language can be switched with the flag icon at the top right of the screen.

**Q. The sidebar suddenly disappeared / I can't find the menu on mobile.**
A. PC: Click the ◀ button on the upper right of the sidebar to collapse to 64px. Click ▶ to expand again. Mobile: Click the ☰ hamburger menu at the upper left of the screen to display the menu from the left.

**Q. I want to use it in landscape, but auto-rotation doesn't work.**
A. When installed as a PWA, it takes a little time for the manifest to be updated. Delete the icon on the home screen once and reconnect via Safari/Chrome, then "Add to Home Screen" again. If accessed via a regular browser, refreshing the page applies it immediately.

**Q. After portal login, I want to enter the internal ERP (for staff).**
A. Click the **🏢 Internal Staff Login** button at the bottom of the sidebar (or at the bottom of the mobile hamburger menu). After auto-logout, it moves to the internal login screen.

**Q. When are points credited?**
A. AS / supplies / service confirmation / usage confirmation → +1,000d immediately. Quote request / opinion submission → +1,000d immediately. Survey → +10,000d immediately upon response. Referral → +100,000d when the new client makes the first payment (not at the time of contract).

**Q. When can points be used?**
A. Exchangeable from 1,000,000d cumulative. `/portal/points` or sidebar 🏆 click → [Exchange Points]. Choose between invoice deduction or gift certificate receipt. Processed within 3 business days after application.

**Q. How many days will it take to receive a reply after a quote request?**
A. A Tellustech sales rep is automatically assigned and usually replies within 1~2 business days. In urgent cases, direct phone contact with the representative is recommended.

**Q. The company I referred signed a contract, but the points haven't been credited.**
A. The 100,000d credit is processed at the **time of the first payment**. Contract signing alone does not credit. If still missing after payment confirmation, contact your representative.

**Q. There is a source URL in the post but it doesn't click.**
A. In the portal, it is automatically converted to a clickable link. If it appears as plain text, refresh the page.

**Q. I clicked the quote request / opinion registration menu but a "Coming Soon" page appears.**
A. Some features are being activated in stages. They will be available soon, please wait a moment.

---

## Contact

For inquiries not covered in this manual or urgent AS, please contact the following.

- **Tellustech Vietnam** — Phone / Email (refer to representative's business card)
- **Vietrental** — Phone / Email (refer to representative's business card)
- **Emergency AS Hotline** — (refer to representative's business card)

> For accurate contact information, refer to the representative's business card or the first page of the contract. If the document is delivered through a suspicious channel, be sure to confirm directly with the representative before use.

---

# 16. Download / Upload Guide (KH)

This section organizes files / documents that **users can directly download or upload from the customer portal**. Bulk uploads in the internal ERP are separate (refer to administrator manual).

## 16.1 Usage Confirmation PDF Download

📍 **Path**: "My Usage Confirmation" menu → "📄 PDF" button on the row.

⚠️ Downloadable only after the administrator generates the PDF. Not yet generated in "⬜ Collected" status — the PDF is created within a few days after your confirmation in "🟡 Notified" status.

⚠️ The PDF embeds **your signature + B&W / color counter + billing amount**. Beware of loss.

💡 **Tip**: Storing each month's PDF in your company's accounting folder is convenient for receivables settlement / year-end closing.

## 16.2 Quote / Calibration Certificate Download

📍 **Path**: "My Quotes" or "Rental Equipment" → click the attached file on the row.

⚠️ Only PDFs registered by the administrator are visible. Exposed immediately after upload of the `certPdf` field of the sales line.

💡 **Tip**: Calibration certificates for submission to Vietnamese government agencies can be printed and used as PDF (electronic signature included).

## 16.3 AS Photo / File Upload

📍 **Path**: "AS Request" → new registration form → photo attachment area.

⚠️ **Mobile camera recommended**. When taken directly on the phone, auto-rotation correction and compression are applied. Uploading via another folder on PC may cause rotation misalignment.

⚠️ **Format**: JPEG / PNG / PDF. iPhone HEIC format is not supported — select "Most Compatible Format" in the phone camera settings.

⚠️ **Size**: Single file 10MB or less recommended. Larger files are not auto-compressed, so reduce on the phone before attaching.

💡 **Tip**:
- 2~3 photos of product label (S/N) + faulty area are sufficient. Technicians can prepare parts before dispatch → 1-time dispatch resolution rate ↑.
- Video files are not supported. For abnormal operation, use photos + text description.

## 16.4 Supplies Request — No Attachment

📍 "My IT Contracts" → "Supplies Request" menu.

Supplies requests only require text input. No photo / file attachments needed. Just select from the list of compatible supplies.

💡 **Tip**: Use the "Filter by Equipment" select to display only supplies suitable for your equipment. Particularly convenient when owning multiple models.

## 16.5 Menu / Screen Capture (User Direct)

The downloads provided by the ERP are only the above 3 types (PDF · Certificate · AS Photo reverse). To back up other screens (point history, rental status, etc.):

💡 **Tip**: After PWA installation, mobile "Capture" or PC browser print function → save as PDF. Sidebar / header are auto-hidden (PWA print mode).

## 16.6 Security Notice

⚠️ **Only data of your client can be downloaded for PDF / photo files**. Access to other clients' data is rejected with 401/403.

⚠️ **After portal password change**, PDF download links remain valid (URL-based authentication X — session cookie based).

⚠️ **When sharing photos externally**, S/N · asset codes may be visible. Be careful about exposing company asset information.

💡 **Tip**: If theft is suspected, immediately "Change Password" → all existing sessions automatically expire.

---

# 17. "My Requests" Detail Page (NEW)

Click the **ticket number** or **content** column in the "My Requests" table to navigate to the detail page.

## 17.1 Display Information

- Header: type (🛠 AS Request / 📦 Supplies Request) + ticket number
- Summary: reception date / status / assigned technician / completion date / target equipment S/N
- **AS Request**: full text of symptom — displayed in the language you entered + auto-translated to match the current screen language
- **Supplies Request**: requested item table (item code · name · quantity · note)

## 17.2 Progress Timeline

```
📥 Reception Complete    (2026-04-30 14:23)
🚚 Processing / Dispatch #1
   Technician: Khang
   Departed: 04-30 15:00
   Completed: 04-30 16:30
   Parts Used: Black Toner D330 ×1
✅ Completed    (2026-04-30 16:35)
```

- If there are multiple dispatches, sequentially displayed as #1, #2, ...
- If still processing, displayed as `⏳ Awaiting Processing`.

## 17.3 Main List — Content Preview Added

New column **Content** in the "My Requests" table:
- AS Request → 40-character symptom preview
- Supplies Request → number of items + target equipment S/N

The entire row is clickable. Same in mobile PWA.

## 17.4 Security

- Only tickets of your client (`clientId === me.clientAccount.id`) are accessible.
- Direct URL entry of another client's ticket returns 404.
