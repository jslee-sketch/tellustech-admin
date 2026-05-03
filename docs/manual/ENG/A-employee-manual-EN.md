---
title: "Tellustech ERP — User Manual"
subtitle: "For internal employees (Staff, Assistant Manager, Manager)"
author: "Tellustech IT Team"
date: "2026-04"
lang: ko
---

# Preface

> **Scope of this document**
> This document covers the usage of every module that internal employees use on a daily basis.
> For administrator-only features (permission management, accounting close, trash, audit log, compatibility mapping, in-depth statistics analysis), refer to the separate volume **B — Administrator Manual**.
> The customer portal used by client companies is covered in a separate volume **C — Customer Portal Guide**.

This ERP operates two corporate entities, **Tellustech Vina (TV)** and **Vietrental (VR)**, on a single system.
All screens support three languages — **Korean / Tiếng Việt / English** — and two themes — **Dark / Light**.

---

# Part 1. Getting Started

## 1.1 ERP Access and Login

Open the ERP URL provided to you in your browser (Chrome / Edge / Safari).

```
https://tellustech-admin-production.up.railway.app
```

> Confirm the exact domain with the IT team. The customer portal uses a different domain.

Enter the following four items on the login screen.

| Item | Example / Choice |
|---|---|
| **Company Code** | `TV` (Tellustech Vina) or `VR` (Vietrental) |
| **User ID** | (issued by IT team) |
| **Password** | (issued by IT team) |
| **Language** | Tiếng Việt / Korean / English |

> **The company code is fixed for the entire session.** To view data from another company, log out and log in again, or — if you have permission — switch via the company picker in the sidebar (§1.4).

## 1.2 What to Do After Your First Login

1. **Change your password** — Replace the temporary password issued by the IT team immediately with a value you can remember.
2. **Verify your own information** — In the `Employee (👤)` menu, check whether your card is registered under your department/entity. If it is missing, ask the HR contact to register it.
3. **Choose language and theme** — Click one of the three flags at the top of the sidebar to set the display language, and use the ☀ / 🌙 button at the bottom of the sidebar to set the theme. Both settings are saved per user.

## 1.3 Switching Languages and Dark Mode

- **Language**: Three round SVG flags at the top of the sidebar (🇻🇳 / 🇺🇸 / 🇰🇷). The active language is highlighted with a glowing border. Clicking immediately reloads the page and updates menus, labels, and messages.
- **Dark / Light Mode**: `☀ Light` / `🌙 Dark` toggle at the bottom of the sidebar. The default is dark. The selection is stored in the browser (`localStorage`) and persists across sessions.

> For free-text inputs (AS symptoms, evaluations, incidents, etc.), enter text in just one language and the system will automatically translate it into the other two languages for storage (see Appendix C of Volume A).

## 1.4 Screen Layout (Sidebar / Main)

The screen is divided into a left **sidebar** and a right **main area**.

### Sidebar — From Top

1. **Logo / collapse toggle** — `TTS` logo + `‹ / ›` button. In collapsed mode, only icons are shown.
2. **Language selector** — Three round SVG flags (VI / EN / KO).
3. **Company picker** — Visible only to users with two or more `allowedCompanies`. Clicking one of `TV` / `VR` / `ALL` (consolidated view) reloads the page and filters all screens to the chosen company's data.
4. **🏠 Home** — Dashboard.
5. **Module groups (10)** — Each group header is separated by a small orange bar + group name. Module menu items are nested inside each group.
   - Master / Sales / Rental / AS / Inventory / HR / Finance / Meetings / Calendar / Messaging
   - Users with administrator privileges see one additional **Admin** group (audit log, permissions, compatibility mapping, accounting close, trash, **portal points, portal banners, quote requests, customer feedback, portal posts, surveys, vendor recommendations**, statistics).
6. **Theme toggle** — ☀ / 🌙 at the bottom.

> **Permission masking**: Modules whose permission level is `HIDDEN` are automatically hidden from the sidebar. The number of menu items visible can differ from one user to another even on the same screen.

### Main Area

- **Top**: Page header (breadcrumb + title), and action buttons such as `[New]` / `[Save]` in the top-right corner.
- **Body**: Search bar, filters, data table, or input form.
- **Data table**: Sort by column header; the search bar filters within the company scope.

---

# Part 2. Master Module

The Master module registers shared reference data used across modules. The **shared masters** (clients, items, warehouses) have no company code, so both entities reference the same data; everything else (employees, departments, projects, schedules, licenses) is stored separately per company.

## 2.1 Clients (`/master/clients`)

Register every company you do business with. **Shared master** — TV / VR see the same clients.

### Registration — Effect of Each Input

`[New]` button → enter the following fields.

| Field | **What this value does in the system** |
|---|---|
| **Client Code** | Auto-generated `CL-YYMMDD-###` (read-only). Foreign key for every module |
| **Company Name (VI/EN/KO)** | When you enter one language, at save time the Claude API automatically translates into the other two → fills all three columns `companyNameVi/En/Ko` |
| **Tax Code (Mã số thuế)** | `taxCode` (Vietnamese business registration number). Key for tax invoice issuance |
| **Address / phone / email / contact person** | Free-form input. Used for AS notifications and dispatch auto-recommendations |
| **Payment Terms (paymentTerms)** | Number of days (e.g., 30). When sales are registered, the receivable due date = sales date + this value. Defaults to 30 days if blank |
| **Receivable Status** | `NORMAL` / `WARNING` / `BLOCKED` — automatically computed (Finance module); only administrators can change it manually |

### Search / Auto-complete Combobox

In every screen that selects a client (Sales, Purchases, Rental, AS, etc.), an **auto-search combobox** is used (partial match on `clientCode` or company name). If a client is not visible in the dropdown, the `+ Register Client` link lets you immediately register one in a new tab.

### Receivable Status Badges

- 🟢 `NORMAL` — Normal.
- 🟡 `WARNING` — Receivable threshold exceeded — warns only on new transactions.
- 🔴 `BLOCKED` — New sales / AS intake is automatically blocked. Released by the Finance representative after payment is confirmed.

## 2.2 Items (`/master/items`)

Register every item you sell, rent, or consume. **Shared master**.

### Item Types

| Code | Meaning | Use |
|---|---|---|
| `PRODUCT` | Main product / finished good | Target of sales / rental (e.g., printers, instruments) |
| `CONSUMABLE` | Consumable | Items shipped regularly (e.g., toner, ink) |
| `PART` | Part | Replacement during AS / calibration (e.g., drum unit) |

### Registration — Effect of Each Input

| Field | **What this value does in the system** |
|---|---|
| **Item Code** | Auto-generated `ITM-YYMMDD-###` (read-only). Foreign key for all inventory / sales / purchase lines |
| **Item Name (English only)** | `Item.name`. **English only allowed** (compatible with Vietnamese label / QR system). Non-English input is rejected with `english_only` |
| **Unit (unit)** | `EA`, `BOX`, `LIT`, etc. (free-form) |
| **Category (category)** | Free-form text used for classification. Used as a search key |
| **Type (itemType)** | `PRODUCT` / `CONSUMABLE` / `PART` — basis for compatibility mapping, automatic part sorting in dispatch, and statistics separation |

### Compatibility Mapping

The compatibility relationship between `PRODUCT` and `CONSUMABLE` / `PART` is registered on a separate screen (`/admin/item-compatibility`). This mapping is used as an automatic filter on the **consumable request screen of the customer portal**. Mapping is admin-only — see Volume B, Part 6.

## 2.3 Warehouses (`/master/warehouses`)

Register storage locations for inventory. **Shared master**.

| Field | Notes |
|---|---|
| **Warehouse Code** | Free-form (e.g., `WH-HCM-01`) |
| **Warehouse Name** | Free-form |
| **Type** | `INTERNAL` (in-house) or `EXTERNAL` (customer / external storage) |

> `EXTERNAL` warehouses are shown together with **client selection** on the inventory transaction screen. Use this to track equipment that is on external lease or under inspection.

## 2.4 Employees (`/master/employees`)

HR master separated by entity.

### Registration — Effect of Each Input

| Field | **What this value does in the system** |
|---|---|
| **Company** | `Employee.companyCode` (TV/VR). Determines the employee code prefix and filters department options |
| **Department** | `departmentId`. Only departments belonging to the selected company are exposed as options (auto-reset when company changes) |
| **Employee Code** | Auto-generated — `TNV-###` (TV) / `VNV-###` (VR). **Per-company sequential number, no YYMMDD** — the same counter throughout the year |
| **Name (VI/EN/KO)** | Auto-translated into all three languages when one is entered (transliteration of names can be awkward, so direct input is recommended) |
| **Position / email / phone / hire date** | Basic information. Shown in statistics and contacts |
| **ID Card Number / Photo** | `idCardNumber/idCardPhotoUrl`. HR compliance |
| **Salary / Insurance Number** | `salary/insuranceNumber`. Referenced directly by the Payroll module (subject to permission masking) |
| **Contract Info** | `contractType/contractStart/contractEnd`. Notification when expiry is near |
| **Status (status)** | ACTIVE / ON_LEAVE / TERMINATED — basis for the active-employee option filter |

### What Happens on Save

1. **Employee code issuance** — Per-company counter +1 → e.g., `TNV-001` / `VNV-001`.
2. **Three-language name translation** (when only one name field is filled).
3. **Validation** — Company / department match (rejected if a department of another company is selected).

> **Deletion**: Employees referenced by other modules cannot be deleted (`employee_has_dependent_rows`). Change the status to `TERMINATED` instead.

## 2.5 Departments (`/master/departments`)

Register departments / branches per company.

| Field | Notes |
|---|---|
| **Department Code** | Free-form (e.g., `DEPT-SALES`) |
| **Department Name (VI/EN/KO)** | Auto-translation applied |
| **Company** | TV or VR |

To delete a department, it must first have zero employees assigned to it.

## 2.6 Projects (`/master/projects`)

Register the project unit that groups sales and purchases. Separated per company.

| Field | Notes |
|---|---|
| **Project Code** | Free-form |
| **Project Name** | Free-form |
| **Type (salesType)** | `TRADE` (commerce), `MAINTENANCE` (maintenance), `RENTAL` (rental), `CALIBRATION` (calibration), `REPAIR` (repair), `OTHER` |

> When sales are registered, sales lines belonging to a `CALIBRATION` project are automatically recognized as **calibration certificate issuance targets** — downloadable from the customer portal.

## 2.7 Schedules (`/master/schedules`) · Calendar (`/calendar`)

Register company / personal schedules and display them on the calendar.

### Schedule Registration

| Field | Notes |
|---|---|
| **Schedule Code** | Auto-generated `SCH-YYMMDD-###` |
| **Title (title)** | Required |
| **Due Date/Time (dueAt)** | Required |
| **Owner** | Selected from active employees |
| **Recurrence** | Daily / weekly / monthly pattern (optional) |

### Calendar

Switch among month, week, and day views. Click a schedule card to view details. With CFM (confirmed) status, schedules can be linked to external modules such as meeting minutes and contracts.

## 2.8 Licenses (`/master/licenses`)

Manage expirations of software, certifications, and certificates.

| Field | Required |
|---|---|
| **Name (name)** | ✓ |
| **Acquired At (acquiredAt)** | ✓ |
| **Expires At (expiresAt)** | ✓ |
| **Assigned To** | Employee or asset (SN) |
| **Memo** | Free-form |

Items nearing expiration are surfaced as dashboard notifications.

> **Compatibility mapping** (`/admin/item-compatibility`) is admin-only. Refer to **Volume B — Part 6**.

---

# Part 3. Sales (Sales / Purchases)

Sales and purchases share the same structure. The only differences are the **counterparty (client / supplier)** and the **direction of inventory flow (out / in)**.

## 3.1 Sales (`/sales`)

### New Registration Flow

`[+ New]` button → enter `/sales/new`.

### Effect of Each Input on Data

| Input | Source / Format | **What this value does in the system** |
|---|---|---|
| **Client** | ClientCombobox | Saves `Sales.clientId` → automatically computes the receivable due date based on `paymentTerms`. Clients with `BLOCKED` status are rejected with `client_blocked` (admin override required) |
| **Project** | Select (company-scoped) | Saves `Sales.projectId`. The project's `salesType` branches the form and line processing |
| **Sales Owner** | Select Employee (optional) | Saves `Sales.salesEmployeeId`. Aggregated in the "Sales Owner Performance" statistics screen |
| **Usage Period (header)** | Two date fields (required for `MAINTENANCE`/`RENTAL`) | Saves `Sales.usagePeriodStart/End` and is auto-copied to lines that have empty periods |
| **Warehouse** | Select (required for `TRADE`) | Saves `Sales.warehouseId`. **Only when TRADE** does each line auto-generate an inventory OUT transaction |
| **Currency** | VND/USD/KRW/JPY/CNY | Saves `Sales.currency`. Exchange rate input is required for any currency other than VND |
| **FX Rate** | Number (auto 1.0 for VND) | Saves `Sales.fxRate`. Used for VND conversion in statistics and receivable summation |
| **Item (line)** | ItemCombobox | `SalesItem.itemId`. One line = one item |
| **S/N (line)** | SerialCombobox | `SalesItem.serialNumber`. **Three validations when TRADE**: ① if the last transaction was OUT, rejected with `serial_already_sold` ② if the SN is registered on an active IT/TM contract, rejected with `serial_in_active_contract` ③ only if both pass is an OUT transaction generated |
| **Quantity (line)** | Positive number | `SalesItem.quantity`. Line total = quantity × unit price |
| **Unit Price (line)** | ≥ 0 | `SalesItem.unitPrice` |
| **Start/End date (line)** | Date (when `MAINTENANCE`/`RENTAL`) | `SalesItem.startDate/endDate`. Auto-copied from the header period if blank |
| **Memo** | Free text | `Sales.note` |

### `salesType` Branches at a Glance

| salesType | Usage Period | Warehouse | Extra Items | Notes |
|---|:-:|:-:|---|---|
| `TRADE` (commerce) | – | ✓ | – | General sales — outbound shipment |
| `MAINTENANCE` (maintenance) | ✓ | – | – | Period required, inventory not deducted |
| `RENTAL` (rental) | ✓ | – | – | Typically managed separately in TM/IT modules |
| `CALIBRATION` (calibration) | – | – | Cert number / issued date / PDF | Lines are **eligible for customer portal download** |
| `REPAIR` (repair) | – | – | – | One-off repair sales separate from AS |
| `OTHER` | – | – | – | Sales that don't fit the above |

### Auto Number and Payment Terms

On save, the sales number is auto-issued in the format `SLS-YYMMDD-###`. The client master's payment terms (e.g., 30 days) are shown in the header guidance and are the basis for receivable / due-date calculations.

### Total Display

Line totals are accumulated by currency and shown at the bottom-right of the screen. For non-VND currencies, the **VND-converted value** (multiplied by FX rate) is shown alongside.

### Sales List — Yield Column (NEW)

The last column of the `/sales` sales list shows a **yield badge**.

- Display format: `B/W 🟢 90%  C 🟢 90%` (B/W = black-and-white, C = color)
- **Shown only for RENTAL project sales** — TRADE/MAINTENANCE/CALIBRATION etc. show "—"
- Based on the **most concerning** (lowest yield) value among the IT contract devices of the same client
- Click to navigate to `/admin/yield-analysis` for details
- Two badges appear **not as a bug** but to show the black-and-white and color yields simultaneously

### What Happens in a Single Transaction on Save

When you click "Register Sales", all of the following execute as a single DB transaction (everything rolls back on failure).

1. **Sales number issuance** — `SLS-YYMMDD-###` (that day's sequential number + 1).
2. **`Sales` row creation** — Header information + `totalAmount` (line total).
3. **`SalesItem` line creation** — Bulk INSERT for each line.
4. **Auto-generated inventory OUT** (only when TRADE + warehouseId is present) — Each line auto-INSERTs `InventoryTransaction(txnType=OUT, fromWarehouseId=selected warehouse, reason=SALE)`.
5. **Auto-generated receivable** — `PayableReceivable(kind=RECEIVABLE, status=OPEN, amount=totalAmount, dueDate=today + paymentTerms)`. Defaults to 30 days if the client has no payment terms.
6. **Recompute client receivableStatus** — Automatically transitions to `WARNING` / `BLOCKED` when accumulated receivable exceeds the threshold.
7. **Four or more audit log entries** — Sales · SalesItem(N) · InventoryTransaction(N) · PayableReceivable INSERTs are all recorded.

## 3.2 Purchases (`/purchases`)

Same form structure as sales; only the label changes from **Client → Supplier**.

### Effect of Each Input on Data — Differences from Sales

| Input | **What this value does in the system** |
|---|---|
| **Supplier** | `Purchase.supplierId` (instead of Sales' `clientId`) → computes the **payable due date** from payment terms |
| **Warehouse (when TRADE)** | Auto-generates an inventory **IN** transaction per line (Sales generates OUT) |
| **Everything else** | Same as Sales — project / period / currency / FX rate / item lines / memo |

- Auto number: `PUR-YYMMDD-###`
- Branch rules for usage period and warehouse are the same as Sales.

### What Happens on Save — Differences from Sales

| Step | Sales | Purchase |
|---|---|---|
| **Inventory transaction** | OUT (outbound, reason=SALE) | IN (inbound, reason=PURCHASE) |
| **Auto-generated PR** | `RECEIVABLE` (receivable) | `PAYABLE` (payable) |
| **Counterparty status recomputed** | `Client.receivableStatus` | (not applied to suppliers) |

> Purchases that include a usage period (`MAINTENANCE` / `RENTAL`) are eligible for **automatic cost allocation (allocations)** — costs are spread across months equal to the line period.

## 3.3 Auto-search Combobox — Client / Item / S/N

Across all input screens (including Sales and Purchases), the client / item / S/N fields are **server-side search auto-complete comboboxes**.

| Combobox | Search Key | API |
|---|---|---|
| **Client** | Partial match on `clientCode` or company name | `/api/master/clients?q=` |
| **Item** | Partial match on `itemCode` or item name | `/api/master/items?q=` |
| **S/N** | Partial match on `serialNumber` (auto company-scoped) | `/api/inventory/sn/search?q=` |

### Tips

- The server is queried 220 ms after input — instantly responsive even with thousands of records.
- The S/N combobox accepts free input. SNs not in inventory (external equipment, customer-supplied items) can be entered as-is.
- If the desired entry is not in the dropdown, register it in a new tab and search again (use the `+ Register` link at the bottom of the client / item combobox).

## 3.4 Adjustments (Adjustments)

When a return / exchange / unit-price adjustment is needed after a sale or purchase has been registered, use the **Adjustments** tab on the detail screen.

| Type | Meaning | Inventory Effect |
|---|---|---|
| `RETURN` | Return | Inbound processing per line S/N |
| `EXCHANGE` | Exchange | Reclaim one line and ship out a different SN |
| `PRICE_ADJUST` | Unit-price adjustment | No inventory effect, only the settlement amount changes |

> **Policy**: 1 item line = 1 S/N = quantity 1. To handle multiple SNs at once, add more lines.

Each adjustment is auto-issued an `adjustCode` and is subject to the accounting close (lock) policy — adjustments to sales in a locked month are blocked (Volume B, Part 3).

---

# Part 4. Rental

The ERP separates rental into two modules.

| Module | Target | Auto Number | Billing Unit |
|---|---|---|---|
| **IT Contracts** (`/rental/it-contracts`) | IT equipment such as printers / multi-function devices | `TLS-YYMMDD-###` (TV) / `VRT-YYMMDD-###` (VR) | Monthly fixed fee + counter usage |
| **TM Rental** (`/rental/tm-rentals`) | One-off / short-term rentals such as instruments | `TM-YYMMDD-###` | Daily / monthly unit price |

## 4.1 IT Contracts (`/rental/it-contracts`)

### New Contract Registration

### Effect of Each Input on Data

| Input | **What this value does in the system** |
|---|---|
| **Client** (ClientCombobox, required) | `ItContract.clientId`. Saved after existence validation. Company separation is determined by the **session company code**, not by the client |
| **Installation Address** | `ItContract.installationAddress` (free-form). Used for dispatch origin auto-recommendation |
| **Start / End Date** | Both `startDate/endDate` are required. Rejected if `endDate < startDate` |
| **Deposit / Installation Fee / Delivery Fee / Additional Service Fee** | Four columns: `deposit/installationFee/deliveryFee/additionalServiceFee`. Shown as separate lines on the billing screen |
| **Currency** | VND/USD/KRW/JPY/CNY → `currency` |
| **FX Rate** | `fxRate` (6 decimal places). Conversion basis when not VND |
| **Three contacts: Contract / Technical / Finance** | 12 columns of name / phone / extension / email. Client-side contacts. Used for AS auto-notifications |

### What Happens on Save

1. **Company prefix decision** — Session `companyCode` TV → `TLS-`, VR → `VRT-`.
2. **Contract number issuance** — `TLS-YYMMDD-###` or `VRT-YYMMDD-###`.
3. **`ItContract` row creation** — Status `DRAFT` (DRAFT is safe for adding equipment — free to add / remove).
4. **Navigate to detail page** — Equipment registration / billing tabs become available.

### Company Separation Policy (When Viewing)

- Regular users: only the prefix of their session company is visible (`TLS-` or `VRT-`).
- ADMIN/MANAGER: both companies are visible. Explicit filtering via `?company=TV|VR` is possible.

### Equipment Registration (Prerequisite for DRAFT → ACTIVE)

Use the `[+ Add Equipment]` button on the detail page — effect of each input:

| Input | **What this value does in the system** |
|---|---|
| **S/N** (SerialCombobox, required) | `ItContractEquipment.serialNumber`. **STRICT policy**: only SNs present in in-house inventory (`InventoryItem`) are allowed → blocks IT contract registration of external equipment |
| **Item** (ItemCombobox, required) | `itemId`. Key for compatibility mapping (`ItemCompatibility`) — the registered item must have compatible consumables mapped to it before a customer-portal consumable request is possible |
| **Monthly Base Fee (monthlyBaseFee)** | Base monthly fee shown on the billing screen. May differ per SN |
| **Counter (B/W / Color)** | Initial counter (usually 0 or the inspection value). Used as the difference for usage in the next billing cycle |
| **Installed At (installedAt)** | Auto = registration time. Editable |

### What Happens on Equipment Registration

1. **`ItContractEquipment` row creation** — `removedAt = null` (active).
2. **Auto inventory OUT transaction** — that SN is deducted from inventory (`reason=RENTAL`).
3. **SN search auto-match** — Immediately reflected in the active-contract auto-detection on the inventory transaction screen.
4. **Customer portal "My IT Contracts" updated** — Equipment count immediately +1.

### Equipment Table — Yield Card (NEW)

The following columns are added to the equipment list table.

| Column | Description |
|---|---|
| **Actual Coverage (%)** | Inline input (1–100). Default 5. Adjust to 10–15% etc. for customers who print many photos / graphics. Saved immediately on change (PATCH) |
| **Yield** | Last calculation result — format `B/W 🟢 90% · C 🟢 90%`. Shows "Recalculate" guidance if not yet calculated |
| Action | 📊 (single-equipment 6-month recalculation) / Edit / Delete |

The 📊 button immediately calls `/api/yield-analysis/calculate` to recalculate a single piece of equipment over a 6-month period and reflects the result in the cell. Since the auto cron computes everything on the 1st of the month at 02:00 KST, manual recalculation is rarely needed under normal operation.

> The full description of the yield system is in **Volume B, Part 13**.

### Status Flow

```
DRAFT → ACTIVE → COMPLETED / CANCELED
```

- `DRAFT` — Equipment can be freely added / removed.
- `ACTIVE` — Equipment changes are only possible via **Amendments** (preserves history).
- `COMPLETED` — Contract ended. All equipment recovered.
- `CANCELED` — Early termination.

### Monthly Billing — Effect of Each Input

In the **Billing** tab on the detail page, click `[+ Add Billing]`:

| Input | **What this value does in the system** |
|---|---|
| **Equipment SN** (Select — only SNs registered to that contract) | `ItMonthlyBilling.serialNumber` (matched to an equipment line) |
| **Billing Month** (`YYYY-MM`) | `billingMonth`. Duplicate registration of the same SN+month is blocked |
| **B/W / Color Counter** | `counterBw/counterColor`. Usage is computed from the difference with the previous month's counter |
| **Billing Method (billingMethod)** | `COUNTER` (usage) / `FIXED` (monthly flat) — formula branches |

### What Happens on Billing Registration

1. **`ItMonthlyBilling` row creation** — Usage auto-computed → fills `computedAmount`.
2. **Customer portal "Usage Confirmation" screen immediately updated** — That row is visible to the corresponding client.
3. **Awaiting customer signature** — `customerSignature = null`. Receivable is auto-generated upon confirmation (see Volume C, 5.5).

## 4.2 TM Rental (`/rental/tm-rentals`)

### New Registration — Effect of Each Input

| Input | **What this value does in the system** |
|---|---|
| **Client** (ClientCombobox, required) | `TmRental.clientId` |
| **Rental Period (header)** | `startDate/endDate`. Auto-copied to lines with empty periods |
| **Equipment line — S/N** (SerialCombobox) | `TmRentalItem.serialNumber`. **LOOSE policy** — registration is allowed even when the SN is not in in-house inventory (allows externally-leased equipment, warning only) |
| **Equipment line — Item** | `TmRentalItem.itemId` |
| **Equipment line — daily / monthly unit price** | `TmRentalItem.salesPrice`. Basis for billing computation |
| **Equipment line — start / end date** | Per-line period. Must fall within the header period |
| **Currency / FX Rate** | `currency/fxRate`. Same as Sales |

Auto number `TM-YYMMDD-###` is issued.

### What Happens on Save

1. **`TmRental` + `TmRentalItem` bulk creation** — Single transaction.
2. **Auto inventory OUT** — Only when the SN is in in-house inventory (LOOSE — external SNs do not generate a transaction, only tracked).
3. **Customer portal "My IT Contracts" card** — Exposed (TM also shown together).
4. **Immediately reflected in active SN search** — Included in the onBlur auto-detection on the inventory transaction screen.

### Billing

Per-line: (end date − start date) × unit price. If a partial recovery occurs within the header period, shorten the line's end date via **Amendments** (next section).

## 4.3 Equipment Registration / Replacement / Recovery — Amendments

Used to change equipment on `ACTIVE` contracts / rentals. Two paths exist: **manual entry** and the **inventory transaction auto-trigger**.

### Manual Amendment — Effect of Each Input

Detail page → **Amendments** tab → `[+ New Amendment]`:

| Input | **What this value does in the system** |
|---|---|
| **Type (type)** | `ADD_EQUIPMENT` / `REMOVE_EQUIPMENT` / `REPLACE_EQUIPMENT` / `FEE_CHANGE` — determines line action |
| **Source (source)** | `MANUAL` (manual) / `INVENTORY_TXN` (auto from inventory transaction) — for tracking |
| **Effective Date (effectiveDate)** | Date the change applies. Branch point for billing computation |
| **Warehouse (warehouseId)** | Inbound warehouse for recovery / replacement |
| **Line — action** | `ADD` / `REMOVE` / `REPLACE_OUT` / `REPLACE_IN` — REPLACE produces two lines (OUT+IN) within a single Amendment |
| **Line — S/N + itemId** | Identifies the target equipment |
| **Line — monthlyBaseFee/salesPrice** | New unit price for REPLACE_IN or FEE_CHANGE |

### What Happens on Amendment Save

1. **`Amendment` + `AmendmentItem` row creation**.
2. **Equipment master updated** — On REMOVE, `removedAt = effectiveDate`; on ADD/REPLACE_IN, a new equipment row is created.
3. **Auto inventory transactions** — IN/OUT auto-generated (only if the warehouse is specified).
4. **History preserved** — Amendments themselves are never deleted (for audit purposes).

### Inventory Transaction Auto-Trigger

On `/inventory/transactions/new`, after entering an S/N then onBlur → the system immediately queries for active IT/TM contracts of that S/N. If a contract is found, a modal opens asking you to choose one of three intents.

| Intent | Result |
|---|---|
| **Recover (RECOVER)** | Auto-generates a `REMOVE_EQUIPMENT` Amendment |
| **Replace (REPLACE)** | After entering the new SN → auto-generates a `REPLACE_EQUIPMENT` Amendment |
| **Normal Move (NORMAL)** | No Amendment generated; treated as a simple inventory transaction |

Thanks to this trigger, contract history is automatically updated even when only inventory transactions are processed in the field.

## 4.4 Billing / Settlement

- **IT Contracts**: Register monthly billing → user confirms via the customer portal (✍️ signature) → receivable auto-generated (Finance module).
- **TM Rental**: Auto-computed from header / line periods → optional auto-generation of sales on settlement date.

For clients in receivable-stop (`BLOCKED`) status, new billing is still issued, but new sales / AS intake are blocked.

---

# Part 5. AS (After-Sales Service)

The AS module is composed of two stages: **tickets** (intake) and **dispatches** (on-site visits).

| Module | Path | Role |
|---|---|---|
| AS Ticket | `/as/tickets` | Customer request intake / symptom recording |
| AS Dispatch | `/as/dispatches` | Dispatch schedule / parts use / signature |

Auto intake number: `YY/MM/DD-##` (e.g., `26/04/27-01`).

## 5.1 Ticket Intake (`/as/tickets`)

### New Intake — `[+ New]` → `/as/tickets/new`

### Effect of Each Input on Data

| Input | **What this value does in the system** |
|---|---|
| **Client** (ClientCombobox, required) | Saves `AsTicket.clientId`. Clients with `BLOCKED` status block new intake itself (red warning). `WARNING` shows a yellow warning only |
| **Equipment / Item** (ItemCombobox, optional) | `AsTicket.itemId` — which item model — used for statistics and matched-part auto-recommendation |
| **S/N** (SerialCombobox, optional) | `AsTicket.serialNumber` — **LOOSE policy**: input is allowed even when not in in-house inventory (external equipment). When a dispatch is created, this SN is automatically propagated as the "target equipment SN" |
| **AS Owner** (Employee Select, optional) | `AsTicket.assignedToId`. If blank, status remains `RECEIVED` and shows as unassigned |
| **Original Language** (VI/KO/EN) | Saves `AsTicket.originalLang`. The language to treat as the original during auto-translation |
| **Symptoms (VI/KO/EN)** ≥ 1 of 3 fields | Filling only one field → on save, the other two languages are auto-translated → all three columns `symptomVi/En/Ko` are filled. Saving with all fields blank yields `invalid_input` |
| **Photos** (multiple upload) | Files first uploaded to `/api/files` (category=`PHOTO`) to issue a fileId → linked to the ticket as a `photoIds` array |

### What Happens on Save

1. **Ticket number issuance** — `YY/MM/DD-NN` (that day's sequential number + 1).
2. **`AsTicket` row creation** — Status `RECEIVED`, `kind = AS_REQUEST`, intake timestamp auto-set.
3. **Three-language translation stored** — Claude API auto-fills the two language fields not entered.
4. **Internal notification** — If unassigned, notifies the entire AS team; if assigned, notifies that employee.
5. **Customer notification** — Immediately appears in the "My Requests" table on the customer portal.

### 4-Step Workflow

```
RECEIVED → IN_PROGRESS → DISPATCHED → COMPLETED
                                     └→ CANCELED (can be canceled from anywhere)
```

| Status | Meaning | Change Trigger |
|---|---|---|
| `RECEIVED` | Received, awaiting owner assignment | Auto (on new registration) |
| `IN_PROGRESS` | Owner assigned / under review | Manual change or auto on dispatch creation |
| `DISPATCHED` | On-site dispatch registered | Auto on dispatch creation |
| `COMPLETED` | Work completed, awaiting customer confirmation | Dispatch completion + signature |
| `CANCELED` | Canceled (history preserved) | Manual |

### Ticket Search

Status filter (dropdown) at the top of the list screen + search bar (intake number / client / SN). Auto-filtered within the company scope.

## 5.2 Dispatches (`/as/dispatches`)

This screen records the actual on-site visit for a ticket.

### Dispatch Creation — `[+ Register Dispatch]` button on the ticket detail

### Effect of Each Input on Data

| Input | **What this value does in the system** |
|---|---|
| **Dispatch Employee** | `AsDispatch.dispatchEmployeeId`. Aggregated in statistics / KPI "Cases Handled per Owner" |
| **Transport Method** (free-form) | `AsDispatch.transportMethod` |
| **Origin / Destination Address** | `AsDispatch.originAddress/destinationAddress`. **When both addresses are filled**, the server automatically calls the Google Distance Matrix API to compute distance (km) automatically |
| **Meter Photo (Taxi Meter OCR)** | `meterPhotoUrl`. OCR extracts km → `meterOcrKm`. Compared with the Google distance to auto-determine `distanceMatch` (true/false) → verifies transport-cost settlement |
| **Transport Cost** | `AsDispatch.transportCost`. Added to total dispatch cost |
| **Receipt File** | `receiptFileId`. Accounting evidence |
| **Departure / Arrival / Completion Times** | `departedAt/arrivedAt/completedAt`. SLA computation |
| **Target Equipment SN** | Explicit value preferred; if blank, the **ticket's SN is auto-propagated**. Used as the default when registering parts |
| **Memo** | `AsDispatch.note` (free-form) |

### What Happens on Save

1. **`AsDispatch` row creation** — Above input values + auto-computed distance result.
2. **Ticket status auto-transition** — If the ticket was `RECEIVED` / `IN_PROGRESS` → `DISPATCHED`. (If already `COMPLETED`/`CANCELED`, rejected with `ticket_not_dispatchable`.)
3. **Parts use can be registered** — Parts can be added on the dispatch detail page (next section).

### Parts / Consumable Use Registration

The **Parts** section on the dispatch detail page — effect of each input:

| Input | **What this value does in the system** |
|---|---|
| **Target Equipment SN** (required) | `AsPart.targetEquipmentSN` — tracks which equipment received the part. Key for "Cumulative Part Cost per SN" statistics |
| **Outbound Warehouse** (required) | Source of the part — `InventoryTransaction.fromWarehouseId` to be auto-generated |
| **Item** (ItemCombobox) | `AsPart.itemId`. PART/CONSUMABLE prioritized in sort order |
| **Part S/N** (optional) | `AsPart.serialNumber`. Only when the part itself has an SN |
| **Quantity** | `AsPart.quantity`. Positive integer recommended |
| **Memo** | `AsPart.note` (free-form) |

### What "Add Part" Does in a Single Transaction

1. **`AsPart` row creation** — One line.
2. **Item unit price auto-lookup** → `AsPart.unitCost` (based on inventory average price).
3. **Total computed** → `AsPart.totalCost` = unit price × quantity.
4. **Auto inventory OUT** — `InventoryTransaction(txnType=OUT, reason=CONSUMABLE_OUT, fromWarehouseId=outbound warehouse, targetEquipmentSN=target SN)`.
5. **Reject if insufficient stock** — `insufficient_stock` error → screen shows "Insufficient Stock — Details".
6. **Total dispatch cost updated** — The "Total Part Cost" on the dispatch header is immediately recomputed.

### Cost Totals

| Item | Sum |
|---|---|
| **Part Cost** | Line total |
| **Transport Cost** | Header value |
| **Total Dispatch Cost** | Part cost + transport cost |

### Completion / Signature

When marking as completed (`COMPLETED`), a finger signature is taken on mobile (customer confirmation in the field). Once the signature is saved, the ticket status becomes `COMPLETED`, and the **Confirm** button on the customer portal "My Requests" becomes active.

## 5.3 Photos and Attachments

Both tickets and dispatches accept photo attachments. The maximum size per file follows the system setting (typically 10MB). Uploaded photos are downloaded via `/api/files/{id}`.

## 5.4 BLOCKED Policy

When a client is in `BLOCKED` status, new ticket creation itself is blocked. It is automatically released after payment is confirmed, or manually released by a Finance representative (Volume B, Part 8).

---

# Part 6. Inventory (Full Rewrite)

The Inventory module consists of 4 screens.

| Screen | Path | Purpose |
|---|---|---|
| **Stock Status** | `/inventory/stock` | On-hand quantity per item/warehouse + S/N¹-level details |
| **Transaction Entry** | `/inventory/transactions/new` | All scenarios for IN / OUT / TRANSFER |
| **QR Scan** | `/inventory/scan` | Accumulate multiple S/Ns by camera, then bulk register |
| **QR Label Print** | `/inventory/labels` | NIIMBOT B21² 50×70mm portrait labels |

> ¹ S/N = Serial Number. A unique code identifying a single asset (e.g., `TONER-BK-1777080756243-1`).
> ² NIIMBOT B21 = 50mm-wide thermal label printer. Prints identically from both PC and mobile.

## 6.1 Stock Status (`/inventory/stock`)

### Two Tabs

| Tab | Meaning |
|---|---|
| **Real-time Status** | Item × warehouse matrix. Instant `onHand` totals |
| **S/N Detail** | S/N list that expands when clicking a group row. Multi-select via checkboxes → header `🏷 Print Labels (N items)` |

### S/N Master Status (`InventoryStatus`)

| Status | Meaning | Action |
|---|---|---|
| `NORMAL` | Normal — ready for immediate dispatch | Use as-is |
| `NEEDS_REPAIR` | Repair required | Send out via OUT/REPAIR/REQUEST |
| `PARTS_USED` | Parts have been used | After SPLIT, archive the remaining body |
| `IRREPARABLE` | To be scrapped | OUT/TRADE/OTHER (disposal) |

### External Asset Indicator

To the right of an S/N, a `🏷 External Asset` badge (warning color) plus the owner client label appears automatically. These are assets with `ownerType=EXTERNAL_CLIENT` (customer repair items, outsourced demo units, etc.).

---

## 6.2 Transaction Entry — Case-by-Case Complete Guide (`/inventory/transactions/new`)

### Core Concept — 4-Axis Truth Table³

Every transaction is determined by the combination of **4 axes**:

```
( txnType  ×  referenceModule  ×  subKind  ×  ownerType ) → processing rule
   ↑              ↑                  ↑           ↑
  IN/OUT/      RENTAL·REPAIR·     REQUEST·    COMPANY/
  TRANSFER     CALIB·DEMO·        RETURN·     EXTERNAL_
               TRADE·CONSUMABLE   PURCHASE·   CLIENT
                                  SALE·BORROW·
                                  LEND·OTHER·
                                  CONSUMABLE·
                                  LOSS·SPLIT·ASSEMBLE
```

> ³ Truth table = the `BASE_RULES` object in `src/lib/inventory-rules.ts`. Currently 30+ rows defined. Users do not enter the 4 axes directly; instead, picking a **scenario combo** (below) automatically determines all 4 axes.

### Step 1 — Select Transaction Type (`txnType`)

The selector at the top of the screen.

| Type | Meaning | Subsequent Inputs |
|---|---|---|
| **IN (Inbound)** | Coming into our warehouse | `toWarehouseId` required. If external asset, also `clientId` |
| **OUT (Outbound)** | Leaving our warehouse | `fromWarehouseId` + `clientId` required |
| **TRANSFER (Move)** | Location change only (in-house ↔ in-house, or external ↔ external) | Mode auto-branches (see section 1.5) |

### Step 2 — Select Scenario Combo

Once a transaction type is chosen, only the **N combos available for that type** appear in the second selector.

#### IN Combos (11 total)

| Label (KO) | Truth Table Key | masterAction⁴ | Auto PR⁵ | Notes |
|---|---|---|---|---|
| Rental/Inbound/End — Recover own rental | `IN\|RENTAL\|RETURN\|COMPANY` | MOVE | — | Own asset that was outside is returned |
| Rental/Inbound/Purchase — Borrow from outside | `IN\|RENTAL\|BORROW\|EXTERNAL_CLIENT` | NEW | Purchase candidate | Register a new external asset |
| Repair/Inbound/Request — Customer repair request | `IN\|REPAIR\|REQUEST\|EXTERNAL_CLIENT` | NEW | — | Customer asset received |
| Repair/Inbound/Purchase — Recover after external repair | `IN\|REPAIR\|RETURN\|*` | MOVE | (Own) Purchase candidate | Both own and customer assets allowed |
| Calibration/Inbound/Request — Customer calibration request | `IN\|CALIB\|REQUEST\|EXTERNAL_CLIENT` | NEW | — | 〃 |
| Calibration/Inbound/Purchase — Recover after external calibration | `IN\|CALIB\|RETURN\|*` | MOVE | (Own) Purchase candidate | 〃 |
| Demo/Inbound/Request — Borrow from outside | `IN\|DEMO\|BORROW\|EXTERNAL_CLIENT` | NEW | — | External demo unit received |
| Demo/Inbound/End — Recover own demo unit | `IN\|DEMO\|RETURN\|COMPANY` | MOVE | — | Own demo unit returns |
| Purchase — New own asset | `IN\|TRADE\|PURCHASE\|COMPANY` | NEW | — | Auto-invoked from the Purchase module |
| Stock Adjustment — Found (added in stocktake) | `IN\|TRADE\|OTHER\|COMPANY` | NEW | — | Physical item not on the books found during stocktake |
| Assembly — New body (parts go out separately) | `IN\|TRADE\|ASSEMBLE\|COMPANY` | NEW | — | N parts → 1 body merged |

> ⁴ **masterAction**: The action applied to the InventoryItem master.
>   - `NEW`: INSERT a new master record
>   - `MOVE`: Update warehouseId (change in-house warehouse)
>   - `ARCHIVE`: Stamp archivedAt (deactivate)
>   - `TRANSFER_LOC`: Update currentLocationClientId (mark as externally entrusted)
>   - `NONE`: Master unchanged

> ⁵ **Auto PR** (PayableReceivable) = Purchase/Sales candidate. Auto-created as DRAFT (amount=0); the finance team confirms the amount → promoted to OPEN.

#### OUT Combos (14 total)

| Label (KO) | Truth Table Key | masterAction | Auto PR |
|---|---|---|---|
| Rental/Outbound/Return — Return to outside | `OUT\|RENTAL\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | — |
| Rental/Outbound/Sales — Own → customer | `OUT\|RENTAL\|LEND\|COMPANY` | TRANSFER_LOC | Sales candidate |
| Repair/Outbound/Request — Outsource repair | `OUT\|REPAIR\|REQUEST\|*` | TRANSFER_LOC | — |
| Repair/Outbound/Sales — Return to customer + bill repair fee | `OUT\|REPAIR\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | Sales candidate |
| Calibration/Outbound/Request — Outsource calibration | `OUT\|CALIB\|REQUEST\|*` | TRANSFER_LOC | — |
| Calibration/Outbound/Sales — Return to customer + bill calibration fee | `OUT\|CALIB\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | Sales candidate |
| Demo/Outbound/Request — Own → customer | `OUT\|DEMO\|LEND\|COMPANY` | TRANSFER_LOC | — |
| Demo/Outbound/End — Return to outside | `OUT\|DEMO\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | — |
| Sales — Own asset shipped | `OUT\|TRADE\|SALE\|COMPANY` | ARCHIVE | — (issued by Sales module) |
| Purchase Return — Return to supplier | `OUT\|TRADE\|RETURN\|COMPANY` | ARCHIVE | — |
| Disposal / Scrap | `OUT\|TRADE\|OTHER\|COMPANY` | ARCHIVE | — |
| Stock Adjustment — Loss (missing in stocktake) | `OUT\|TRADE\|LOSS\|COMPANY` | ARCHIVE | — |
| Disassembly — Archive body (parts go in separately) | `OUT\|TRADE\|SPLIT\|COMPANY` | ARCHIVE | — |
| Consumable Outbound (AS⁶ parts, etc.) | `OUT\|CONSUMABLE\|CONSUMABLE\|COMPANY` | NONE | — |

> ⁶ AS = After-Service. Post-sale services such as customer equipment repair, inspection, and consumable replacement.

#### TRANSFER Combos (5 total — auto-branched by mode)

| Label (KO) | Truth Table Key | Mode | Inputs |
|---|---|---|---|
| **Internal Stock Move** (in-house ↔ in-house) | `TRANSFER\|TRADE\|OTHER\|COMPANY` | **Internal** | both `from/toWarehouseId` |
| External ↔ External (Rental) | `TRANSFER\|RENTAL\|OTHER\|EXTERNAL_CLIENT` | **External** | both `from/toClientId` |
| External ↔ External (Repair) | `TRANSFER\|REPAIR\|OTHER\|EXTERNAL_CLIENT` | External | 〃 |
| External ↔ External (Calibration) | `TRANSFER\|CALIB\|OTHER\|EXTERNAL_CLIENT` | External | 〃 |
| External ↔ External (Demo) | `TRANSFER\|DEMO\|OTHER\|EXTERNAL_CLIENT` | External | 〃 |

### Step 3 — Input Fields Auto-Branch by Scenario

The moment you pick a combo, the **additional input area** changes automatically (both visibility and required state).

| Visible Field | IN | OUT | TRANSFER (Internal) | TRANSFER (External) |
|---|---|---|---|---|
| Destination Warehouse (`toWarehouseId`) | ✅ Required | — | ✅ Required | — |
| Origin Warehouse (`fromWarehouseId`) | — | ✅ Required | ✅ Required | — |
| Client (`clientId`) | (when external asset) | ✅ Required | — | — |
| Origin Client (`fromClientId`) | — | — | — | ✅ Required |
| Destination Client (`toClientId`) | — | — | — | ✅ Required |
| Header Note (`note`) | Optional | Optional | Optional | Optional |

### Step 4 — Line Entry (1 transaction = N lines)

Add the N items to be included in this transaction as a card-style list (up to 1,000 lines).

#### Per-Line Fields and Constraints

| Field | Meaning | Required |
|---|---|---|
| Item (`itemId`) | ItemCombobox | Always required |
| S/N (`serialNumber`) | SerialCombobox | **Varies by itemType** (see below) |
| Quantity (`quantity`) | Positive number | Always required (fixed at 1 if S/N present) |
| Target Equipment SN (`targetEquipmentSN`) | For consumable outbound: which equipment it went into | Required only when `subKind=CONSUMABLE` |
| Line Note (`note`) | Free-form | Optional |

#### S/N Requirement — by itemType

| itemType⁷ | S/N Input | Notes |
|---|---|---|
| `PRODUCT` (product) | **Required** | Body equipment — 1 unit = 1 S/N |
| `CONSUMABLE` (consumable) | **Required** | Toner cartridges, etc. — at purchase, 1 box = 1 S/N |
| `PART` (part) | **Required** | Fuser/Drum, etc. — 1 piece = 1 S/N |
| `SUPPLIES` (supplies) | Optional | A4 paper, cleaning tools, etc. — quantity only |

> ⁷ itemType is decided when registering the item (`/master/items`). SUPPLIES was added as the 4th type in 2026-05.

#### Disassembly/Assembly — Multiple Lines in One Transaction

- **Disassembly**: Line 1 = body OUT/TRADE/SPLIT (S/N required). Lines 2~N = parts IN/TRADE/OTHER (each part S/N newly registered).
- **Assembly**: Line 1 = body IN/TRADE/ASSEMBLE (new S/N). Lines 2~N = parts OUT/TRADE/OTHER.

> Recording the parent-child relationship in the transaction note makes tracking easier.

### Step 5 — What Happens on Save

```
[Save] click
  ↓
1. Header guard validation (warehouse/client existence, same-endpoint blocking, etc.)
  ↓
2. Per-line truth table lookup (BASE_RULES[txnType|refModule|subKind|ownerType])
  ↓
3. Inside a single prisma.$transaction({ timeout: 30s }):
   ① Create InventoryTransaction row
   ② Update InventoryItem per masterAction
      - NEW       → INSERT new master
      - MOVE      → change warehouseId
      - ARCHIVE   → stamp archivedAt
      - TRANSFER_LOC → change currentLocationClientId/SinceAt
   ③ autoPurchaseCandidate / autoSalesCandidate → auto-create PayableReceivable DRAFT (back-traceable via sourceInventoryTxnId)
  ↓
4. Response: { count: N }
```

---

## 6.3 QR Multi-Scan (`/inventory/scan`)

With the scanner running, scan multiple S/Ns in succession → accumulate → set the header → bulk register.

### Flow

```
[📷 Start Camera (overlay tap)]
  ↓ S/N scan (1 per second possible, 1.5s cooldown, identical SN auto-blocked)
  ↓
1 scan = call to /api/inventory/sn/{sn}/state
  ↓ Master status classification:
     NEW / OWN_IN_STOCK / OWN_AT_EXTERNAL /
     EXTERNAL_IN_STOCK / EXTERNAL_AT_VENDOR / ARCHIVED
  ↓ Recommended scenarios auto-derived (4~7 per status)
  ↓ First scan: txnType + comboKey + warehouse/client auto-prefilled
  ↓
Scanner idle → user reviews/edits scenario combo
  ↓
[Save] → bulk register via /api/inventory/transactions/bulk
```

### Recommended Scenarios by Master Status

| Status | Recommended Combos |
|---|---|
| **NEW** (not in DB) | IN/RENTAL/BORROW · IN/REPAIR/REQUEST · IN/CALIB/REQUEST · IN/DEMO/BORROW · IN/TRADE/PURCHASE |
| **OWN_IN_STOCK** | OUT/RENTAL/LEND · OUT/REPAIR/REQUEST · OUT/CALIB/REQUEST · OUT/DEMO/LEND · OUT/TRADE/SALE · OUT/TRADE/RETURN · OUT/TRADE/OTHER · TRANSFER/TRADE/OTHER |
| **OWN_AT_EXTERNAL** | IN/RENTAL/RETURN · IN/REPAIR/RETURN · IN/CALIB/RETURN · IN/DEMO/RETURN |
| **EXTERNAL_IN_STOCK** | OUT/REPAIR/RETURN · OUT/CALIB/RETURN · OUT/RENTAL/RETURN · OUT/DEMO/RETURN · OUT/REPAIR/REQUEST · OUT/CALIB/REQUEST |
| **EXTERNAL_AT_VENDOR** | IN/REPAIR/RETURN · IN/CALIB/RETURN |
| **ARCHIVED** | (No recommendation — inactive asset) |

### UX Guide

- **Green flash + 60ms vibration** = recognized successfully. Re-scanning the same SN produces no reaction (intentional dedupe).
- **✕ in the list** = remove a wrongly scanned item immediately.
- **If the scenario changes mid-flow**, existing items are preserved and registered under the new scenario.

---

## 6.4 QR Label Print (`/inventory/labels`)

50×70mm portrait single format. 1 label = 1 page. Direct PC printing or mobile PNG save.

### Label Layout

```
┌──────────────────────┐  50mm
│                      │
│       ███QR███       │  44mm × 44mm (square, top center)
│       ███████        │
│       ███████        │
│                      │
├──────────────────────┤
│ ITM-XXX  [C] [TLS]   │  itemCode + color badge⁸ + ownership badge⁹
│ Item Name            │  itemName (bold)
│ S/N: XXX-YY-ZZZZ     │  S/N (mono)
│ WH-A · Main Warehouse │  Location/origin (small)
└──────────────────────┘  70mm
```

> ⁸ Color badge = toner channel indicator (K=BLACK, C=CYAN, M=MAGENTA, Y=YELLOW, D=DRUM, F=FUSER). When using color transfer paper it prints as-is; on monochrome transfer paper, the OS auto-converts to grayscale.

> ⁹ Ownership badge: `[TLS]` = own asset (Tellustech), `[EX]` = external asset (black background + white text).

### Print Dialog Settings (Required)

In the OS print dialog, **always** use the following values:
- Printer: NIIMBOT B21 (or Chrome '🅿 Save as PDF')
- Paper: **Custom 50×70mm portrait**
- Margins: **None**
- Scale: **100%**

> If A4/Letter is selected, the label is printed small in a corner and a blank page may be added. A guidance message is always shown in the yellow box at the top of the screen.

### Mobile Use

Per-row `📸` icon or `📸 Save All as PNG` button → 200dpi PNG saved → invoke NIIMBOT app or system print from the gallery.

### URL Prefill Modes (4)

| Query | Meaning |
|---|---|
| `?sns=SN1,SN2,...` | Multiple S/Ns — all info auto-fetched from master |
| `?items=ITM1,ITM2,...` | Multiple item IDs — itemCode/itemName/colorChannel |
| `?purchaseId=...` | Single purchase — supplier/purchase number header + all lines |
| `?itemCode=&sn=` | Single (legacy compatibility) |

---

# Part 7. HR

<!-- TODO next round -->

---

# Part 7. HR

The HR module consists of five screens. All are separated per company, and free-text inputs are subject to **automatic three-language translation**.

| Screen | Path | Auto Code |
|---|---|---|
| Onboarding | `/hr/onboarding` | `ONB-YYMMDD-###` |
| Offboarding | `/hr/offboarding` | `OFF-YYMMDD-###` |
| Incident Evaluation | `/hr/incidents` | `INC-YYMMDD-###` |
| Periodic Evaluation | `/hr/evaluations` | `EVAL-YYMMDD-###` |
| Leave | `/hr/leave` | `LV-YYMMDD-###` |

> Payroll (`/hr/payroll`) and incentives (`/hr/incentives`) are exposed only to authorized HR staff. If the menu is invisible, it is in permission-masked state.

## 7.1 Onboarding (`/hr/onboarding`)

Manage new hire orientation, contracts, and asset issuance in one place.

| Section | Content |
|---|---|
| **Basic Info** | Hire (selected from the employee master) · hire date · role |
| **Contract** | Contract type / start / end (synced with contract* in the employee master) |
| **Asset Issuance** | Records of laptops, monitors etc. issued per SN — processed as inventory OUT |
| **Checklist** | Per-item completion status for IT account / security training / welfare card etc. |

On save, `ONB-YYMMDD-###` is auto-issued.

## 7.2 Offboarding (`/hr/offboarding`)

| Section | Content |
|---|---|
| **Basic Info** | Leaver · leaving date · reason (subject to three-language auto-translation) |
| **Asset Recovery** | Records of recovery per SN of assets issued at hire — processed as inventory IN |
| **Account Deactivation** | Per-item entries for system / email / VPN, etc. |
| **Handover** | Successor + handover memo |

On completion, the employee master status is automatically changed to `TERMINATED`.

## 7.3 Incident Evaluation (`/hr/incidents`)

Recorded each time a specific incident occurs (disciplinary, commendation, attendance, etc.).

### Effect of Each Input on Data

| Input | **What this value does in the system** |
|---|---|
| **Subject** (Select active employee) | `Incident.subjectEmployeeId`. Added to that employee's cumulative incident history — input data for AI assistance during periodic evaluations |
| **Incident Date** (required) | `occurredAt`. Time-series analysis key |
| **Kind (kind)** | DISCIPLINARY · COMMENDATION · ATTENDANCE · OTHER — statistics separated per kind |
| **Original Language** | `originalLang` (VI/KO/EN) |
| **Content (contentVi/En/Ko)** | Enter one language — Claude API auto-translates the other two. **Minimum 50 characters** validation (rejects content that's too short). Author employee code is required |
| **Attachment** | `Incident.attachmentFileId` (optional). Evidence file |

### What Happens on Save

1. **`Incident` row creation** — `INC-YYMMDD-###` auto-issued.
2. **Three-language translation stored** — All three columns are filled even if the author entered just one language.
3. **Accumulated as AI evaluation data** — Used as automatic context during periodic evaluations.
4. **Display prefers the user's language**, with a "View Original" toggle.

## 7.4 Periodic Evaluation (`/hr/evaluations`)

Quarterly / semi-annual / annual periodic evaluation.

| Section | Content |
|---|---|
| **Basic Info** | Subject · evaluation period · evaluator |
| **Per-item Score** | Job competency, attitude, performance, etc. (with weights applied) |
| **Overall Comment** | Free-form (three-language auto-translation) |
| **AI Assistance** | `/hr/evaluations/ai` — generates a draft based on cumulative incident-evaluation data |

On save, `EVAL-YYMMDD-###` is auto-issued.

## 7.5 Leave (`/hr/leave`)

### Effect of Each Input on Data

| Input | **What this value does in the system** |
|---|---|
| **Applicant** | `Leave.employeeId`. Self by default; only admins can apply on behalf |
| **Kind** (kind) | ANNUAL · HALF · SICK · OTHER — branches the remaining-leave computation |
| **Start / End Date** | `startDate/endDate`. Days are auto-computed (half-day = 0.5) |
| **Reason** | Free text (three-language auto-translation) |

### What Happens on Save

1. **`Leave` row creation** — `LV-YYMMDD-###` + status `PENDING`.
2. **Department head notification** — Sends a pending-approval notification.
3. **After approval** → automatically deducted from the employee's remaining leave; auto-displayed on the calendar.
4. **After rejection** → reason attached + applicant notified.

---

# Part 8. Finance

The Finance module consists of two screens.

| Screen | Path | Role |
|---|---|---|
| Receivables / Payables | `/finance/payables` | Receivables / payables auto-linked from sales / purchases |
| Expenses | `/finance/expenses` | General operating expenses; expenses linked to sales / purchases |

## 8.1 Receivables / Payables (`/finance/payables`)

When a sale is registered, a **receivable** (`RECEIVABLE`) record is auto-generated; when a purchase is registered, a **payable** (`PAYABLE`) record is auto-generated.

### List Screen (NEW — search + sort + days remaining + revised date)

A **Total Outstanding (VND)** card at the top. The table has the following columns.

#### Search Filter Area
- **Type** select: All / Receivable (RECEIVABLE) / Payable (PAYABLE)
- **Status** select: All / OPEN / PARTIAL / PAID / Overdue (OVERDUE)
- **Document Number** text: partial match (Sales / Purchase / Expense codes all)
- **Client** ClientCombobox (server search)
- **Period (Issued)** start ~ end (based on `createdAt`)
- **Period (Due)** start ~ end (based on `dueDate`)
- [Search] / [Reset] buttons

#### Columns

| Column | Meaning | Sort |
|---|---|---|
| **Type** | RECEIVABLE → "Receivable" / PAYABLE → "Payable" (full name in three languages) | — |
| **Status** | Composite of `OPEN` · `PARTIAL` · `PAID` · OVERDUE | — |
| **Document** | Source sales / purchase / expense number | — |
| **Client** | Clients in `BLOCKED` status have a red badge next to the name | — |
| **Amount** | VND | ▲▼ |
| **Received / Paid** | Cumulative payment | — |
| **Balance** | `amount - paidAmount` | ▲▼ |
| **Due Date** | `dueDate` (set from payment terms at first issuance, immutable thereafter) | ▲▼ |
| **Revised Date** | `revisedDueDate ?? dueDate` (new due date entered in the detail view) | ▲▼ |
| **Days Remaining** | `today - revised date`. Color: negative=green (remaining), 0=yellow (today), positive=red (overdue). Empty when PAID | ▲▼ |

Default sort: **days remaining descending** (most overdue at the top).

> **Due Date vs Revised Date**: The payment due date set automatically at first issuance is `dueDate` (immutable). Entering the result of due-date negotiation in the detail saves to `revisedDueDate`. The days-remaining / overdue judgments use the revised date.

### Detail Screen — Effect of Each Input

`/finance/payables/[id]` — two sections + input effects:

#### Add Contact History (PrContactLog)

| Input | **What this value does in the system** |
|---|---|
| **Date** | `PrContactLog.contactDate` |
| **Contact Method** | `method` — PHONE/EMAIL/VISIT/CHAT |
| **Contact Note (1 of 3 languages)** | `contactNoteVi/En/Ko` — auto-translated when one language is entered |
| **Customer Response (1 of 3 languages)** | `responseVi/En/Ko` — same |

#### Add Payment History (PrPayment)

| Input | **What this value does in the system** |
|---|---|
| **Payment Amount** | `PrPayment.amount`. Auto-accumulated into the PR's `paidAmount` |
| **Payment Date** | `paidAt` |
| **Payment Method** | `method` — BANK/CASH/CARD/OTHER |
| **Memo** | Free-form |

#### What Happens Automatically on Payment Registration

1. **PR `paidAmount` updated** = SUM(PrPayment.amount).
2. **PR `status` auto-transition** — `paidAmount = 0` → `OPEN`, `0 < paidAmount < amount` → `PARTIAL`, `paidAmount >= amount` → `PAID`, `dueDate < today` → `OVERDUE`.
3. **Client `receivableStatus` recomputed** — Auto-transitions among `NORMAL` ↔ `WARNING` ↔ `BLOCKED` based on cumulative receivable changes.
4. **Accounting close lock check** — Payment registration on PRs in a locked month is blocked (Volume B, Part 3).

### Excel Download

The `[Excel]` button in the top-right downloads the current filter results as `.xlsx`.

## 8.2 Expenses (`/finance/expenses`)

Register general operating expenses and allocate them to sales / purchases.

### New Registration — Effect of Each Input

| Input | **What this value does in the system** |
|---|---|
| **Auto Code** | `EXP-YYMMDD-###` (auto-issued) |
| **Expense Type (expenseType)** | `GENERAL` / `PURCHASE` / `SALES` / `TRANSPORT` — choosing `SALES`/`PURCHASE` makes the linked sales / purchase ID required |
| **Amount / Currency / FX Rate** | `amount/currency/fxRate`. Statistics use VND-converted values |
| **Incurred At** | `incurredAt`. Basis for the accounting-close (lock) month determination |
| **Linked Sales / Purchase** | When `SALES`, `linkedSalesId` is required; when `PURCHASE`, `linkedPurchaseId`. Surfaces in the sales / purchase detail as "Related Expenses" |
| **Memo** | `note` (free-form) |

### What Happens on Save

1. **`Expense` row creation**.
2. **Linked sales / purchase profit recomputation** — Reflected in statistics immediately.
3. **Accounting close check** — If `incurredAt` is in a locked month, even new registration is blocked.

### Allocations

Distributes a single expense across multiple sales / purchases or departments / projects. Register lines on the **Allocations** tab of the expense detail page.

Subject to the accounting-close (lock) policy — modifications / deletions of expenses in a locked month are blocked (Volume B, Part 3).

---

# Part 9. Meetings / Calendar / Messaging

## 9.1 Weekly Report / Meeting Minutes (`/weekly-report`)

Integrated management of weekly work reports and meeting records.

### Layout — Two Panels

| Panel | Content |
|---|---|
| **Tasks** | Tasks in progress — instructions / content (three languages), owner, status |
| **Backlog** | Cumulative open tasks + history per client |

### Tasks — Effect of Each Input

| Input | **What this value does in the system** |
|---|---|
| **Instruction (instructionVi/En/Ko)** | Auto three-language translation when one language is entered. `WeeklyReportTask.instruction*` columns |
| **Content (contentVi/En/Ko)** | Same pattern. Progress / detailed report |
| **Owner** | `ownerEmployeeId`. Aggregated in "Work Throughput" statistics |
| **Status** | TODO/IN_PROGRESS/DONE — branches calendar / dashboard open-task counts |

Display chooses an available language in the order user language → VI → KO → EN (the `pick3` function).

### Backlog — Effect of Each Input

| Input | **What this value does in the system** |
|---|---|
| **Client** (ClientCombobox) | `Backlog.clientId`. Per-client cumulative open tasks |
| **Task History** (three-language auto-translation) | Per-client cumulative — auto-surfaced as the "Recent Open Tasks" section on Sales / AS screens |

## 9.2 Calendar (`/calendar`)

Switch among month / week / day views. Schedules registered to `/master/schedules` and company-wide events are all displayed. Click a schedule card → view detail / edit.

## 9.3 Chat (`/chat`)

WebSocket-based real-time messaging.

### Message Input — Data Effect

| Input | **What this value does in the system** |
|---|---|
| **Message body** (one language entered) | On send, the Claude API auto-fills all three language columns (`contentVi/En/Ko`) |
| **Attachments** (optional) | Uploaded to `/api/files` → linked to `messageFiles` |
| **Recipient (DM)** | Only employees within the company scope are searchable — both companies are searchable in admin ALL mode |

### Display Options

The recipient can choose to display 1, 2, or 3 languages on the screen (e.g., KO only / KO+VI / KO+VI+EN). A Vietnamese teammate can immediately read in Vietnamese a message sent in Korean.

### New Chat (`/chat/new`)

| Input | **What this value does in the system** |
|---|---|
| **Counterpart** (single / multiple) | DM or group chat. A `ChatRoom` is auto-created when the first message is sent |
| **Room Name** (group only) | `ChatRoom.name`. Free-form |

---

# Part 10. Statistics (Read-only)

> Regular employees are granted **view permission only**. Use it as an analysis tool. In-depth KPI / per-SN profit analysis is covered by administrators in Volume **B — Part 7**.

The `/stats` menu consists of four tabs.

| Tab | Content |
|---|---|
| **Sales / Sales Activity** | Monthly sales trend, totals per client / project, sales-owner performance |
| **Rental / AS** | Active IT/TM contract count, monthly billing / settlement, AS handling time (SLA) |
| **Inventory / HR** | Per-item turnover, headcount per department, evaluation-score distribution |
| **Finance** | Receivable balance trend, totals per expense category, currency conversion summary |

### Tips

- All charts have **company scope** automatically applied (TV/VR separated or consolidated view).
- The `[Excel]` button in the top-right of each table can download the raw data as `.xlsx`.
- Detailed analyses (per-SN profit, TCO, etc.) require admin permissions — see Volume B, Part 7.

---

# Appendix A — Auto Code Table (Summary)

| Target | Format | Notes |
|---|---|---|
| Client | `CL-YYMMDD-###` | Sequential per day |
| Item | `ITM-YYMMDD-###` | Sequential per day |
| Employee | `TNV-###` (TV) / `VNV-###` (VR) | **Per-company sequential, no YYMMDD** |
| IT Contract | `TLS-YYMMDD-###` / `VRT-YYMMDD-###` | |
| TM Rental | `TM-YYMMDD-###` | |
| AS Document | `YY/MM/DD-##` | Slash-separated |
| Evaluation | `INC-YYMMDD-###` (incident) / `EVAL-YYMMDD-###` (periodic) | |
| Onboarding/Offboarding | `ONB-YYMMDD-###` / `OFF-YYMMDD-###` | |
| Leave | `LV-YYMMDD-###` | |
| Expense | `EXP-YYMMDD-###` | |
| Schedule | `SCH-YYMMDD-###` | |
| License | `LIC-YYMMDD-###` | |

---

# Appendix B — Company Code Policy (Summary)

- The company code can only be `TV` or `VR`.
- Selected at login → fixed for the entire session → auto-injected into every query.
- Users with two or more `allowedCompanies` (mainly ADMIN/MANAGER) can switch to consolidated view (`ALL`) using the company picker in the sidebar.
- The shared masters (`clients`, `items`, `warehouses`) have no company code — both entities see the same data.
- All other business data require a company code — enforced by indexes.

---

# Appendix C — Three-Language Auto-Translation (Summary)

Free-text fields (AS symptoms, incident evaluations, memos, requests, etc.) are all stored in the form **three language columns + originalLang**.

- The user enters in only one language → on save, the Claude API auto-translates the other two languages.
- Display immediately shows the language chosen in the sidebar; use the "View Original" toggle to see other languages.
- Only administrators can edit the translation result.
- Personal names and proper nouns are processed the same way, but transliteration can be awkward — direct input is recommended when needed.

---

# Appendix D — Download / Upload Guide (Module-by-module Cautions and Tips)

This section gathers the issues commonly encountered when using Excel upload / download and quick ways to handle them. All upload screens commonly expose the three buttons "📤 Excel upload" / "📋 Empty template" / "📥 Download Excel".

## D.1 Common (All Modules)

- **Header row required (row 1)** — The first row must contain column names. Data starts from row 2.
- **Empty cell = null** — Leaving a cell blank means that field is not provided. However, leaving a required column blank yields a row-level error and rejection.
- **Reference values (client / item / employee codes etc.) must exactly match the DB** to be mapped. Case- and space-sensitive.
- **Three-language auto-translation fields** (symptoms / memos etc.) are OK with only one language filled — the other two are auto-filled on save.
- **Auto-issued codes (`SLS-`/`PUR-`/`ITM-` etc.)** are auto-filled by the server when left blank. Manual values risk collisions.
- **Error message = row number + field + reason** format. For example, "Row 4 (ITM-D330): description — required field is empty," indicates exactly which row and field.
- **Partial failures allowed** — Just fix only the failed rows and re-upload (successful rows are idempotent upserts so no duplicate registration).
- **Split uploads recommended** — 100 to 500 rows at a time. More than that should be chunked (each batch's results / errors can be checked immediately, safer).

> 💡 **Tip**: Before making a large file, test with a mini file of 5–10 rows first. Good for catching header matching / required-field misses.

## D.2 Clients (`/master/clients`)

| Column | Required | Notes |
|---|:-:|---|
| `clientCode` | ☐ | Blank = `CL-YYMMDD-###` auto-issued |
| `companyNameVi` | ☑ | Vietnamese company name (main search key) |
| `companyNameKo` | ☐ | Auto-translated if blank |
| `companyNameEn` | ☐ | Auto-translated if blank |
| `taxCode` (MST) | ☐ | Vietnamese tax code — duplicate registration with the same value is blocked |
| `bankAccount/Holder/BankName` | ☐ | Payment info |
| `paymentTerms` | ☐ | Number of days (default 30) |
| `address/phone/email` | ☐ | Contact |

⚠️ **Caution**: An error if `taxCode` overlaps with another client. When merging / renaming clients, prefer modifying (PATCH) the existing row.
💡 **Tip**: New 5–10 entries are faster manually. Use Excel from 30 entries onward. Data exported from ECOUNT goes through the dedicated ECOUNT import tool (see Volume B manual).

## D.3 Items (`/master/items`)

13 Excel upload columns — see body section 1.2 for detailed definitions. Only frequently-encountered pitfalls here:

⚠️ **Required fields** (row validation):
- All rows: `itemType`, `name`, `description`
- `CONSUMABLE`/`PART`: also at least 1 entry in `compatibleItemCodes`

⚠️ **The following columns are ignored on PRODUCT rows even if filled** (to avoid confusion):
- `colorChannel`, `expectedYield`, `yieldCoverageBase`, `compatibleItemCodes`, `parentItemCode`, `bomQuantity`, `bomNote`

⚠️ **BOM parent link (parentItemCode)** must have the parent row exist either in the same file or pre-existing in the DB. Register parent first, then children.
- When uploading parents and children together in the same file: row order within the file is irrelevant (the server handles Phase 1 then Phase 3).

⚠️ **BOM up to 3 levels** — Attempts to register children for Level 3 parts are ignored.

⚠️ **Compatibility mapping** (compatibleItemCodes): semicolon (`;`) separated. Example: `ITM-010;ITM-011`.
- If a mapped PRODUCT does not exist in the DB, only that mapping is ignored (the row itself succeeds).

💡 **Tip**:
- **Series-registration pattern**: 1 main PRODUCT → 4 compatible toner types (BLACK/CYAN/MAGENTA/YELLOW) → A'ssy → A'ssy children. Can all be filled in one sheet.
- **Post-seed addition**: To fill only `expectedYield` for an already-seeded toner, upload with only `itemCode` + the columns to change (upsert). Be aware that missing compatible equipment is an error — once mapped values cannot be re-cleared (it isn't ignored), so prefer correcting via the PATCH screen.
- **Hundreds at once**: Recommended ≤ 500 rows, max 2000 rows. 500 rows ≈ 12 seconds.
- **Download**: "📥 Download Excel" → only the currently filtered results. Not a full backup.

## D.4 Sales / Purchases (`/sales`, `/purchases`)

⚠️ **Required**:
- Sales: `clientCode`, `projectCode`, line `itemCode`/`quantity`/`unitPrice`
- Purchases: `supplierCode`, `projectCode`, line info

⚠️ **`projectCode` is company-scoped**. Even with the same code, TV and VR are different projects. Only matched against projects of the current session's company.

⚠️ **TRADE sale lines = auto inventory OUT**. Triple S/N validation applied on the line — already-shipped SNs and SNs on active IT/TM contracts are rejected.
⚠️ **Purchase line S/N is newly inbound**. Conflict with an existing inventory SN is rejected.

💡 **Tip**:
- **Foreign-currency sales**: Enter USD/KRW/JPY/CNY in the `currency` column + specify `fxRate`. VND can be left blank (auto 1.0).
- **CALIBRATION sales**: Filling line `certNumber/certDate/certPdf` columns auto-exposes them on the customer portal.
- **Partial failure**: If even a single line's SN is rejected, the entire sales header is rejected. There is no per-line partial success.

## D.5 IT Contract Equipment (`/rental/it-contracts/[id]` → bulk upload)

For registering hundreds of devices at once.

⚠️ **Required**: `serialNumber`, `itemCode`. Everything else is optional, but `deviceModel` is recommended when using SNMP auto-collection.

⚠️ **STRICT inventory check** — Only SNs registered in in-house inventory (`InventoryItem`) pass. External leased equipment must be handled in LOOSE mode via the direct registration screen.

💡 **Tip**:
- **Activate SNMP auto-collection**: fill `deviceModel` (e.g., `SAMSUNG_X7500`) and issue a token. `deviceIp` can be left blank — the agent auto-fills via auto-scan.
- **resetAt** column: counter reset date (e.g., motherboard replacement). For subsequent billing, prev is ignored when computing usage.

## D.6 TM Rental / Inventory / AS

- **TM Rental** (`/rental/tm-rentals`): N lines. Per-line `startDate/endDate` required. On recovery, change endDate or use the dedicated screen.
- **Inventory transactions** (`/inventory/transactions`): bulk registration is supported, but **purchase / sale / purchase return only via the Purchase / Sales modules**. PURCHASE/SALE/RETURN_IN reasons in Excel are not silently ignored — they are rejected.
- **AS dispatch** itself does not support bulk upload (register one at a time). **Dispatch photos** are uploaded directly from mobile (D.8).

## D.7 HR (Onboarding / Offboarding / Leave)

⚠️ Onboarding / offboarding centers around **PDF auto-issuance** — Excel upload is rarely used. Register via the form.
⚠️ Leave allows multiple registrations across dates — duplicates for the same employee on the same date are rejected.

## D.8 Photo / File Upload (Common to Mobile and Web)

- **AS dispatch meter photo** — Immediately from the mobile camera. Auto JPEG compression (~500KB target).
- **Client signature** — HTML5 Canvas → saved as base64 PNG. For PDF embedding.
- **Instrument calibration certificate PDF** — Attach to `certPdf` of the line on sales registration. Subject to customer portal download.
- **Personal photo / ID** — `idCardPhotoUrl` column. Per company policy, only authorized HR staff can download.

⚠️ **File size**: ≤ 10MB per single file recommended. Anything larger should be compressed before upload (browser-freeze risk).
⚠️ **Format**: JPEG/PNG/PDF only. HEIC (iPhone default) is not auto-converted — set the phone's camera to "Most Compatible" format.
💡 **Tip**: Photographing on mobile and attaching directly applies auto rotation / compression. Routing through a different folder on PC may strip rotation metadata.

## D.9 Downloads — Common Patterns

| Download | Location | Notes |
|---|---|---|
| Sales / purchase / client / item Excel | "📥 Download Excel" in the top-right of each list screen | Only the current screen's filter / search results |
| Usage Confirmation PDF | "📄 PDF" of the row in `/admin/usage-confirmations` | Generated by pdf-lib, with Noto Sans CJK embedded |
| AS dispatch photo | Dispatch detail → photo card → right-click save | Multi-download not supported |
| Calibration certificate | Sales line → certificate card → download | Same file on the customer portal |
| QR label sheet | `/inventory/labels` → "Print" | A4 sheet, header is auto when accompanied by purchase ID |
| Yield report | `/admin/yield-analysis` → (CSV / Excel coming later) | Currently only the on-screen table |
| Audit log | `/admin/audit-logs` → requires separate permission | Volume concerns, paginated |

💡 **Tip**: Excel download is based on the "current screen state". Adjust search / filters first, then download.

---

# Appendix E — Recently Added Features (as of 2026-04-30)

## E.1 Sales 4-Step Workflow (Mock Sales)

The `/sales` sales screen has stage badges + KPIs + search added.

| Stage | Badge | Meaning | Who Acts |
|---|---|---|---|
| 🟡 Awaiting Tech | TECH | SNMP usage confirmation incomplete | Tech team |
| 🟠 Awaiting Sales Issuance | SALES | Usage confirmed + awaiting sales [Issue] | Sales |
| 🔵 Awaiting Finance CFM | FINANCE | Sales issued + awaiting finance [CFM] | Finance |
| 🟢 Done | DONE | Finance CFM completed (lock) | — |

- Auto-issuance cron at 09:00 KST on the 1st of every month — one DRAFT sale per ACTIVE IT/TM contract for the previous month.
- At the moment of usage confirmation ADMIN_CONFIRMED, the same (contract, month) DRAFT sale is auto-synced — even additional usage lines are filled.
- On the sales detail, click [🟠 Issue Sales] → isDraft=false + auto-issue receivable.
- After Finance CFM, regular PATCH is blocked (locked). Only ADMINs can unlock.

## E.2 IT/TM Rental — Early Termination Button 🛑

In the top-right of the contract detail header, **🛑 End Contract (Early/Normal)** — enter end date / reason / status (COMPLETED/CANCELED) → automatically:
- endDate change + status change
- All active equipment recovered (`removedAt = end date`)
- DRAFT sales for months after the end date are deleted

## E.3 Portal — "My Requests" Detail Page

`/portal/requests/[id]` — entered by clicking the ticket number on the portal main:
- Kind / status / owner / completion date
- For AS, full-text symptoms; for consumables, the requested item table
- **Progress timeline** — 📥 received → 🚚 dispatch #1 (owner, parts used) → ✅ completed or ⏳ pending

## E.4 Inventory — Current State Memo + Good / Defective

New InventoryItem fields:
- `stateNoteVi/En/Ko` — free text (auto three-language translation on save)
- Good / defective classification follows the existing `status` enum:
  - 🟢 Good = `NORMAL`
  - 🔴 Defective = `NEEDS_REPAIR` / `PARTS_USED` / `IRREPARABLE`

UI: `/inventory/stock` → expand SN → change status + enter Remark. The new stateNote field will get an input form added in a follow-up UI work.

## E.5 Compatibility Search + 3-Level BOM + colorChannel

Refer to Volume A body section 6.x — already applied.

## E.6 Sidebar Favorites ❤

Click the ♡ next to each menu → ♥ becomes red and is auto-exposed in the "❤ Favorites" group at the top of the sidebar. Stored in localStorage.

## E.7 Page Width Expansion

The following pages have been expanded from `max-w-6xl` (1109px) → `max-w-screen-2xl` (1366px):
- Sales (`/sales`)
- AS Tickets (`/as/tickets`)
- AS Dispatches (`/as/dispatches`)

Resolves horizontal table truncation.

# Appendix F — ERP Flow Diagram (One-Page Guide)

## F.1 Inter-Module Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Clients   │     │    Items    │     │  Warehouses │
│ /master/    │     │ /master/    │     │ /master/    │
│ clients     │     │ items       │     │ warehouses  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
        ┌──────────────────────────────────┐
        │  InventoryItem (S/N master)      │
        │   ┌─ ownerType (COMPANY/EXT)     │
        │   ├─ warehouseId (current wh)    │
        │   ├─ currentLocationClientId     │
        │   │   (external entrusted loc)   │
        │   └─ archivedAt                  │
        └─────┬───────────┬──────────┬─────┘
              │           │          │
        IN/OUT/      Asset location  Asset status
        TRANSFER      update         change
              │           │          │
              ▼           ▼          ▼
   ┌───────────────────────────────────────────────────┐
   │  InventoryTransaction (4-axis rule based)         │
   │   txnType × refModule × subKind × ownerType       │
   │   → masterAction + autoPurchase/Sales decision    │
   └────┬───────────────┬─────────────┬────────────────┘
        │               │             │
   Purchase cand.   Sales cand.   Master update
        ▼               ▼             ▼
   ┌────────┐    ┌────────┐    ┌──────────┐
   │Purchase│    │ Sales  │    │ Location/│
   │ DRAFT  │    │ DRAFT  │    │ status   │
   │        │    │        │    │ auto chg │
   └────┬───┘    └────┬───┘    └──────────┘
        │             │
   Finance        Finance
   confirm        confirm
        ▼             ▼
   ┌────────┐    ┌────────┐
   │Payable │    │Receiv. │
   └────────┘    └────────┘
```

## F.2 S/N Tracing Flow

How a single S/N is connected across the entire system:

```
                S/N (e.g., TONER-BK-1777080756243-1)
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
  InventoryItem      InventoryTransaction   ItContractEquipment
  (1 row - master)    (N rows - tx log)     (when on a contract)
       │                  │                  │
       │                  ▼                  │
       │           PayableReceivable          │
       │           (Purchase/Sales cand.)     │
       │                                     │
       ▼                                     ▼
  QR label display                      IT contract (`/rental/it-contracts`)
  (`?sns=...`)                          + Amendment history
       │                                     │
       ▼                                     ▼
   /inventory/scan                      Monthly billing/settlement
   status-based recommendation          (monthly billing)
```

**Key**: With only the S/N, a single visit to `/inventory/scan` or `?sns=` retrieves all history of that asset (owner, location, active contracts, purchase/sales, label) at once.

---

# Appendix G — Key Feature Summary (One Page)

## Master
- **Clients** (`/master/clients`) — Suppliers, customers, and outsourcers unified. `clientCode` auto-generated (`CL-YYMMDD-###`).
- **Items** (`/master/items`) — 4 itemTypes (PRODUCT/CONSUMABLE/PART/**SUPPLIES**), BOM parent-child, compatibility mapping, color channel.
- **Warehouses** (`/master/warehouses`) — INTERNAL (in-house) / EXTERNAL (outsourcer).
- **Employees** (`/master/employees`) — Auto employee code (`TNV-###` / `VNV-###` per company).
- **Departments, Projects, Schedules, Licenses** — Auxiliary masters.

## Sales
- **Sales** (`/sales`) — Auto TRADE outbound. S/N enforced. PR sales candidate auto-created.
- **Purchases** (`/purchases`) — Auto TRADE inbound. NEW master created.
- **Quote Requests** (`/admin/quotes`) — Customer letter of intent → convert to sales.
- **Adjustments / Refunds** — Sales/Purchase Adjustments. Returns, exchanges, partial handling.

## Rental
- **IT Contracts** (`/rental/it-contracts`) — Body + consumable auto unit-price mapping. Amendment history.
- **TM Rental** (`/rental/tm-rentals`) — Short-term rental. `rentalCode = TM-YYMMDD-###`.
- **SNMP Auto-Collection** — Windows Agent + token authentication → usage confirmation PDF.
- **Consumable Yield Analysis** (`/admin/yield-analysis`) — Compare rated output vs. actual usage, suspicious-fraud notifications.

## A/S
- **Ticket Intake** (`/as/tickets`) — Customer requests + photo attachments.
- **Dispatch** (`/as/dispatches`) — Field visit + parts used + S/N tracking.

## Inventory (this chapter)
- Stock status, transactions, QR scan, QR label — all based on the 4-axis truth table.

## HR
- Onboarding, offboarding, incident evaluations, periodic evaluations, leave, payroll.

## Finance
- Receivables/Payables (PR DRAFT → OPEN → PARTIAL → PAID workflow).
- Sales finance CFM, accounting close, expenses.

## Meeting · Calendar · Messaging
- Calendar, chat (3-language auto-translation).

## Customer Portal Operations
- Portal points, banners, posts (Monday 09:00 KST AI auto-generation).
- Customer feedback, surveys, vendor recommendations.

## Statistics (`/stats`)
- Per-module KPI dashboards.

## Administration
- Audit log, permission management, trash bin.

---

# Appendix H — Glossary (alphabetical)

| Term | Description |
|---|---|
| **4-Axis Truth Table** | A rule table that determines the inbound/outbound action by the (txnType × referenceModule × subKind × ownerType) key. The `BASE_RULES` object. |
| **AS** | After-Service. Post-sale customer service (repair, consumable replacement, etc.). |
| **AUTO PR DRAFT** | A PayableReceivable row auto-created as a purchase/sales candidate. Drafted at amount=0 → finance confirms the amount. |
| **Amendment** | IT contract change history (equipment add/replace/remove). Can be auto-created on transaction entry. |
| **archivedAt** | The timestamp when a master is deactivated. Non-NULL after asset sale/return/disposal. |
| **BASE_RULES** | The truth table object in `src/lib/inventory-rules.ts`. 30+ rows. |
| **BOM** | Bill of Materials. Parent item — child item relationship. |
| **CFM** | Confirm. The sales/schedule confirmation step. |
| **CL-YYMMDD-###** | Auto code for clients. |
| **ColorChannel** | Toner channel (BLACK/CYAN/MAGENTA/YELLOW/DRUM/FUSER/NONE). Shown as a label color badge. |
| **COMPANY** | OwnerType — own (in-house) asset. |
| **CONSUMABLE** | itemType — consumable (toner, etc.). Also the sub-kind in OUT. |
| **CRUD** | Create/Read/Update/Delete. The 4 basic data operations. |
| **currentLocationClientId** | The master's current location (client ID) when externally entrusted. Restored to NULL on recovery. |
| **DEMO** | refModule — demo unit demonstration. |
| **DRAFT** | The initial state of PR. amount=0 → OPEN once finance confirms. |
| **ECOUNT** | The legacy ERP. XLSX export is used for migration. |
| **EX** | External. The external asset badge on labels. Black background + white text. |
| **EXTERNAL_CLIENT** | OwnerType — external (customer/outsourcer) asset. |
| **fromClientId** | The origin client in TRANSFER External mode. |
| **fromWarehouseId** | The origin warehouse for OUT or TRANSFER Internal mode. |
| **i18n** | Internationalization. Multilingual handling. This ERP supports vi/en/ko (3 languages). |
| **IN** | txnType — inbound. |
| **inboundReason** | The inbound reason recorded in the master (legacy enum). |
| **InventoryItem** | The master table with one row per S/N. |
| **InventoryTransaction** | The transaction record (event log) for inbound/outbound. |
| **IRREPARABLE** | InventoryStatus — to be scrapped. |
| **IT Contract** | Lease contract for IT equipment such as copiers/printers. `TLS-YYMMDD-###`. |
| **itemType** | 4 types: PRODUCT/CONSUMABLE/PART/**SUPPLIES**. |
| **JSON** | JavaScript Object Notation. Data interchange format. |
| **KST** | Korea Standard Time (UTC+9). |
| **lockedAt** | Accounting close timestamp. Non-NULL means changes are not allowed. |
| **MOVE** | masterAction — change of in-house warehouse. |
| **NEW** | masterAction — create new master. |
| **NIIMBOT B21** | A 50mm-wide thermal label printer. |
| **NORMAL** | InventoryStatus — normal. |
| **OFF-YYMMDD-###** | Offboarding auto code. |
| **ON BORROW** | DEMO/RENTAL borrowing from outside. |
| **ONB-YYMMDD-###** | Onboarding auto code. |
| **onHand** | The on-hand quantity column in stock status. |
| **OUT** | txnType — outbound. |
| **ownerClientId** | The owner client ID for an EXTERNAL_CLIENT asset. |
| **ownerType** | COMPANY / EXTERNAL_CLIENT. |
| **PARTS_USED** | InventoryStatus — parts have been used (after disassembly). |
| **PayableReceivable (PR)** | The unified table for payables/receivables. |
| **PartialAmendment** | A partial change to an IT contract. |
| **PNG** | Portable Network Graphics. The mobile save format for labels. |
| **prefill** | The behavior of auto-filling the form via URL queries or QR scan results. |
| **REPAIR** | refModule — repair. |
| **RENTAL** | refModule — rental/lease. |
| **S/N** | Serial Number. 1 asset = 1 S/N. The system-wide key. |
| **scenarioId** | The truth table row identifier (1~28). |
| **SNMP** | Simple Network Management Protocol. Auto-collection of printer counters. |
| **SUPPLIES** | itemType — supplies (quantity-based, S/N optional). |
| **TLS** | The Tellustech own-asset label badge. |
| **TM Rental** | Short-term rental. TM-YYMMDD-### auto code. |
| **toClientId** | The destination client in TRANSFER External mode. |
| **toWarehouseId** | The destination warehouse for IN or TRANSFER Internal mode. |
| **TRADE** | refModule — unifies purchase/sales/return/disposal/assembly/disassembly. |
| **TRANSFER** | txnType — move (in-house ↔ in-house, or external ↔ external). |
| **TRANSFER_LOC** | masterAction — update of externally entrusted location. |
| **txnType** | InventoryTransaction.txnType (IN/OUT/TRANSFER). |
| **YieldBadge** | Yield rate badge (BLUE/GREEN/YELLOW/ORANGE/RED). |

---

# Appendix I — Abbreviations

| Abbreviation | Expansion |
|---|---|
| **AS** | After-Service |
| **BOM** | Bill of Materials |
| **CFM** | Confirm |
| **CRUD** | Create/Read/Update/Delete |
| **DRAFT** | The initial state of PayableReceivable |
| **ERP** | Enterprise Resource Planning |
| **EX** | External |
| **HMR** | Hot Module Replacement (development) |
| **IT** | Information Technology |
| **JSON** | JavaScript Object Notation |
| **KST** | Korea Standard Time |
| **OAuth** | Open Authorization |
| **PR** | PayableReceivable |
| **PDF** | Portable Document Format |
| **PNG** | Portable Network Graphics |
| **QR** | Quick Response (code) |
| **RFC** | Request For Comments (Internet standard) |
| **S/N** | Serial Number |
| **SNMP** | Simple Network Management Protocol |
| **SSO** | Single Sign-On |
| **TLS** | Tellustech (own-company abbreviation) |
| **TM** | Tellustech short-term rental |
| **TV** | Tellustech Vina (Vietnam entity) |
| **VR** | Vietrental (Vietnam entity) |
| **UI** | User Interface |
| **UX** | User Experience |
| **UTC** | Coordinated Universal Time |
| **XLSX** | Excel spreadsheet format |

---

# Appendix J — FAQ · Frequently Asked Questions

### Q1. Can I directly edit the IN transaction auto-generated by the Purchase module from the transaction entry form?
**No**. Transactions created via the Purchase module can only be edited or returned through the Sales/Purchase Adjustments screens. The transaction entry form is for new entries only.

### Q2. How do I correct a wrongly registered S/N?
You can restore it within 7 days from the trash bin on the admin page (`/admin/trash`). After 7 days, re-register it under a new S/N as IN/TRADE/OTHER (stock adjustment found).

### Q3. When an external asset (customer repair item) is in our warehouse, does a payable arise?
**No**. It is registered as `ownerType=EXTERNAL_CLIENT`, and no Auto PR (purchase candidate) is generated. We are merely storing it.

### Q4. After disassembly, can the parts be reassembled?
Yes. In a single transaction, OUT/TRADE/OTHER the N parts and IN/TRADE/ASSEMBLE the body all at once. However, the parent-child relationship is not auto-tracked by the system, so writing a note in the transaction is recommended.

### Q5. Label printing comes out small on a single A4 page.
You did not change the paper size in the OS print dialog to custom 50×70mm portrait. Please follow the yellow guidance box at the top of the screen.

### Q6. After QR scanning, the same label keeps being added.
There was a previous period when dedupe was not working due to a bug. Since 2026-05, this has been fixed with a 1.5s cooldown + inflight guard + green-flash feedback.

### Q7. Where do I register SUPPLIES?
On `/master/items/new`, choose "Supplies (quantity)" in the itemType selector. Both purchasing and inventory use quantity only, no S/N input.

### Q8. How are assets transferred between the two entities (TV/VR)?
Handled via the inter-client sales/purchase logic. Register a TV → VR sale and a VR → TV purchase simultaneously. There is no separate workflow.

---

# Appendix K — Change Log (2026-05 Supplement)

- **v2.6.1 · 2026-05-03**: Inventory refactor **Phase 2 E2E** verification + extracted seed.
  - Extracted `scripts/seed-inventory-e2e.ts` — 6 clients + 2 warehouses + 5 items + 4 pre-existing masters (R001/RP02/CL02/DM02). Idempotent cleanup + standalone runnable.
  - 20 truth-table rows + 3 extras + 4 cross-verify = **31/31 PASS**. Verifies InvTxn row, InventoryItem master action (NEW/MOVE/ARCHIVE/TRANSFER_LOC), ownerType + currentLocationClientId + archivedAt, in-house onHand totals, BASE_RULES lookup, auto purchase/sales PR DRAFT.
  - Chrome verify: `/inventory/transactions/new` cascading — IN(11) / OUT(14) / TRANSFER(5). TRANSFER row 1 = internal warehouse↔warehouse, rows 2~5 = external client↔client pass-through.
  - i18n fix — added `field.fromWarehouse` / `field.toWarehouse` vi/en/ko keys (resolves the raw i18n key string previously visible in the TRANSFER internal mode).
- **v2.6.0 · 2026-05-03**: Finance **Layer 5 — AccountingConfig + Sidebar reorganization + 21-step E2E** completed.
  - **AccountingConfig** (one row per company) — 3 standard presets (VAS/K_IFRS/IFRS) + fiscal year start month + reporting currency + default VAT rate + report language + 3 toggles (accrual / auto-journal / enforce period close). New screen `/finance/accounting-config` (ADMIN/MANAGER only) — 3 preset cards + detail form + [Save].
  - **Finance sidebar group split** — single 16-item group reorganized into 3 sub-groups: `Finance · Cash` (8 items) / `Finance · Ledger` (4 items, includes AccountingConfig) / `Finance · Reports` (5 items — Trial Balance/PL/BS/CF/Closings). Visual separation improves navigation + onboarding for new users.
  - **21-step E2E** (`scripts/test-finance-e2e.ts` via `npx tsx`) — full Layer 1·5 integration: AccountingConfig creation, VAS 39 accounts/14 mappings verified, BankAccount, 4 auto-journals (sales/purchase/cash/expense), trial balance, income recognition, balance sheet A=L+E, cash flow net, verify OK, close + AMB freeze, post-close entry blocking (PERIOD_CLOSED throw), reopen + resume, K_IFRS preset apply, mapping change. 21/21 PASS.
- **v2.5.0 · 2026-05-03**: Finance **Layer 4 — Financial Statements + Period Close** introduced.
  - 4 new screens + APIs: `/finance/trial-balance` (Trial Balance — debit/credit totals per leaf account + balance check), `/finance/income-statement` (Income Statement — Revenue/Expense/Net Income, Print + Excel), `/finance/balance-sheet` (Balance Sheet — Assets/Liabilities/Equity with auto-rolled retained earnings + A=L+E balance-check badge), `/finance/cash-flow` (Cash Flow — direct method, source-classified for accounts 111/112).
  - Period close workflow (verify → close → reopen): `PeriodClose` model + `AccountMonthlyBalance` (monthly account-balance snapshots) + `assertPeriodOpen()` guard — when creating a JournalEntry, if entryDate falls in a CLOSED period it immediately throws `PERIOD_CLOSED:YYYY-MM`.
  - verify: balance-check on all POSTED entries within the period + scan for leftover DRAFTs. close: only allowed from VERIFIED, upserts AMB rows + sets isFrozen=true. reopen: ADMIN-only, requires reopen reason.
  - `/admin/closings` consolidated — new `Period Close (Layer 4)` card + recent 12-month history + legacy per-record lock card kept separate. Clicking a history row auto-fills the ym field.
  - Sidebar Finance group +4 items (⚖️ Trial Balance / 📊 Income Statement / 📑 Balance Sheet / 💵 Cash Flow). Each report has [Excel] + [🖨 Print] buttons. 50+ i18n keys vi/en/ko.
- **v2.4.0 · 2026-05-03**: Finance **Layer 3 — General Ledger** introduced. VAS (Vietnam Accounting Standards)-based ChartOfAccounts (39 accounts × 2 companies) + JournalEntry/JournalLine + AccountMapping (14 triggers).
  - Auto-journal hooks added to 5 modules: Sales / Purchase / CashTransaction / Expense / Payroll bulk-pay — every business transaction now spawns a `JournalEntry` with debit/credit lines, color-coded source badges.
  - Three new screens: `/finance/chart-of-accounts` (CoA — type filter + search + hierarchical indent), `/finance/journal-entries` (entry list with expandable lines + DRAFT→POSTED post / POSTED→REVERSED reverse actions), `/finance/account-mappings` (edit trigger→VAS code mappings).
  - Posting logic: Sales = DR 131(Receivable) / 3331(VAT out) | CR 5111(Revenue). Purchase = DR 156(Inventory) / 133(VAT deductible) | CR 331(Payable). Cash IN/OUT looks up contra account by category (SALES_COLLECTION/PAYROLL/EXPENSE). Expense with paymentStatus=PAID hits bank, otherwise CR 331. Payroll bulk-pay = DR 6421(Salary) | CR 112(Bank).
  - Sidebar Finance group +3 items (📒 Chart of Accounts / 📝 Journal Entries / 🔗 Account Mappings). 60+ i18n keys vi/en/ko. AccountStandard enum (VAS/K_IFRS/IFRS) — ready for K-IFRS preset extension.
- **v2.3.2 · 2026-05-03**: Bulk-fix of 8 of the 14 Layer 1·2 gaps.
  - PR payment modal (`/finance/payables/[id]`) now has a [Bank Account] dropdown — selecting one auto-creates the matching CashTransaction and syncs the account balance.
  - `/finance/expenses` list now shows paymentMethod and paymentStatus columns + status filter + [Reimburse] action button for PENDING_REIMBURSE rows.
  - New cron `/api/jobs/finance-monthly-snapshot` — runs 03:00 KST on the 1st, upserts last month's BankAccountMonthlySnapshot rows + recomputes Budget.actualAmount/variance + emits BUDGET_OVERRUN notifications.
  - `NotificationType` gains `CASH_SHORTAGE_ALERT` and `BUDGET_OVERRUN`. The cash-shortage-alert cron now actually sends 3-language notifications to all ADMIN users in the affected company.
  - `/finance/accounts` rows have inline [+ Deposit] [− Withdrawal] [↔ Transfer] actions with a modal — no need to leave the screen.
  - `/finance/profitability` has an [Excel Download] button.
  - New endpoint `/api/finance/bank-accounts/integrity-check` compares currentBalance cache vs computed openingBalance + sum(deposits) − sum(withdrawals).
  - The 6 remaining items (chart visuals, automatic indirect-cost allocation execution, etc.) will be folded into Layer 4.
- **v2.3.1 · 2026-05-03**: Expense registration UI enhancement — fills the gap from task 13 of Layer 1 (v2.2.0).
  - Symptom: the schema and API already accepted 6 new fields (paymentMethod / vendorClientId / vendorName / targetClientId / cashOut / cashOutAccountId) but the `/finance/expenses/new` form did not expose any inputs, so users couldn't actually use them.
  - Fix: added 3 new sections to `expense-new-form.tsx` — ① Payment info (5 methods + auto-derived status display), ② Vendor / Target Client (master dropdowns + direct vendor name input for tiny vendors like restaurants/gas stations), ③ Immediate Withdrawal (checkbox + account selector, only when payment method is corporate-card / bank-transfer / company-cash). Personal-prepaid methods now show a PENDING_REIMBURSE note guiding the user to the reimburse-approval page.
  - `new/page.tsx` now prefetches Client and BankAccount options.
- **v2.3.0 · 2026-05-03**: Finance Layer 2 — **Cost / Profitability management** (CostCenter + AllocationRule + Budget + ExpenseAllocation.costCenterId expansion + per-client profitability report).
  - New models: `CostCenter` (3 types: DEPARTMENT / BRANCH / PROJECT, unique [companyCode, code]), `AllocationRule` (DIRECT / INDIRECT / COMMON), `Budget` (monthly per cost center).
  - 2 new screens: `/finance/cost-centers` (CRUD + budget entry + actual vs budget variance), `/finance/profitability` (Revenue − Direct Cost − Indirect = Net Profit per client, with profit rate).
  - New APIs: cost-centers (GET/POST + [id] PATCH/DELETE), budgets (GET/POST upsert), profitability (joins Sales + Expense.targetClient + AsDispatchPart per client for the period).
  - 22 i18n keys vi/en/ko synced. 2 new items in the Finance sidebar group (🏢 Cost Centers, 📈 Client Profitability).
- **v2.2.0 · 2026-05-03**: Finance Layer 1 — **Cash management** (BankAccount / CashTransaction / BankAccountMonthlySnapshot) + **Expense expansion** (payment method/status, vendor, target client, reimbursement workflow) + **Payroll bulk-pay** + **Cash-shortage alert cron**.
  - 3 new screens: `/finance/accounts`, `/finance/cash-transactions`, `/finance/cash-dashboard` (balance + 7/14/30-day forecast + TOP10 receivables/payables + monthly trend).
  - New APIs: `/api/finance/bank-accounts`, `/api/finance/cash-transactions` (+ `/transfer`), `/api/finance/cash-dashboard`, `/api/finance/expenses/[id]/reimburse`, `/api/hr/payrolls/bulk-pay`, `/api/jobs/cash-shortage-alert`.
  - PrPayment accepts optional `bankAccountId` — when present, the same transaction creates a CashTransaction and updates `BankAccount.currentBalance` atomically.
  - Expense gets `cashOut` + `cashOutAccountId` — for company-funded payment methods (corporate card / bank transfer / company cash) the registration immediately withdraws from the chosen account.
  - 4 new enums (BankAccountType·CashTxnType·CashCategory·CashTxnStatus) + 2 for Expense payment.
  - 50+ new i18n keys synced across vi/en/ko. Three new items added to the Finance sidebar group.
- **v2.1.2 · 2026-05-03**: Discovered that the `enterWith` from v2.1.1 doesn't propagate across RSC concurrent-render boundaries. Chrome verification showed VR mode still listing the 123 TV sales rows.
  - Fix: Added `resolveSessionCompanyCode()` fallback inside the Prisma extension — when the ALS store is empty, it reads the `x-session-user` header directly via `next/headers` and parses `companyCode` from there.
  - Result: A single helper resolves the company code for Server Components, Route Handlers, cron jobs, and tests. The behaviour no longer depends on whether ALS propagates through the runtime.
- **v2.1.1 · 2026-05-03**: Server Component auto company-filter bug fix.
  - Symptom: After switching to VR, the sales list still showed the 123 TV rows.
  - Root cause: A server component that only calls `getSession()` (e.g. `/sales/page.tsx`) is not wrapped by `withSessionContext` so the ALS context is empty — the Prisma extension's `COMPANY_SCOPED_MODELS` filter therefore never fires.
  - Fix: `src/lib/session.ts` `getSession()` now calls `requestContextStore.enterWith(ctx)` to set a sticky ALS context. Route Handlers (already wrapped) are unaffected.
  - Effect: Every `prisma.X.findMany()` call inside any server component now picks up the company filter automatically.
- **v2.1.0 · 2026-05-03**: companyCode rollout across the schema — added to 34 models (Phase A 10 critical, B 15 portal/SNMP/yield, C 9 child denormalize). Prisma extension `COMPANY_SCOPED_MODELS` auto-injects `WHERE companyCode = session` for `findMany/findFirst/count`, and `data.companyCode` for `create` (when not set). ADMIN unified view (`companyCode=ALL`) bypasses the filter. `CodeSequence` migrated to composite PK `(companyCode, key)` so TV/VR auto-code sequences are separated.
- **v2.0.0 · 2026-05-02 (PM)**: 4-rule commit policy adopted — ① version bump + display at top of sidebar ② all 3 languages updated together ③ manual change-log entry kept in sync ④ Chrome verification required. New file `src/lib/version.ts`.
- **2026-05-02 (AM)**: This supplement issued. Part 6 Inventory fully rewritten, Appendices F~K added.
- **2026-05-01**: SUPPLIES itemType added (4 itemTypes total), TRANSFER Internal mode added, 4 rows added for purchase return/disposal/stock adjustment, truth table grew from 30 to 34 rows.
- **Late 2026-04**: 4-axis truth table introduced, ECOUNT 16-value enum retired.
- **Mid 2026-04**: NIIMBOT B21 label single-format 50×70mm portrait, color channel badges, EX/TLS ownership badges.
- **Early 2026-04**: QR multi-scan, status-based scenario recommendations.
