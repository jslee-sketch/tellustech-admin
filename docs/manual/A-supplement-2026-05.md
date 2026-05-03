# Tellustech ERP 매뉴얼 보강판 (v2 · 2026-05)

> 본 문서는 `A-employee-manual.md` 의 **6부 재고**를 완전히 대체하고, 추가 부록(F~J)을 더한 보강판입니다. 진리표 30+ 행 기반 완전 재설계 후의 입출고 흐름을 정확히 반영합니다.

---

# 6부. 재고 (완전 재작성)

재고 모듈은 4개 화면으로 구성됩니다.

| 화면 | 경로 | 용도 |
|---|---|---|
| **재고 현황** | `/inventory/stock` | 품목·창고별 보유 수량 + S/N¹ 단위 상세 |
| **입출고 등록** | `/inventory/transactions/new` | IN / OUT / TRANSFER 모든 시나리오 |
| **QR 스캔** | `/inventory/scan` | 카메라로 다중 S/N 누적 후 일괄 등록 |
| **QR 라벨 인쇄** | `/inventory/labels` | NIIMBOT B21² 50×70mm 세로형 라벨 |

> ¹ S/N = Serial Number(시리얼 번호). 자산 1대를 식별하는 고유 코드 (예: `TONER-BK-1777080756243-1`).
> ² NIIMBOT B21 = 50mm 폭 감열 라벨 프린터. PC·모바일 양쪽에서 동일하게 인쇄.

## 6.1 재고 현황 (`/inventory/stock`)

### 두 개의 탭

| 탭 | 의미 |
|---|---|
| **실시간 현황** | 품목 × 창고 매트릭스. `onHand` 즉시 합계 |
| **S/N 별 상세** | 그룹 행 클릭 시 펼쳐지는 S/N 목록. 체크박스로 다중 선택 → 헤더 `🏷 라벨 인쇄 (N장)` |

### S/N 마스터 상태(`InventoryStatus`)

| 상태 | 의미 | 대응 |
|---|---|---|
| `NORMAL` | 정상 — 즉시 출고 가능 | 그대로 사용 |
| `NEEDS_REPAIR` | 수리 필요 | OUT/REPAIR/REQUEST 로 외주 의뢰 |
| `PARTS_USED` | 부품 사용됨 | 분해(SPLIT) 후 잔여 본체 archive |
| `IRREPARABLE` | 폐기 대상 | OUT/TRADE/OTHER (폐기) |

### 외부 자산 표시

S/N 우측에 `🏷 외부자산` (warning 색) 배지 + 소유주 거래처 라벨이 자동으로 보입니다. `ownerType=EXTERNAL_CLIENT` 인 자산(고객 수리·외주 데모기 등) 입니다.

---

## 6.2 입출고 등록 — Case-by-Case 완전 가이드 (`/inventory/transactions/new`)

### 핵심 개념 — 4축 진리표³

모든 입출고는 **4개 축**의 조합으로 결정됩니다:

```
( txnType  ×  referenceModule  ×  subKind  ×  ownerType ) → 처리 규칙
   ↑              ↑                  ↑           ↑
  IN/OUT/      RENTAL·REPAIR·     REQUEST·    COMPANY/
  TRANSFER     CALIB·DEMO·        RETURN·     EXTERNAL_
               TRADE·CONSUMABLE   PURCHASE·   CLIENT
                                  SALE·BORROW·
                                  LEND·OTHER·
                                  CONSUMABLE·
                                  LOSS·SPLIT·ASSEMBLE
```

> ³ 진리표 = `src/lib/inventory-rules.ts` 의 `BASE_RULES` 객체. 현재 30+ 행 정의됨. 사용자는 직접 4축을 입력하지 않고, **시나리오 콤보**(아래)를 고르면 자동으로 4축이 결정됩니다.

### 1단계 — 거래 유형(`txnType`) 선택

화면 최상단 셀렉터.

| 유형 | 의미 | 후속 입력 |
|---|---|---|
| **IN (입고)** | 자사 창고로 들어옴 | `toWarehouseId` 필수. 외부 자산이면 `clientId` 추가 |
| **OUT (출고)** | 자사 창고에서 나감 | `fromWarehouseId` + `clientId` 필수 |
| **TRANSFER (이동)** | 위치만 변경 (자사↔자사 또는 외주↔외주) | 모드 자동 분기 (1.5절 참조) |

### 2단계 — 시나리오 콤보 선택

거래 유형을 고르면 **그 유형에서 가능한 콤보 N개**만 두 번째 셀렉터에 표시됩니다.

#### IN 콤보 (총 11종)

| 라벨 (KO) | 진리표 키 | masterAction⁴ | 자동 PR⁵ | 비고 |
|---|---|---|---|---|
| 렌탈/입고/종료 — 자사 렌탈 회수 | `IN\|RENTAL\|RETURN\|COMPANY` | MOVE | — | 외부에 있던 자사 자산이 돌아옴 |
| 렌탈/입고/매입 — 외주에서 빌림 | `IN\|RENTAL\|BORROW\|EXTERNAL_CLIENT` | NEW | 매입후보 | 외부 자산 신규 등록 |
| 수리/입고/요청 — 고객 수리 의뢰 | `IN\|REPAIR\|REQUEST\|EXTERNAL_CLIENT` | NEW | — | 고객 자산 입고 |
| 수리/입고/매입 — 외부수리 후 회수 | `IN\|REPAIR\|RETURN\|*` | MOVE | (자사) 매입후보 | 자사·고객 모두 가능 |
| 교정/입고/요청 — 고객 교정 의뢰 | `IN\|CALIB\|REQUEST\|EXTERNAL_CLIENT` | NEW | — | 〃 |
| 교정/입고/매입 — 외부교정 후 회수 | `IN\|CALIB\|RETURN\|*` | MOVE | (자사) 매입후보 | 〃 |
| 데모/입고/요청 — 외부에서 빌림 | `IN\|DEMO\|BORROW\|EXTERNAL_CLIENT` | NEW | — | 외부 데모기 입고 |
| 데모/입고/종료 — 자사 데모 회수 | `IN\|DEMO\|RETURN\|COMPANY` | MOVE | — | 자사 데모기 복귀 |
| 매입 — 자사 자산 신규 | `IN\|TRADE\|PURCHASE\|COMPANY` | NEW | — | Purchase 모듈에서 자동 호출 |
| 재고조정 — 발견 (실사 추가) | `IN\|TRADE\|OTHER\|COMPANY` | NEW | — | 실사 시 장부에 없던 실물 발견 |
| 조립 — 본체 신규 (부품은 별도 OUT) | `IN\|TRADE\|ASSEMBLE\|COMPANY` | NEW | — | 부품 N개 → 본체 1대로 합침 |

> ⁴ **masterAction**: InventoryItem 마스터에 가하는 동작.
>   - `NEW`: 마스터 신규 생성
>   - `MOVE`: warehouseId 갱신 (자사 창고 변경)
>   - `ARCHIVE`: archivedAt 스탬프 (비활성화)
>   - `TRANSFER_LOC`: currentLocationClientId 갱신 (외부 위탁 표시)
>   - `NONE`: 마스터 불변

> ⁵ **자동 PR**(PayableReceivable) = 매입·매출 후보. DRAFT(amount=0) 로 자동 생성되어 재경 담당자가 금액을 확정 → OPEN 으로 승급.

#### OUT 콤보 (총 14종)

| 라벨 (KO) | 진리표 키 | masterAction | 자동 PR |
|---|---|---|---|
| 렌탈/출고/반납 — 외주에 반납 | `OUT\|RENTAL\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | — |
| 렌탈/출고/매출 — 자사 → 고객 | `OUT\|RENTAL\|LEND\|COMPANY` | TRANSFER_LOC | 매출후보 |
| 수리/출고/의뢰 — 외주 수리 위탁 | `OUT\|REPAIR\|REQUEST\|*` | TRANSFER_LOC | — |
| 수리/출고/매출 — 고객 반환 + 수리비 청구 | `OUT\|REPAIR\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | 매출후보 |
| 교정/출고/의뢰 — 외부 교정 위탁 | `OUT\|CALIB\|REQUEST\|*` | TRANSFER_LOC | — |
| 교정/출고/매출 — 고객 반환 + 교정비 청구 | `OUT\|CALIB\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | 매출후보 |
| 데모/출고/요청 — 자사 → 고객 | `OUT\|DEMO\|LEND\|COMPANY` | TRANSFER_LOC | — |
| 데모/출고/종료 — 외부에 반환 | `OUT\|DEMO\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | — |
| 매출 — 자사 자산 출고 | `OUT\|TRADE\|SALE\|COMPANY` | ARCHIVE | — (Sales 모듈 발행) |
| 매입 반품 — 공급처로 반환 | `OUT\|TRADE\|RETURN\|COMPANY` | ARCHIVE | — |
| 폐기 / 스크랩 | `OUT\|TRADE\|OTHER\|COMPANY` | ARCHIVE | — |
| 재고조정 — 유실 (실사 부재) | `OUT\|TRADE\|LOSS\|COMPANY` | ARCHIVE | — |
| 분해 — 본체 archive (부품은 별도 IN) | `OUT\|TRADE\|SPLIT\|COMPANY` | ARCHIVE | — |
| 소모품 출고 (AS⁶ 부품 등) | `OUT\|CONSUMABLE\|CONSUMABLE\|COMPANY` | NONE | — |

> ⁶ AS = After-Service. 고객 장비 수리·점검·소모품 교체 등 사후 서비스.

#### TRANSFER 콤보 (총 5종 — 모드 자동 분기)

| 라벨 (KO) | 진리표 키 | 모드 | 입력 |
|---|---|---|---|
| **내부재고이동** (자사 ↔ 자사) | `TRANSFER\|TRADE\|OTHER\|COMPANY` | **Internal** | `from/toWarehouseId` 둘 다 |
| 외부 ↔ 외부 (렌탈) | `TRANSFER\|RENTAL\|OTHER\|EXTERNAL_CLIENT` | **External** | `from/toClientId` 둘 다 |
| 외부 ↔ 외부 (수리) | `TRANSFER\|REPAIR\|OTHER\|EXTERNAL_CLIENT` | External | 〃 |
| 외부 ↔ 외부 (교정) | `TRANSFER\|CALIB\|OTHER\|EXTERNAL_CLIENT` | External | 〃 |
| 외부 ↔ 외부 (데모) | `TRANSFER\|DEMO\|OTHER\|EXTERNAL_CLIENT` | External | 〃 |

### 3단계 — 시나리오에 따른 입력 칸 자동 분기

콤보를 고르는 순간 **추가 입력 영역**이 자동으로 바뀝니다 (가시성·필수 여부 모두 변함).

| 보이는 칸 | IN | OUT | TRANSFER (Internal) | TRANSFER (External) |
|---|---|---|---|---|
| 도착 창고 (`toWarehouseId`) | ✅ 필수 | — | ✅ 필수 | — |
| 출발 창고 (`fromWarehouseId`) | — | ✅ 필수 | ✅ 필수 | — |
| 거래처 (`clientId`) | (외부 자산일 때) | ✅ 필수 | — | — |
| 출발 거래처 (`fromClientId`) | — | — | — | ✅ 필수 |
| 도착 거래처 (`toClientId`) | — | — | — | ✅ 필수 |
| 헤더 메모 (`note`) | 옵션 | 옵션 | 옵션 | 옵션 |

### 4단계 — 라인 등록 (한 트랜잭션 = N 라인)

본 트랜잭션에 포함될 품목 N개를 카드형 리스트로 추가 (최대 1,000줄).

#### 라인별 칸과 제약

| 칸 | 의미 | 필수 여부 |
|---|---|---|
| 품목 (`itemId`) | ItemCombobox | 항상 필수 |
| S/N (`serialNumber`) | SerialCombobox | **itemType 별로 다름** (아래) |
| 수량 (`quantity`) | 양수 | 항상 필수 (S/N 있는 경우 1 고정) |
| 대상 장비 SN (`targetEquipmentSN`) | 소모품 출고 시: 어느 장비에 들어갔는지 | `subKind=CONSUMABLE` 일 때만 필수 |
| 라인 메모 (`note`) | 자유 | 옵션 |

#### S/N 필수성 — itemType 기준

| itemType⁷ | S/N 입력 | 비고 |
|---|---|---|
| `PRODUCT` (상품) | **필수** | 본체 장비 — 1대 = 1 S/N |
| `CONSUMABLE` (소모품) | **필수** | 토너 카트리지 등 — 매입 시 1상자 = 1 S/N |
| `PART` (부품) | **필수** | Fuser/Drum 등 — 1개 = 1 S/N |
| `SUPPLIES` (비품) | 옵션 | A4용지·청소도구 등 — 수량만 사용 |

> ⁷ itemType 은 품목 등록(`/master/items`) 시 결정됩니다. SUPPLIES 는 4번째 유형으로 2026-05 추가됨.

#### 분해/조립 — 한 트랜잭션 안에 여러 라인

- **분해**: 라인 1 = 본체 OUT/TRADE/SPLIT (S/N 필수). 라인 2~N = 부품 IN/TRADE/OTHER (각 부품 S/N 신규 등록).
- **조립**: 라인 1 = 본체 IN/TRADE/ASSEMBLE (S/N 신규). 라인 2~N = 부품 OUT/TRADE/OTHER.

> 한 트랜잭션 노트에 부모-자식 관계를 메모로 남겨두면 추적이 쉬워집니다.

### 5단계 — 저장 시 일어나는 일

```
[저장] 클릭
  ↓
1. 헤더 가드 검증 (창고/거래처 존재성, 동일 endpoint 차단 등)
  ↓
2. 라인별 진리표 룩업 (BASE_RULES[txnType|refModule|subKind|ownerType])
  ↓
3. 단일 prisma.$transaction({ timeout: 30s }) 안에서:
   ① InventoryTransaction 행 생성
   ② masterAction 별 InventoryItem 갱신
      - NEW       → 신규 마스터 INSERT
      - MOVE      → warehouseId 변경
      - ARCHIVE   → archivedAt 스탬프
      - TRANSFER_LOC → currentLocationClientId/SinceAt 변경
   ③ autoPurchaseCandidate / autoSalesCandidate → PayableReceivable DRAFT 자동 생성 (sourceInventoryTxnId 역추적)
  ↓
4. 응답: { count: N }
```

---

## 6.3 QR 다중 스캔 (`/inventory/scan`)

스캐너 켜진 상태에서 여러 S/N 을 연속 스캔 → 누적 → 헤더 결정 후 일괄 등록.

### 흐름

```
[📷 카메라 시작 (오버레이 탭)]
  ↓ S/N 스캔 (1초마다 1건 가능, 1.5초 쿨다운, 동일 SN 자동 차단)
  ↓
스캔 1건 = /api/inventory/sn/{sn}/state 호출
  ↓ 마스터 상태 분류:
     NEW / OWN_IN_STOCK / OWN_AT_EXTERNAL /
     EXTERNAL_IN_STOCK / EXTERNAL_AT_VENDOR / ARCHIVED
  ↓ 추천 시나리오 자동 도출 (상태별 4~7개)
  ↓ 첫 스캔: txnType + comboKey + 창고/거래처 자동 prefil
  ↓
스캐너 침묵 → 사용자가 시나리오 콤보 검토·수정
  ↓
[저장] → /api/inventory/transactions/bulk 일괄 등록
```

### 마스터 상태별 추천 시나리오

| 상태 | 추천 콤보 |
|---|---|
| **NEW** (DB에 없음) | IN/RENTAL/BORROW · IN/REPAIR/REQUEST · IN/CALIB/REQUEST · IN/DEMO/BORROW · IN/TRADE/PURCHASE |
| **OWN_IN_STOCK** | OUT/RENTAL/LEND · OUT/REPAIR/REQUEST · OUT/CALIB/REQUEST · OUT/DEMO/LEND · OUT/TRADE/SALE · OUT/TRADE/RETURN · OUT/TRADE/OTHER · TRANSFER/TRADE/OTHER |
| **OWN_AT_EXTERNAL** | IN/RENTAL/RETURN · IN/REPAIR/RETURN · IN/CALIB/RETURN · IN/DEMO/RETURN |
| **EXTERNAL_IN_STOCK** | OUT/REPAIR/RETURN · OUT/CALIB/RETURN · OUT/RENTAL/RETURN · OUT/DEMO/RETURN · OUT/REPAIR/REQUEST · OUT/CALIB/REQUEST |
| **EXTERNAL_AT_VENDOR** | IN/REPAIR/RETURN · IN/CALIB/RETURN |
| **ARCHIVED** | (추천 없음 — 비활성 자산) |

### UX 가이드

- **녹색 플래시 + 진동 60ms** = 정상 인식. 동일 SN 재스캔 시 무반응 (의도된 dedupe).
- **목록에서 ✕** = 잘못 스캔된 항목 즉시 제거.
- **시나리오가 도중에 바뀌면** 기존 항목 그대로 유지, 새 시나리오로 등록.

---

## 6.4 QR 라벨 인쇄 (`/inventory/labels`)

50×70mm 세로형 단일 규격. 1 라벨 = 1 페이지. PC 직접 인쇄 또는 모바일 PNG 저장.

### 라벨 구성

```
┌──────────────────────┐  50mm
│                      │
│       ███QR███       │  44mm × 44mm (정사각, 상단 중앙)
│       ███████        │
│       ███████        │
│                      │
├──────────────────────┤
│ ITM-XXX  [C] [TLS]   │  itemCode + 컬러배지⁸ + 소유배지⁹
│ Item Name            │  itemName (bold)
│ S/N: XXX-YY-ZZZZ     │  S/N (mono)
│ WH-A · 메인창고       │  위치/출처 (small)
└──────────────────────┘  70mm
```

> ⁸ 컬러 배지 = 토너 채널 표시 (K=BLACK·검정, C=CYAN·청록, M=MAGENTA·자주, Y=YELLOW·노랑, D=DRUM·드럼, F=FUSER·정착기). 컬러 전사지 사용 시 그대로 인쇄, 흑백 전사지에서는 OS 가 자동 grayscale 변환.

> ⁹ 소유 배지: `[TLS]` = 자사 자산 (Tellustech), `[EX]` = 외부 자산 (검은 배경 + 흰 글자).

### 인쇄 다이얼로그 설정 (필수)

OS 인쇄 다이얼로그에서 **반드시** 다음 값으로:
- 프린터: NIIMBOT B21 (또는 Chrome '🅿 PDF로 저장')
- 용지: **사용자 정의 50×70mm 세로**
- 여백: **없음**
- 배율: **100%**

> A4/Letter 를 선택하면 라벨이 모서리에 작게 인쇄되며 빈 페이지가 추가될 수 있습니다. 화면 상단 노란 박스에 안내가 항상 표시됩니다.

### 모바일 사용

행별 `📸` 아이콘 또는 `📸 전체 PNG 저장` 버튼 → 200dpi PNG 저장 → 갤러리에서 NIIMBOT 앱·시스템 인쇄 호출.

### URL 프리필 모드 (4가지)

| 쿼리 | 의미 |
|---|---|
| `?sns=SN1,SN2,...` | S/N 다건 — 마스터에서 모든 정보 자동 조회 |
| `?items=ITM1,ITM2,...` | 품목 ID 다건 — itemCode·itemName·colorChannel |
| `?purchaseId=...` | 매입 1건 — 매입처/매입번호 헤더 + 모든 라인 |
| `?itemCode=&sn=` | 단건 (레거시 호환) |

---

# 부록 F — ERP 흐름 도식 (한페이지 가이드)

## F.1 모듈 간 데이터 흐름

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  거래처      │     │   품목      │     │   창고       │
│ /master/    │     │ /master/    │     │ /master/    │
│ clients     │     │ items       │     │ warehouses  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
        ┌──────────────────────────────────┐
        │  InventoryItem (S/N 마스터)        │
        │   ┌─ ownerType (COMPANY/EXT)      │
        │   ├─ warehouseId (현재 보관 창고)  │
        │   ├─ currentLocationClientId      │
        │   │   (외부 위탁 위치)             │
        │   └─ archivedAt                   │
        └─────┬───────────┬──────────┬──────┘
              │           │          │
        IN/OUT/         자산위치     자산상태
        TRANSFER        업데이트     변경
              │           │          │
              ▼           ▼          ▼
   ┌───────────────────────────────────────────────────┐
   │  InventoryTransaction (4축 룰 기반)                │
   │   txnType × refModule × subKind × ownerType        │
   │   → masterAction + autoPurchase/Sales 결정         │
   └────┬───────────────┬─────────────┬─────────────────┘
        │               │             │
   매입후보         매출후보       마스터 갱신
        ▼               ▼             ▼
   ┌────────┐    ┌────────┐    ┌──────────┐
   │ Purchase│    │ Sales  │    │위치/상태   │
   │ DRAFT   │    │ DRAFT  │    │ 자동 변경 │
   └────┬───┘    └────┬───┘    └──────────┘
        │             │
   재경 확정     재경 확정
        ▼             ▼
   ┌────────┐    ┌────────┐
   │ 미지급금 │    │ 미수금  │
   └────────┘    └────────┘
```

## F.2 S/N 추적 흐름

S/N 1건이 시스템 전체에서 어떻게 연결되는지:

```
                S/N (예: TONER-BK-1777080756243-1)
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
  InventoryItem      InventoryTransaction   ItContractEquipment
  (1행 - 마스터)      (N행 - 거래 기록)      (계약에 등록된 경우)
       │                  │                  │
       │                  ▼                  │
       │           PayableReceivable          │
       │           (매입/매출 후보)           │
       │                                     │
       ▼                                     ▼
  QR 라벨 표시                          IT 계약 (`/rental/it-contracts`)
  (`?sns=...`)                          + Amendment 이력
       │                                     │
       ▼                                     ▼
   /inventory/scan                      매월 청구·정산
   상태 기반 추천                        (월간 빌링)
```

**핵심**: S/N 만 알면 `/inventory/scan` 또는 `?sns=` 한 번으로 그 자산의 모든 이력(소유주, 위치, 활성 계약, 매입·매출, 라벨)이 한꺼번에 조회됩니다.

---

# 부록 G — 주요 기능 요약 (한페이지)

## 매스터
- **거래처** (`/master/clients`) — 매입처·매출처·외주처 통합. `clientCode` 자동(`CL-YYMMDD-###`).
- **품목** (`/master/items`) — 4종 itemType (PRODUCT/CONSUMABLE/PART/**SUPPLIES**), BOM 부모-자식, 호환 매핑, 컬러 채널.
- **창고** (`/master/warehouses`) — INTERNAL(자사)/EXTERNAL(외주처).
- **직원** (`/master/employees`) — 사원코드 자동(`TNV-###` / `VNV-###` 회사별).
- **부서·프로젝트·일정·라이선스** — 보조 마스터.

## 영업
- **매출** (`/sales`) — TRADE 자동 출고. S/N 강제. PR 매출후보 자동.
- **매입** (`/purchases`) — TRADE 자동 입고. NEW 마스터 생성.
- **견적 요청** (`/admin/quotes`) — 고객 의향서 → 매출 전환.
- **수정·환불** — Sales/Purchase Adjustments. 반품·교환·부분 처리.

## 렌탈
- **IT 계약** (`/rental/it-contracts`) — 본체 + 소모품 자동 단가 매핑. Amendment 이력.
- **TM 렌탈** (`/rental/tm-rentals`) — 단기 렌탈. `rentalCode = TM-YYMMDD-###`.
- **SNMP 자동수집** — Windows Agent + 토큰 인증 → 사용량 확인서 PDF.
- **소모품 적정율** (`/admin/yield-analysis`) — 정격 출력 대비 실사용 비교, 부정 의심 알림.

## A/S
- **티켓 접수** (`/as/tickets`) — 고객 요청 + 사진 첨부.
- **디스패치** (`/as/dispatches`) — 출동 + 부품 사용 + S/N 추적.

## 재고 (이 챕터)
- 재고 현황·입출고·QR 스캔·QR 라벨 — 4축 진리표 기반.

## 인사
- 입사·퇴사·사건평가·정기평가·연차·급여.

## 재경
- 미수금/미지급금 (PR DRAFT → OPEN → PARTIAL → PAID 워크플로).
- 매출 재경 CFM, 회계마감, 경비.

## 회의·캘린더·메시징
- 캘린더, 채팅 (3언어 자동번역).

## 고객 포탈 운영
- 포탈 포인트·배너·게시글 (월요일 09:00 KST AI 자동 생성).
- 고객 의견·서베이·업체 추천.

## 통계 (`/stats`)
- 모듈별 KPI 대시보드.

## 관리
- 감사로그·권한관리·휴지통.

---

# 부록 H — 색인 (Glossary · 알파벳순)

| 용어 | 설명 |
|---|---|
| **4축 진리표** | (txnType × referenceModule × subKind × ownerType) 키로 입출고 동작을 결정하는 룰 테이블. `BASE_RULES` 객체. |
| **AS** | After-Service. 사후 고객 서비스 (수리·소모품 교체 등). |
| **AUTO PR DRAFT** | 매입·매출 후보가 자동 생성되는 PayableReceivable 행. amount=0 으로 초안 → 재경이 금액 확정. |
| **Amendment** | IT 계약 변경 이력 (장비 추가/교체/제거). 입출고 등록 시 자동 생성 가능. |
| **archivedAt** | 마스터 비활성화 시점. 자산 매각·반환·폐기 후 NULL이 아닌 값. |
| **BASE_RULES** | `src/lib/inventory-rules.ts` 의 진리표 객체. 30+ 행. |
| **BOM** | Bill of Materials. 부모 품목 — 자식 품목 관계. |
| **CFM** | Confirm. 매출/일정 확정 단계. |
| **CL-YYMMDD-###** | 거래처 자동코드. |
| **ColorChannel** | 토너 채널 (BLACK/CYAN/MAGENTA/YELLOW/DRUM/FUSER/NONE). 라벨 컬러 배지로 표시. |
| **COMPANY** | OwnerType — 자사 자산. |
| **CONSUMABLE** | itemType — 소모품 (토너 등). 또는 OUT 의 sub-kind. |
| **CRUD** | Create/Read/Update/Delete. 기본 데이터 조작 4종. |
| **currentLocationClientId** | 외부 위탁 시 마스터의 현재 위치(거래처 ID). 회수 시 NULL 복원. |
| **DEMO** | refModule — 데모기 시연. |
| **DRAFT** | PR 의 초기 상태. amount=0 → 재경 확정 시 OPEN. |
| **ECOUNT** | 기존 ERP. 마이그레이션 시 XLSX export 사용. |
| **EX** | External. 라벨의 외부자산 배지. 검은 배경+흰 글자. |
| **EXTERNAL_CLIENT** | OwnerType — 외부(고객·외주처) 자산. |
| **fromClientId** | TRANSFER External 모드의 출발 거래처. |
| **fromWarehouseId** | OUT 또는 TRANSFER Internal 모드의 출발 창고. |
| **i18n** | Internationalization. 다국어 처리. 본 ERP 는 vi/en/ko 3언어. |
| **IN** | txnType — 입고. |
| **inboundReason** | 마스터에 기록된 입고 사유 (legacy enum). |
| **InventoryItem** | S/N 1건당 1행 마스터 테이블. |
| **InventoryTransaction** | 입출고 거래 기록 (event log). |
| **IRREPARABLE** | InventoryStatus — 폐기 대상. |
| **IT 계약** | 복사기·프린터 등 IT 장비 임대 계약. `TLS-YYMMDD-###`. |
| **itemType** | PRODUCT/CONSUMABLE/PART/**SUPPLIES** 4종. |
| **JSON** | JavaScript Object Notation. 데이터 교환 포맷. |
| **KST** | Korea Standard Time (UTC+9). |
| **lockedAt** | 회계마감 시점. NULL이 아니면 변경 불가. |
| **MOVE** | masterAction — 자사 창고 변경. |
| **NEW** | masterAction — 마스터 신규 생성. |
| **NIIMBOT B21** | 50mm 폭 감열 라벨 프린터. |
| **NORMAL** | InventoryStatus — 정상. |
| **OFF-YYMMDD-###** | 퇴사 자동코드. |
| **ON BORROW** | DEMO/RENTAL 외부에서 빌림. |
| **ONB-YYMMDD-###** | 입사 자동코드. |
| **onHand** | 재고 현황의 보유 수량 컬럼. |
| **OUT** | txnType — 출고. |
| **ownerClientId** | EXTERNAL_CLIENT 자산의 소유주 거래처 ID. |
| **ownerType** | COMPANY / EXTERNAL_CLIENT. |
| **PARTS_USED** | InventoryStatus — 부품 사용됨 (분해 후). |
| **PayableReceivable (PR)** | 미지급금/미수금 통합 테이블. |
| **PartialAmendment** | IT 계약 부분 변경. |
| **PNG** | Portable Network Graphics. 라벨 모바일 저장 포맷. |
| **prefill** | URL 쿼리·QR 스캔 결과로 폼이 자동 채워지는 동작. |
| **REPAIR** | refModule — 수리. |
| **RENTAL** | refModule — 임대. |
| **S/N** | Serial Number. 1자산 = 1S/N. 시스템 전체의 키. |
| **scenarioId** | 진리표 행 식별자 (1~28). |
| **SNMP** | Simple Network Management Protocol. 프린터 카운터 자동 수집. |
| **SUPPLIES** | itemType — 비품 (수량 기반, S/N 옵션). |
| **TLS** | Tellustech 자사 라벨 배지. |
| **TM 렌탈** | 단기 임대. TM-YYMMDD-### 자동코드. |
| **toClientId** | TRANSFER External 모드의 도착 거래처. |
| **toWarehouseId** | IN 또는 TRANSFER Internal 모드의 도착 창고. |
| **TRADE** | refModule — 매입/매출/반품/폐기/조립/분해 통합. |
| **TRANSFER** | txnType — 이동 (자사↔자사 또는 외주↔외주). |
| **TRANSFER_LOC** | masterAction — 외부 위탁 위치 갱신. |
| **txnType** | InventoryTransaction.txnType (IN/OUT/TRANSFER). |
| **YieldBadge** | 적정율 배지 (BLUE/GREEN/YELLOW/ORANGE/RED). |

---

# 부록 I — 약어 표

| 약어 | 풀이 |
|---|---|
| **AS** | After-Service |
| **BOM** | Bill of Materials |
| **CFM** | Confirm |
| **CRUD** | Create/Read/Update/Delete |
| **DRAFT** | PayableReceivable 초기 상태 |
| **ERP** | Enterprise Resource Planning |
| **EX** | External (외부) |
| **HMR** | Hot Module Replacement (개발용) |
| **IT** | Information Technology |
| **JSON** | JavaScript Object Notation |
| **KST** | Korea Standard Time |
| **OAuth** | Open Authorization |
| **PR** | PayableReceivable |
| **PDF** | Portable Document Format |
| **PNG** | Portable Network Graphics |
| **QR** | Quick Response (code) |
| **RFC** | Request For Comments (인터넷 표준) |
| **S/N** | Serial Number |
| **SNMP** | Simple Network Management Protocol |
| **SSO** | Single Sign-On |
| **TLS** | Tellustech (자사 약어) |
| **TM** | Tellustech 단기 렌탈 |
| **TV** | Tellustech Vina (베트남 법인) |
| **VR** | Vietrental (베트남 법인) |
| **UI** | User Interface |
| **UX** | User Experience |
| **UTC** | Coordinated Universal Time |
| **XLSX** | Excel 스프레드시트 포맷 |

---

# 부록 J — FAQ · 자주 묻는 질문

### Q1. 매입 모듈에서 자동 생성된 IN 트랜잭션을 직접 입출고 폼에서 수정할 수 있나요?
**아니요**. Purchase 모듈을 통해 생성된 트랜잭션은 Sales/Purchase Adjustments 화면에서만 수정·반품 가능합니다. 입출고 폼은 신규 등록만 담당.

### Q2. S/N이 잘못 등록된 경우 어떻게 수정하나요?
관리자 페이지의 휴지통(`/admin/trash`)에서 7일 이내 복원 가능합니다. 7일 경과 시 새 S/N으로 IN/TRADE/OTHER (재고조정 발견)으로 다시 등록.

### Q3. 외부 자산(고객 수리품)이 우리 창고에 있을 때 매입금이 발생하나요?
**아니요**. `ownerType=EXTERNAL_CLIENT` 로 등록되며 자동 PR(매입후보)도 생성되지 않습니다. 우리는 보관만 할 뿐.

### Q4. 분해 후 부품을 다시 조립할 수 있나요?
가능합니다. 같은 거래에서 부품 N개를 OUT/TRADE/OTHER + 본체를 IN/TRADE/ASSEMBLE 로 한 번에 처리. 단, 시스템상 부모-자식 관계는 자동 추적되지 않으므로 트랜잭션 노트에 메모 권장.

### Q5. 라벨 인쇄가 A4 한 페이지에 작게 나옵니다.
OS 인쇄 다이얼로그에서 용지 크기를 사용자 정의 50×70mm 세로로 변경하지 않으셨습니다. 화면 상단 노란 안내 박스를 따라주세요.

### Q6. QR 스캔 후 같은 라벨이 계속 추가됩니다.
이전 버그로 dedupe 가 동작하지 않았던 시기가 있었습니다. 2026-05 이후로는 1.5초 쿨다운 + inflight 가드 + 녹색 플래시 피드백으로 해결되었습니다.

### Q7. SUPPLIES (비품) 는 어디에 등록하나요?
`/master/items/new` 의 itemType 셀렉트에서 "비품 (수량)" 선택. 매입·재고 모두 S/N 입력 없이 수량만 사용.

### Q8. 두 법인(TV/VR) 간 자산 이관은?
거래처 간 매출/매입 로직으로 처리합니다. TV → VR 매출 + VR → TV 매입을 동시 등록. 별도 워크플로 없음.

---

# 부록 K — 변경 이력 (2026-05 보강)

- **2026-05-02**: 본 보강판 발행. 6부 재고 완전 재작성, 부록 F~K 추가.
- **2026-05-01**: SUPPLIES itemType 추가 (4종 itemType), TRANSFER Internal 모드 추가, 매입반품/폐기/재고조정 4행 추가, 진리표 30→34행.
- **2026-04 후반**: 4축 진리표 도입, ECOUNT 16-value enum 폐기.
- **2026-04 중반**: NIIMBOT B21 라벨 50×70mm 세로형 단일 규격, 컬러 채널 배지, EX/TLS 소유 배지.
- **2026-04 초반**: QR 다중 스캔, 상태 기반 시나리오 추천.
