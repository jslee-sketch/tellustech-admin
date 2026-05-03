# Tellustech ERP Manual Supplement (v2 · 2026-05)

> This document fully replaces **Part 6 Inventory** of `A-employee-manual.md` and adds supplementary appendices (F~J). It accurately reflects the inbound/outbound flow after the complete redesign based on the 30+ row truth table.

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

- **2026-05-02**: This supplement issued. Part 6 Inventory fully rewritten, Appendices F~K added.
- **2026-05-01**: SUPPLIES itemType added (4 itemTypes total), TRANSFER Internal mode added, 4 rows added for purchase return/disposal/stock adjustment, truth table grew from 30 to 34 rows.
- **Late 2026-04**: 4-axis truth table introduced, ECOUNT 16-value enum retired.
- **Mid 2026-04**: NIIMBOT B21 label single-format 50×70mm portrait, color channel badges, EX/TLS ownership badges.
- **Early 2026-04**: QR multi-scan, status-based scenario recommendations.
