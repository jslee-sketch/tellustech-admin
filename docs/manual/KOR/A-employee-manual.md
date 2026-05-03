---
title: "Tellustech ERP — 사용설명서"
subtitle: "사내 직원용 (사원·대리·매니저)"
author: "Tellustech IT 팀"
date: "2026-04"
lang: ko
---

# 머리말

> **본 문서의 위치**
> 이 문서는 사내 직원이 일상적으로 사용하는 모든 모듈의 사용법을 다룹니다.
> 관리자 전용 기능(권한관리·회계마감·휴지통·감사로그·호환매핑·통계 깊이 분석)은 별책 **B — 관리자 매뉴얼**을 참고하세요.
> 고객사가 사용하는 포탈은 별책 **C — 고객 포탈 가이드**가 따로 있습니다.

본 ERP 는 **Tellustech Vina (TV)** 와 **Vietrental (VR)** 두 법인을 단일 시스템에서 운영합니다.
모든 화면은 **한국어 / Tiếng Việt / English** 3개 언어와 **다크 / 라이트** 두 테마를 지원합니다.

---

# 1부. 시작하기

## 1.1 ERP 접속과 로그인

브라우저(Chrome / Edge / Safari) 에서 안내된 ERP 주소로 접속합니다.

```
https://tellustech-admin-production.up.railway.app
```

> 정확한 도메인은 IT 팀에 확인하세요. 고객 포탈은 다른 도메인을 사용합니다.

로그인 화면에서 다음 4개 항목을 입력합니다.

| 항목 | 예시 / 선택 |
|---|---|
| **회사코드** | `TV` (Tellustech Vina) 또는 `VR` (Vietrental) |
| **아이디** | (IT 팀 발급) |
| **비밀번호** | (IT 팀 발급) |
| **언어** | Tiếng Việt / 한국어 / English |

> **회사코드는 세션 전체에 고정**됩니다. 다른 회사 데이터를 보려면 로그아웃 후 다시 로그인하거나, 권한이 있다면 사이드바 회사 picker(§1.4)로 전환합니다.

## 1.2 첫 로그인 후 해야 할 일

1. **비밀번호 변경** — IT 팀이 발급한 임시 비밀번호는 즉시 본인이 기억할 수 있는 값으로 바꿉니다.
2. **본인 정보 확인** — `직원 (👤)` 메뉴에서 본인 카드가 본인 부서·법인 아래에 등록돼 있는지 확인합니다. 누락되어 있으면 인사 담당자에게 등록을 요청합니다.
3. **언어·테마 선택** — 사이드바 상단 국기 3개 중 하나를 눌러 표시 언어를, 사이드바 하단 ☀ / 🌙 버튼으로 테마를 결정합니다. 두 설정은 모두 사용자 단위로 저장됩니다.

## 1.3 언어 전환과 다크모드

- **언어**: 사이드바 상단의 둥근 SVG 국기 3개 (🇻🇳 / 🇺🇸 / 🇰🇷). 활성된 언어는 발광 테두리로 강조됩니다. 누르면 즉시 페이지가 새로고침되며 메뉴·라벨·메시지가 바뀝니다.
- **다크 / 라이트 모드**: 사이드바 하단 `☀ Light` / `🌙 Dark` 토글. 기본은 다크입니다. 선택은 브라우저(`localStorage`) 에 저장돼 다음 접속에도 유지됩니다.

> 자유서술 입력(AS 증상·평가·사건 등)은 한 언어로만 작성하면 시스템이 나머지 두 언어로 자동 번역해 보관합니다(§A 부록 C 참조).

## 1.4 화면 구성 (사이드바·메인)

화면은 좌측 **사이드바**와 우측 **메인 영역** 2단 구성입니다.

### 사이드바 — 위에서부터

1. **로고 / 접기 토글** — `TTS` 로고 + `‹ / ›` 버튼. 접기 모드에서는 아이콘만 남습니다.
2. **언어 선택** — 둥근 SVG 국기 3개 (VI / EN / KO).
3. **회사 picker** — `allowedCompanies` 가 2개 이상인 사용자에게만 노출. `TV` / `VR` / `ALL`(통합조회) 중 한 개를 누르면 페이지가 다시 로드되며 모든 화면이 해당 회사 데이터로 필터됩니다.
4. **🏠 홈** — 대시보드.
5. **모듈 그룹 (10개)** — 각 그룹 헤더는 작은 주황색 막대 + 그룹명으로 구분됩니다. 그룹 내부에 각 모듈 메뉴 항목이 들어 있습니다.
   - 마스터 / 영업 / 렌탈 / AS / 재고 / 인사 / 재경 / 회의 / 캘린더 / 메시징
   - 관리자 권한이 있으면 **관리자** 그룹이 한 줄 더 보입니다 (감사로그·권한·호환매핑·회계마감·휴지통·**포탈 포인트·포탈 배너·견적 요청·고객 의견·포탈 게시글·서베이·업체 추천**·통계).
6. **테마 토글** — 하단의 ☀ / 🌙.

> **권한 가림**: 권한 레벨이 `HIDDEN` 인 모듈은 사이드바에서 자동으로 숨겨집니다. 같은 화면이라도 사용자별로 보이는 메뉴 수가 다를 수 있습니다.

### 메인 영역

- **상단**: 페이지 헤더(브레드크럼 + 제목), 우상단 `[신규]` / `[저장]` 등 액션 버튼.
- **본문**: 검색 바, 필터, 데이터 테이블, 또는 입력 폼.
- **데이터 테이블**: 컬럼 헤더로 정렬, 검색 바로 회사 스코프 안에서 필터링.

---

# 2부. 마스터 모듈

마스터는 모듈 간 공통 참조 데이터를 등록하는 모듈입니다. **공유 마스터**(거래처·품목·창고)는 회사코드가 없어 두 법인이 동일 데이터를 참조하고, 그 외(직원·부서·프로젝트·일정·라이선스)는 회사별로 분리 저장됩니다.

## 2.1 거래처 (`/master/clients`)

귀사가 거래하는 모든 회사를 등록합니다. **공유 마스터** — TV / VR 모두 동일한 거래처를 봅니다.

### 등록 — 입력값별 영향도

`[신규]` 버튼 → 다음 항목 입력.

| 필드 | **이 값이 시스템에서 하는 일** |
|---|---|
| **거래처코드** | 자동 생성 `CL-YYMMDD-###` (수정 불가). 모든 모듈의 외래키 |
| **회사명 (VI/EN/KO)** | 한 언어 입력 시 저장 시점에 Claude API 가 나머지 2개 언어 자동 번역 → `companyNameVi/En/Ko` 3컬럼 모두 채움 |
| **세무코드 (Mã số thuế)** | `taxCode` (베트남 사업자번호). 세금계산서 발행 키 |
| **주소·전화·이메일·담당자** | 자유 입력. AS 알림·디스패치 자동 추천에 사용 |
| **결제 조건 (paymentTerms)** | 일수 (예: 30). 매출 등록 시 미수금 만기일 = 매출일 + 이 값. 비우면 30일 기본 |
| **수금 상태** | `NORMAL` / `WARNING` / `BLOCKED` — 자동 계산 (재경 모듈), 관리자만 수동 변경 가능 |

### 검색·자동완성 콤보박스

매출·매입·렌탈·AS 등 거래처를 선택하는 모든 화면에서 **자동검색 콤보박스**(`거래처코드` 또는 `회사명` 부분 일치) 가 사용됩니다. 드롭다운에 보이지 않는 거래처는 `+ 거래처 등록` 링크로 새 탭에서 즉시 등록할 수 있습니다.

### 수금 상태 배지

- 🟢 `NORMAL` — 정상.
- 🟡 `WARNING` — 미수금 임계 초과 — 신규 거래 시 경고만 표시.
- 🔴 `BLOCKED` — 신규 매출·AS 접수 자동 차단. 재경 담당자가 결제 확인 후 해제합니다.

## 2.2 품목 (`/master/items`)

판매·임대·소모하는 모든 품목을 등록합니다. **공유 마스터**.

### 품목 유형

| 코드 | 의미 | 용도 |
|---|---|---|
| `PRODUCT` | 본품·완제품 | 매출·렌탈 대상 (예: 프린터, 계측기) |
| `CONSUMABLE` | 소모품 | 정기 출고되는 품목 (예: 토너, 잉크) |
| `PART` | 부품 | AS·교정 시 교체용 (예: 드럼 유닛) |

### 등록 — 입력값별 영향도

| 필드 | **이 값이 시스템에서 하는 일** |
|---|---|
| **품목코드** | 자동 생성 `ITM-YYMMDD-###` (수정 불가). 모든 재고·매출·매입 라인의 외래키 |
| **품목명 (영문 only)** | `Item.name`. **영문만 허용** (베트남 라벨·QR 시스템 호환). 비영문 입력 시 `english_only` 거절 |
| **단위 (unit)** | `EA`, `BOX`, `LIT` 등 자유 |
| **카테고리 (category)** | 분류용 자유 입력. 검색 키로 활용 |
| **유형 (itemType)** | `PRODUCT` / `CONSUMABLE` / `PART` — 호환매핑·디스패치 부품 자동 정렬·통계 분리의 기준 |

### 호환 매핑

`PRODUCT` 와 `CONSUMABLE` / `PART` 의 호환 관계는 별도 화면(`/admin/item-compatibility`)에서 등록합니다. 이 매핑은 **고객 포탈의 소모품 요청 화면**에서 자동 필터로 사용됩니다. 매핑은 관리자 전용 — 책 B 6부 참조.

## 2.3 창고 (`/master/warehouses`)

재고 보관 위치를 등록합니다. **공유 마스터**.

| 필드 | 비고 |
|---|---|
| **창고코드** | 자유 입력 (예: `WH-HCM-01`) |
| **창고명** | 자유 입력 |
| **유형** | `INTERNAL` (자사) 또는 `EXTERNAL` (고객·외부 보관) |

> `EXTERNAL` 창고는 입출고 화면에서 **거래처 선택**과 함께 표시됩니다. 외부 임대·점검 중인 장비를 추적할 때 사용합니다.

## 2.4 직원 (`/master/employees`)

법인별로 분리되는 인사 마스터입니다.

### 등록 — 입력값별 영향도

| 필드 | **이 값이 시스템에서 하는 일** |
|---|---|
| **회사** | `Employee.companyCode` (TV/VR). 사원코드 prefix 결정 + 부서 옵션 필터링 |
| **부서** | `departmentId`. 선택한 회사 소속 부서만 옵션에 노출 (회사 변경 시 자동 리셋) |
| **사원코드** | 자동 생성 — `TNV-###` (TV) / `VNV-###` (VR). **회사별 일련번호, YYMMDD 미포함** — 1년 내내 동일 카운터 |
| **이름 (VI/EN/KO)** | 한 언어 입력 시 자동 3언어 번역 (이름은 음역이라 어색할 수 있어 직접 입력 권장) |
| **직위·이메일·전화·입사일** | 기본 정보. 통계·연락처 표시 |
| **신분증 번호·사진** | `idCardNumber/idCardPhotoUrl`. 인사 컴플라이언스 |
| **급여·보험번호** | `salary/insuranceNumber`. 급여 모듈에서 직접 참조 (권한 가림 대상) |
| **계약 정보** | `contractType/contractStart/contractEnd`. 만료 임박 시 알림 |
| **상태 (status)** | ACTIVE / ON_LEAVE / TERMINATED — 활성 직원 옵션 필터의 기준 |

### 저장 시 일어나는 일

1. **사원코드 발급** — 회사별 카운터 +1 → `TNV-001` / `VNV-001` 식.
2. **3언어 이름 번역** (이름 칸 한 개만 입력 시).
3. **유효성 검증** — 회사·부서 매칭 (다른 회사 부서 선택 시 거절).

> **삭제**: 다른 모듈에서 참조 중인 직원은 삭제할 수 없습니다(`employee_has_dependent_rows`). 상태를 `TERMINATED` 로 변경하세요.

## 2.5 부서 (`/master/departments`)

회사별 부서·지사를 등록합니다.

| 필드 | 비고 |
|---|---|
| **부서코드** | 자유 입력 (예: `DEPT-SALES`) |
| **부서명 (VI/EN/KO)** | 자동 번역 적용 |
| **회사** | TV 또는 VR |

부서를 삭제하려면 먼저 그 부서 소속 직원이 0명이어야 합니다.

## 2.6 프로젝트 (`/master/projects`)

매출·매입을 묶는 프로젝트 단위를 등록합니다. 회사별로 분리.

| 필드 | 비고 |
|---|---|
| **프로젝트코드** | 자유 입력 |
| **프로젝트명** | 자유 입력 |
| **유형 (salesType)** | `TRADE`(상거래), `MAINTENANCE`(유지보수), `RENTAL`(렌탈), `CALIBRATION`(교정), `REPAIR`(수리), `OTHER` |

> 매출 등록 시 `CALIBRATION` 유형 프로젝트의 매출 라인은 **교정 성적서 발급 대상**으로 자동 인식됩니다 — 고객 포탈에서 다운로드 가능.

## 2.7 일정 (`/master/schedules`) · 캘린더 (`/calendar`)

회사·개인 일정을 등록하고 캘린더에 표시합니다.

### 일정 등록

| 필드 | 비고 |
|---|---|
| **일정코드** | 자동 생성 `SCH-YYMMDD-###` |
| **제목 (title)** | 필수 |
| **마감일시 (dueAt)** | 필수 |
| **담당자** | 활성 직원에서 선택 |
| **반복** | 일/주/월 패턴 (선택) |

### 캘린더

월·주·일 보기 전환. 일정 카드를 누르면 상세 보기. CFM(컨펌) 상태로 회의록·계약 등 외부 모듈과 연동될 수 있습니다.

## 2.8 라이선스 (`/master/licenses`)

소프트웨어·자격증·인증서 만료 관리.

| 필드 | 필수 |
|---|---|
| **이름 (name)** | ✓ |
| **취득일 (acquiredAt)** | ✓ |
| **만료일 (expiresAt)** | ✓ |
| **부여 대상** | 직원 또는 자산(SN) |
| **메모** | 자유 |

만료 임박 항목은 대시보드 알림으로 노출됩니다.

> **호환매핑**(`/admin/item-compatibility`)은 관리자 전용입니다. **책 B — 6부**를 참고하세요.

---

# 3부. 영업 (매출 / 매입)

매출과 매입은 같은 구조로 만들어졌습니다. 차이는 **거래 상대(거래처 / 공급처)** 와 **재고 흐름 방향(출고 / 입고)** 뿐입니다.

## 3.1 매출 (`/sales`)

### 신규 등록 흐름

`[+ 신규]` 버튼 → `/sales/new` 진입.

### 입력값별 데이터 영향도

| 입력 | 출처/형식 | **이 값이 시스템에서 하는 일** |
|---|---|---|
| **거래처** | ClientCombobox | `Sales.clientId` 저장 → 결제조건(`paymentTerms`)으로 미수금 만기일 자동 계산. `BLOCKED` 거래처는 `client_blocked` 거절 (관리자 강제 승인 필요) |
| **프로젝트** | Select (회사 스코프) | `Sales.projectId` 저장. 그 프로젝트의 `salesType` 으로 폼 분기 + 라인 처리 분기 |
| **영업담당자** | Select 직원 (선택) | `Sales.salesEmployeeId` 저장. 통계 화면 「영업담당자 실적」에 집계 |
| **사용기간 (헤더)** | date 두 칸 (`MAINTENANCE`/`RENTAL` 시 필수) | `Sales.usagePeriodStart/End` 저장 + 라인이 비어 있으면 라인 기간으로 자동 복사 |
| **창고** | Select (`TRADE` 시 필수) | `Sales.warehouseId` 저장. **TRADE 일 때만** 라인 1개당 재고 OUT 트랜잭션이 자동 생성됨 |
| **통화** | VND/USD/KRW/JPY/CNY | `Sales.currency` 저장. VND 외에는 환율 입력 필수 |
| **환율** | 숫자 (VND 는 자동 1.0) | `Sales.fxRate` 저장. 통계·미수금 합산 시 VND 환산 사용 |
| **품목 (라인)** | ItemCombobox | `SalesItem.itemId`. 라인 1행 = 1품목 |
| **S/N (라인)** | SerialCombobox | `SalesItem.serialNumber`. **TRADE 일 때 3가지 검증**: ① 마지막 트랜잭션이 OUT 이면 `serial_already_sold` 거절 ② 활성 IT/TM 계약에 등록된 SN 이면 `serial_in_active_contract` 거절 ③ 둘 다 통과해야 OUT 트랜잭션 생성 |
| **수량 (라인)** | 양수 | `SalesItem.quantity`. 라인 합계 = 수량 × 단가 |
| **단가 (라인)** | 0 이상 | `SalesItem.unitPrice` |
| **시작/종료일 (라인)** | date (`MAINTENANCE`/`RENTAL` 시) | `SalesItem.startDate/endDate`. 비어 있으면 헤더 기간 자동 복사 |
| **메모** | 자유 텍스트 | `Sales.note` |

### `salesType` 분기 한눈에

| salesType | 사용기간 | 창고 | 추가 항목 | 비고 |
|---|:-:|:-:|---|---|
| `TRADE` (상거래) | – | ✓ | – | 일반 매출 — 출고 처리 |
| `MAINTENANCE` (유지보수) | ✓ | – | – | 기간 입력, 재고 미차감 |
| `RENTAL` (렌탈) | ✓ | – | – | TM/IT 모듈에서 별도 관리하는 것이 일반적 |
| `CALIBRATION` (교정) | – | – | 성적서번호·발급일·PDF | 라인이 **고객 포탈 다운로드 대상** |
| `REPAIR` (수리) | – | – | – | AS 와 별개 단발성 수리 매출 |
| `OTHER` | – | – | – | 위 분류에 안 맞는 매출 |

### 자동번호와 결제조건

저장 시 매출번호가 `SLS-YYMMDD-###` 형식으로 자동 발급됩니다. 거래처 마스터의 결제 조건(예: 30일)이 헤더 안내문에 표시되며, 미수금/만기 계산의 기준이 됩니다.

### 합계 표시

라인 합계가 화면 우하단에 통화별로 누적 표시됩니다. 비-VND 통화일 때는 환율을 곱한 **VND 환산값**이 함께 보입니다.

### 매출 리스트 — 적정율 컬럼 (NEW)

`/sales` 매출 리스트의 마지막 컬럼에 **적정율 뱃지**가 표시됩니다.

- 표시 형식: `B/W 🟢 90%  C 🟢 90%` (B/W = 흑백, C = 컬러)
- **RENTAL 프로젝트 매출에만** 표시 — TRADE/MAINTENANCE/CALIBRATION 등은 "—"
- 같은 거래처의 IT 계약 장비들 중 **가장 우려되는** (적정율 최저) 값 기준
- 클릭 시 `/admin/yield-analysis` 로 이동해 상세 확인
- 두 개의 뱃지가 보이는 것은 **버그가 아니라** 흑백·컬러 두 적정율을 동시에 보여주는 것

### 저장 시 한 트랜잭션으로 일어나는 일

「매출 등록」 버튼 클릭 → 다음이 모두 한 DB 트랜잭션으로 실행됩니다 (실패 시 전체 롤백).

1. **매출번호 발급** — `SLS-YYMMDD-###` (그 날의 일련번호 + 1).
2. **`Sales` 행 생성** — 헤더 정보 + `totalAmount` (라인 합계).
3. **`SalesItem` 라인 생성** — 라인 수만큼 일괄 INSERT.
4. **재고 OUT 자동 생성** (TRADE + warehouseId 있을 때만) — 각 라인별 `InventoryTransaction(txnType=OUT, fromWarehouseId=선택창고, reason=SALE)` 자동 INSERT.
5. **미수금 자동 생성** — `PayableReceivable(kind=RECEIVABLE, status=OPEN, amount=totalAmount, dueDate=오늘+paymentTerms)`. 거래처 결제조건이 없으면 30일 기본.
6. **거래처 receivableStatus 재계산** — 누적 미수금이 임계 초과 시 `WARNING` / `BLOCKED` 자동 전환.
7. **감사로그 4건 이상** — Sales · SalesItem(N) · InventoryTransaction(N) · PayableReceivable INSERT 모두 기록.

## 3.2 매입 (`/purchases`)

매출과 동일한 폼 구조이며, **거래처 → 공급처** 로 라벨만 달라집니다.

### 입력값별 데이터 영향도 — 매출과의 차이

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **공급처** | `Purchase.supplierId` (매출의 `clientId` 대신) → 결제조건으로 **미지급 만기일** 계산 |
| **창고 (TRADE 시)** | 라인별로 재고 **IN** 트랜잭션 자동 생성 (매출은 OUT) |
| **나머지** | 매출과 동일 — 프로젝트·기간·통화·환율·품목 라인·메모 |

- 자동번호: `PUR-YYMMDD-###`
- 사용기간·창고 분기 규칙은 매출과 동일.

### 저장 시 일어나는 일 — 매출과의 차이

| 단계 | 매출 | 매입 |
|---|---|---|
| **재고 트랜잭션** | OUT (출고, reason=SALE) | IN (입고, reason=PURCHASE) |
| **PR 자동 생성** | `RECEIVABLE` (미수금) | `PAYABLE` (미지급금) |
| **재계산되는 거래처 상태** | `Client.receivableStatus` | (공급처에는 미적용) |

> 사용기간이 있는 매입(`MAINTENANCE` / `RENTAL`)은 **비용 자동 안분(allocations)** 대상으로 활용됩니다 — 라인 기간만큼 월별 비용 분산.

## 3.3 자동검색 콤보박스 — 거래처 / 품목 / S/N

매출·매입을 포함한 모든 입력 화면의 거래처·품목·S/N 필드는 **서버 검색 자동완성 콤보박스**입니다.

| 콤보박스 | 검색 키 | API |
|---|---|---|
| **거래처** | `거래처코드` 또는 `회사명` 부분 일치 | `/api/master/clients?q=` |
| **품목** | `품목코드` 또는 `품목명` 부분 일치 | `/api/master/items?q=` |
| **S/N** | `serialNumber` 부분 일치 (회사 스코프 자동) | `/api/inventory/sn/search?q=` |

### 사용 팁

- 입력 220ms 후에 서버에 요청 — 천 건 단위 데이터에서도 즉시 반응합니다.
- S/N 콤보박스는 자유 입력도 허용합니다. 재고에 없는 SN(외부 장비·고객 지급품)도 그대로 입력해 사용할 수 있습니다.
- 드롭다운 결과에 원하는 항목이 없으면 새 탭에서 등록 후 다시 검색할 수 있습니다 (거래처·품목 콤보박스 하단 `+ 등록` 링크 활용).

## 3.4 수정·환불 (Adjustments)

매출·매입을 등록한 뒤 **반품·교환·단가 조정**이 필요할 때는 상세 화면의 **수정 / Adjustments** 탭을 사용합니다.

| 유형 | 의미 | 재고 영향 |
|---|---|---|
| `RETURN` | 반품 | 라인의 S/N 단위로 입고 처리 |
| `EXCHANGE` | 교환 | 한 라인을 회수하고 다른 SN을 출고 |
| `PRICE_ADJUST` | 단가 조정 | 재고 영향 없음, 정산 금액만 변경 |

> **정책**: items 1행 = S/N 1개 = 수량 1. 여러 SN을 한꺼번에 처리하려면 라인을 추가하세요.

조정마다 `adjustCode` 가 자동 부여되고 회계마감(잠금) 정책의 영향을 받습니다 — 잠긴 월에 속한 매출의 조정은 차단됩니다(책 B 3부).

---

# 4부. 렌탈

ERP 의 렌탈은 두 가지 모듈로 분리됩니다.

| 모듈 | 대상 | 자동번호 | 청구 단위 |
|---|---|---|---|
| **IT 계약** (`/rental/it-contracts`) | 프린터·복합기 등 IT 장비 | `TLS-YYMMDD-###` (TV) / `VRT-YYMMDD-###` (VR) | 월 정액 + 카운터 사용량 |
| **TM 렌탈** (`/rental/tm-rentals`) | 계측기 등 단발/단기 렌탈 | `TM-YYMMDD-###` | 일/월 단가 |

## 4.1 IT 계약 (`/rental/it-contracts`)

### 신규 계약 등록

### 입력값별 데이터 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **거래처** (ClientCombobox, 필수) | `ItContract.clientId`. 존재 검증 후 저장. 회사 분리는 거래처가 아닌 **세션 회사코드** 로 결정됨 |
| **설치 주소** | `ItContract.installationAddress` (자유). 디스패치 출발지 자동 추천에 사용 |
| **시작/종료일** | `startDate/endDate` 둘 다 필수. `endDate < startDate` 면 거절 |
| **보증금·설치비·배송비·추가서비스비** | `deposit/installationFee/deliveryFee/additionalServiceFee` 4컬럼. 청구 화면에서 별도 라인으로 표시 |
| **통화** | VND/USD/KRW/JPY/CNY → `currency` |
| **환율** | `fxRate` (소수 6자리). 비-VND 시 환산 기준 |
| **계약/기술/재경 담당자** 3종 | 이름·전화·내선·이메일 12개 컬럼. 거래처 측 연락처. AS 자동 알림에 사용 |

### 저장 시 일어나는 일

1. **회사 prefix 결정** — 세션 `companyCode` 가 TV → `TLS-`, VR → `VRT-`.
2. **계약번호 발급** — `TLS-YYMMDD-###` 또는 `VRT-YYMMDD-###`.
3. **`ItContract` 행 생성** — 상태 `DRAFT` (장비 추가는 DRAFT 단계가 안전 — 자유롭게 추가/제거 가능).
4. **상세 페이지로 이동** — 장비 등록·청구 탭이 노출됨.

### 회사 분리 정책 (조회 시)

- 일반 사용자: 본인 세션 회사 prefix 만 보임 (`TLS-` 또는 `VRT-`).
- ADMIN/MANAGER: 양사 모두 보임. `?company=TV|VR` 파라미터로 명시 필터 가능.

### 장비 등록 (DRAFT → ACTIVE 전제)

상세 페이지의 `[+ 장비 추가]` 버튼으로 등록 — 입력값별 영향도:

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **S/N** (SerialCombobox, 필수) | `ItContractEquipment.serialNumber`. **STRICT 정책**: 자사 재고(`InventoryItem`)에 있는 SN 만 허용 → 외부 장비 IT 계약 등록 차단 |
| **품목** (ItemCombobox, 필수) | `itemId`. 호환 매핑(`ItemCompatibility`) 의 키 — 등록한 품목에 호환 소모품이 매핑되어 있어야 고객 포탈에서 소모품 요청 가능 |
| **월 정액 (monthlyBaseFee)** | 청구 화면의 월별 기본료. SN 별로 다를 수 있음 |
| **카운터 (흑백/컬러)** | 시작 카운터 (보통 0 또는 검침값). 다음 청구 시 차이값으로 사용량 계산 |
| **설치일 (installedAt)** | 자동 = 등록 시각. 변경 가능 |

### 장비 등록 시 일어나는 일

1. **`ItContractEquipment` 행 생성** — `removedAt = null` (활성).
2. **재고 OUT 트랜잭션 자동 생성** — 그 SN 이 재고에서 차감 (`reason=RENTAL`).
3. **SN 검색 자동 매칭** — 입출고 화면의 활성계약 자동 감지에 즉시 반영.
4. **고객 포탈 「내 IT 계약」 갱신** — 장비 수가 즉시 +1.

### 장비 표 — 적정율 카드 (NEW)

장비 목록 표에 다음 컬럼이 추가됩니다.

| 컬럼 | 설명 |
|---|---|
| **실제 상밀도 (%)** | 인라인 입력 (1~100). 기본 5. 사진/그래픽 다출력 고객은 10~15% 등으로 조정. 변경 시 즉시 저장 (PATCH) |
| **적정율** | 마지막 계산 결과 — `B/W 🟢 90% · C 🟢 90%` 형식. 미계산 시 "재계산" 안내 |
| 액션 | 📊 (단일 장비 6개월 재계산) / 수정 / 삭제 |

📊 버튼은 즉시 `/api/yield-analysis/calculate` 를 호출해 단일 장비를 6개월 기간으로 재계산하고 결과를 셀에 반영합니다. 자동 cron 이 매월 1일 02:00 KST 일괄 계산하므로, 정상 운영 시 수동 재계산은 거의 불필요합니다.

> 적정율 시스템 전체 설명은 **B 매뉴얼 13부**.

### 상태 흐름

```
DRAFT → ACTIVE → COMPLETED / CANCELED
```

- `DRAFT` — 장비를 자유롭게 추가/제거.
- `ACTIVE` — 장비 변경은 **Amendments** 로만 가능 (이력 보존).
- `COMPLETED` — 계약 종료. 모든 장비 회수.
- `CANCELED` — 중도 해지.

### 월별 청구 — 입력값별 영향도

상세 페이지의 **청구 / Billing** 탭에서 `[+ 청구 추가]`:

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **장비 SN** (Select — 그 계약의 등록 SN 만) | `ItMonthlyBilling.serialNumber` (장비 라인과 매칭) |
| **청구 월** (`YYYY-MM`) | `billingMonth`. 같은 SN+월 중복 등록 차단 |
| **흑백/컬러 카운터** | `counterBw/counterColor`. 직전 월 카운터와의 차이로 사용량 계산 |
| **청구 방법 (billingMethod)** | `COUNTER` (사용량) / `FIXED` (월 정액) — 계산식 분기 |

### 청구 등록 시 일어나는 일

1. **`ItMonthlyBilling` 행 생성** — 사용량 자동 계산 → `computedAmount` 채움.
2. **고객 포탈 「사용량 컨펌」 화면 즉시 노출** — 본인 거래처라면 그 줄이 보임.
3. **고객 서명 대기 상태** — `customerSignature = null`. 컨펌 후 미수금 자동 생성 (책 C 5.5 참조).

## 4.2 TM 렌탈 (`/rental/tm-rentals`)

### 신규 등록 — 입력값별 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **거래처** (ClientCombobox, 필수) | `TmRental.clientId` |
| **렌탈 기간 (헤더)** | `startDate/endDate`. 라인 기간이 비어 있으면 자동 복사 |
| **장비 라인 - S/N** (SerialCombobox) | `TmRentalItem.serialNumber`. **LOOSE 정책** — 자사 재고에 없어도 등록 가능 (외부 임대 장비 허용, 경고만) |
| **장비 라인 - 품목** | `TmRentalItem.itemId` |
| **장비 라인 - 일/월 단가** | `TmRentalItem.salesPrice`. 청구 계산의 기준 |
| **장비 라인 - 시작/종료일** | 라인 단위 기간. 헤더 기간 안에 들어와야 함 |
| **통화/환율** | `currency/fxRate`. 매출과 동일 |

자동번호 `TM-YYMMDD-###` 가 발급됩니다.

### 저장 시 일어나는 일

1. **`TmRental` + `TmRentalItem` 일괄 생성** — 한 트랜잭션.
2. **재고 OUT 자동** — 자사 재고 SN 인 경우만 (LOOSE — 외부 SN 은 트랜잭션 미생성, 추적만).
3. **고객 포탈 「내 IT 계약」 카드** 에 노출 (TM 도 함께 표시).
4. **활성 SN 검색에 즉시 반영** — 입출고 화면 onBlur 자동 감지에 포함.

### 청구

라인별 (종료일 − 시작일) × 단가 계산. 헤더 기간에서 부분 회수가 발생하면 **Amendments** 로 라인 종료일을 단축합니다 (다음 절).

## 4.3 장비 등록 / 교체 / 회수 — Amendments

`ACTIVE` 상태 계약·렌탈의 장비를 변경할 때 사용합니다. **수동 입력**과 **입출고 자동 트리거** 두 경로가 있습니다.

### 수동 Amendment — 입력값별 영향도

상세 페이지 **수정/이력 / Amendments** 탭 → `[+ 신규 Amendment]`:

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **종류 (type)** | `ADD_EQUIPMENT` / `REMOVE_EQUIPMENT` / `REPLACE_EQUIPMENT` / `FEE_CHANGE` — 라인 액션 결정 |
| **출처 (source)** | `MANUAL` (수동) / `INVENTORY_TXN` (입출고 자동) — 추적용 |
| **발효일 (effectiveDate)** | 변경 적용일. 청구 계산 분기점 |
| **창고 (warehouseId)** | 회수/교체 시 입고 창고 |
| **라인 - action** | `ADD` / `REMOVE` / `REPLACE_OUT` / `REPLACE_IN` — REPLACE 시 OUT+IN 한 Amendment 에 두 줄 |
| **라인 - S/N + itemId** | 대상 장비 식별 |
| **라인 - monthlyBaseFee/salesPrice** | REPLACE_IN 또는 FEE_CHANGE 시 신규 단가 |

### Amendment 저장 시 일어나는 일

1. **`Amendment` + `AmendmentItem` 행 생성**.
2. **장비 마스터 갱신** — REMOVE 시 `removedAt = effectiveDate`, ADD/REPLACE_IN 시 새 장비 행 생성.
3. **재고 트랜잭션 자동** — IN/OUT 자동 (창고 지정된 경우만).
4. **이력 보존** — Amendment 자체는 절대 삭제 안 됨 (감사 목적).

### 입출고 자동 트리거

`/inventory/transactions/new` 에서 S/N 입력 후 onBlur → 시스템이 해당 S/N 의 활성 IT/TM 계약을 즉시 조회. 계약이 발견되면 모달이 열려 다음 3가지 의도 중 선택을 요청합니다.

| 의도 | 결과 |
|---|---|
| **회수 (RECOVER)** | 자동으로 `REMOVE_EQUIPMENT` Amendment 생성 |
| **교체 (REPLACE)** | 신규 SN 입력 → `REPLACE_EQUIPMENT` Amendment 생성 |
| **일반 이동 (NORMAL)** | Amendment 미생성, 단순 입출고로만 처리 |

이 트리거 덕분에 현장에서 입출고만 처리해도 계약 이력이 자동 갱신됩니다.

## 4.4 청구·정산

- **IT 계약**: 매월 청구 등록 → 고객 포탈에서 사용자가 컨펌(✍️ 서명) → 미수금 자동 생성 (재경 모듈).
- **TM 렌탈**: 헤더/라인 기간 기반 자동 계산 → 정산일에 매출 자동 생성 옵션.

미수금 정지(`BLOCKED`) 상태 거래처는 신규 청구는 발행되지만 신규 매출·AS 접수는 차단됩니다.

---

# 5부. AS (애프터서비스)

AS 모듈은 **티켓**(접수)과 **디스패치**(현장 출동) 두 단계로 구성됩니다.

| 모듈 | 경로 | 역할 |
|---|---|---|
| AS 티켓 | `/as/tickets` | 고객 요청 접수·증상 기록 |
| AS 디스패치 | `/as/dispatches` | 출동 일정·부품 사용·서명 |

자동 접수번호: `YY/MM/DD-##` (예: `26/04/27-01`).

## 5.1 티켓 접수 (`/as/tickets`)

### 신규 접수 — `[+ 신규]` → `/as/tickets/new`

### 입력값별 데이터 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **고객사** (ClientCombobox, 필수) | `AsTicket.clientId` 저장. `BLOCKED` 거래처는 신규 접수 자체 차단 (빨간 경고). `WARNING` 은 노란 경고만 |
| **장비 / 품목** (ItemCombobox, 선택) | `AsTicket.itemId` — 어떤 품목 모델인지 — 통계·매칭 부품 자동 추천에 사용 |
| **S/N** (SerialCombobox, 선택) | `AsTicket.serialNumber` — **LOOSE 정책**: 자사 재고에 없어도 입력 가능 (외부 장비). 디스패치 생성 시 이 SN 이 「대상 장비 SN」 으로 자동 전파 |
| **AS 담당자** (직원 Select, 선택) | `AsTicket.assignedToId`. 비우면 `RECEIVED` 그대로 + 미배정 표시 |
| **원문 언어** (VI/KO/EN) | `AsTicket.originalLang` 저장. 자동 번역 시 원본으로 인식할 언어 |
| **증상 (VI/KO/EN)** 3칸 중 ≥1 | 한 칸만 채우면 저장 시 나머지 2개 언어 자동 번역 → `symptomVi/En/Ko` 3컬럼에 모두 채움. 모든 칸 비워 저장하면 `invalid_input` |
| **사진** (다중 업로드) | 파일이 먼저 `/api/files` (category=`PHOTO`) 에 업로드되어 fileId 발급 → 티켓에 `photoIds` 배열로 연결 |

### 저장 시 일어나는 일

1. **티켓번호 발급** — `YY/MM/DD-NN` (그 날의 일련번호 + 1).
2. **`AsTicket` 행 생성** — 상태 `RECEIVED`, `kind = AS_REQUEST`, 접수일시 자동.
3. **3언어 번역 보관** — Claude API 가 입력 안 된 두 언어 칸을 자동 채움.
4. **사내 알림** — 담당자 미배정이면 AS 팀 전체, 배정됐으면 그 직원에게 알림.
5. **고객 알림** — 고객 포탈 「내 요청 현황」 표에 즉시 노출.

### 4단계 워크플로

```
RECEIVED → IN_PROGRESS → DISPATCHED → COMPLETED
                                     └→ CANCELED (어디서나 취소 가능)
```

| 상태 | 의미 | 변경 트리거 |
|---|---|---|
| `RECEIVED` | 접수, 담당자 배정 대기 | 자동 (신규 등록) |
| `IN_PROGRESS` | 담당자 배정·확인 중 | 수동 변경 또는 디스패치 등록 시 자동 |
| `DISPATCHED` | 현장 출동 등록됨 | 디스패치 생성 시 자동 |
| `COMPLETED` | 작업 완료, 고객 확인 대기 | 디스패치 완료 + 서명 |
| `CANCELED` | 취소 (이력 보존) | 수동 |

### 티켓 검색

리스트 화면 상단의 상태 필터(드롭다운) + 검색바(접수번호·고객·SN). 회사 스코프 안에서 자동 필터.

## 5.2 디스패치 (`/as/dispatches`)

티켓에 대해 실제 출동을 기록하는 화면입니다.

### 디스패치 생성 — 티켓 상세의 `[+ 디스패치 등록]` 버튼

### 입력값별 데이터 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **출동 직원** | `AsDispatch.dispatchEmployeeId`. 통계·KPI 「담당자별 처리 건수」 집계 |
| **운송 방법** (자유) | `AsDispatch.transportMethod` |
| **출발지·도착지 주소** | `AsDispatch.originAddress/destinationAddress`. **양쪽 주소가 모두 채워지면** 서버가 Google Distance Matrix API 를 자동 호출해 거리(km) 자동 계산 |
| **계측 사진 (택시미터 OCR)** | `meterPhotoUrl`. OCR 로 km 추출 → `meterOcrKm`. Google 거리와 비교해 `distanceMatch` (true/false) 자동 판정 → 운송비 정산 검증 |
| **운송비** | `AsDispatch.transportCost`. 출동총비용에 합산 |
| **영수증 파일** | `receiptFileId`. 회계 증빙 |
| **출발/도착/완료 시각** | `departedAt/arrivedAt/completedAt`. SLA 계산 |
| **대상 장비 SN** | 명시값 우선, 비우면 **티켓의 SN 이 자동 propagate**. 부품 등록 시 기본값으로 사용 |
| **메모** | `AsDispatch.note` (자유) |

### 저장 시 일어나는 일

1. **`AsDispatch` 행 생성** — 위 입력값 + 거리 자동 계산 결과.
2. **티켓 상태 자동 전환** — 티켓이 `RECEIVED` / `IN_PROGRESS` 였으면 → `DISPATCHED`. (이미 `COMPLETED`/`CANCELED` 면 `ticket_not_dispatchable` 거절)
3. **부품 사용 등록 가능** — 디스패치 상세 페이지에서 부품 추가 가능 (다음 절).

### 부품·소모품 사용 등록

디스패치 상세 페이지의 **부품 / Parts** 섹션 — 입력값별 영향도:

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **대상 장비 SN** (필수) | `AsPart.targetEquipmentSN` — 어떤 장비에 부품이 들어갔는지 추적. 통계 「SN별 누적 부품원가」 집계의 키 |
| **출고 창고** (필수) | 부품 출고 원천 — 자동 생성될 `InventoryTransaction.fromWarehouseId` |
| **품목** (ItemCombobox) | `AsPart.itemId`. PART/CONSUMABLE 우선 정렬 |
| **부품 SN** (선택) | `AsPart.serialNumber`. 부품 자체에 SN 이 있을 때만 |
| **수량** | `AsPart.quantity`. 1 이상 정수 권장 |
| **메모** | `AsPart.note` (자유) |

### 「부품 추가」 버튼이 한 트랜잭션으로 하는 일

1. **`AsPart` 행 생성** — 라인 1개.
2. **품목 단가 자동 조회** → `AsPart.unitCost` (재고 평균 단가 기준).
3. **합계 계산** → `AsPart.totalCost` = 단가 × 수량.
4. **재고 OUT 자동 생성** — `InventoryTransaction(txnType=OUT, reason=CONSUMABLE_OUT, fromWarehouseId=출고창고, targetEquipmentSN=대상SN)`.
5. **재고 부족 시 거절** — `insufficient_stock` 에러 → 화면에 「재고 부족 — 상세」 표시.
6. **출동총비용 갱신** — 디스패치 헤더의 「부품원가 합계」 가 즉시 다시 계산됨.

### 비용 합계

| 항목 | 합산 |
|---|---|
| **부품원가** | 라인 합계 |
| **운송비** | 헤더값 |
| **출동총비용** | 부품원가 + 운송비 |

### 완료·서명

완료 처리(`COMPLETED`) 시 모바일 손가락 서명을 받습니다 (현장에서 고객 확인). 서명이 저장되면 티켓 상태가 `COMPLETED` 가 되고 고객 포탈 「내 요청 현황」에 **확인** 버튼이 활성화됩니다.

## 5.3 사진과 첨부

티켓·디스패치 둘 다 사진 첨부 가능. 한 장당 최대 사이즈는 시스템 설정에 따릅니다(보통 10MB). 업로드된 사진은 `/api/files/{id}` 로 다운로드.

## 5.4 BLOCKED 정책

거래처가 `BLOCKED` 상태이면 신규 티켓 생성 자체가 차단됩니다. 결제 확인 후 자동 해제 또는 재경 담당자가 수동 해제(책 B 8부).

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

# 7부. 인사

<!-- TODO 다음 라운드 -->

---

# 7부. 인사

인사 모듈은 5개 화면으로 구성됩니다. 모두 회사별로 분리되며, 자유서술 입력은 **자동 3언어 번역** 대상입니다.

| 화면 | 경로 | 자동코드 |
|---|---|---|
| 입사 | `/hr/onboarding` | `ONB-YYMMDD-###` |
| 퇴사 | `/hr/offboarding` | `OFF-YYMMDD-###` |
| 사건평가 | `/hr/incidents` | `INC-YYMMDD-###` |
| 정기평가 | `/hr/evaluations` | `EVAL-YYMMDD-###` |
| 연차 | `/hr/leave` | `LV-YYMMDD-###` |

> 급여(`/hr/payroll`)·인센티브(`/hr/incentives`)는 권한이 부여된 인사담당자에게만 노출됩니다. 메뉴가 보이지 않으면 권한 가림 상태입니다.

## 7.1 입사 (`/hr/onboarding`)

신규 입사자 오리엔테이션·계약·자산 지급을 한 곳에서 관리.

| 섹션 | 내용 |
|---|---|
| **기본정보** | 입사자(직원 마스터에서 선택) · 입사일 · 직무 |
| **계약** | 계약 종류·시작·종료 (직원 마스터의 contract* 와 동기화) |
| **자산 지급** | 노트북·모니터 등 SN 단위로 지급 기록 — 재고에서 OUT 처리 |
| **체크리스트** | IT 계정·보안교육·복지카드 등 항목별 완료 표시 |

저장 시 `ONB-YYMMDD-###` 자동 발급.

## 7.2 퇴사 (`/hr/offboarding`)

| 섹션 | 내용 |
|---|---|
| **기본정보** | 퇴사자 · 퇴사일 · 사유 (3언어 자동 번역 대상) |
| **자산 회수** | 입사 시 지급 자산 SN 별로 회수 기록 — 재고 IN 처리 |
| **계정 비활성화** | 시스템·이메일·VPN 등 항목별 |
| **인수인계** | 후임자 + 인수인계 메모 |

처리 완료 시 직원 마스터 상태가 `TERMINATED` 로 자동 변경됩니다.

## 7.3 사건평가 (`/hr/incidents`)

특정 사건(징계·표창·근태 등)이 발생할 때마다 작성합니다.

### 입력값별 데이터 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **대상자** (Select 활성 직원) | `Incident.subjectEmployeeId`. 그 직원의 누적 사건 이력에 추가됨 — 정기평가 AI 보조의 입력 자료 |
| **사건 일자** (필수) | `occurredAt`. 시계열 분석 키 |
| **종류 (kind)** | DISCIPLINARY · COMMENDATION · ATTENDANCE · OTHER — 종류별 통계 분리 |
| **원문 언어** | `originalLang` (VI/KO/EN) |
| **내용 (contentVi/En/Ko)** | 한 언어 입력 — Claude API 가 나머지 2개 자동 번역. **최소 50자 이상** 검증 (짧은 내용 거절). 작성자 사원코드 필수 |
| **첨부** | `Incident.attachmentFileId` (선택). 증빙 파일 |

### 저장 시 일어나는 일

1. **`Incident` 행 생성** — `INC-YYMMDD-###` 자동 발급.
2. **3언어 번역 보관** — 작성자가 한 언어만 입력해도 3컬럼 모두 채움.
3. **AI 평가 자료에 누적** — 정기평가 시 자동 컨텍스트로 사용.
4. **표시는 사용자 언어 우선**, 「원문 보기」 토글 제공.

## 7.4 정기평가 (`/hr/evaluations`)

분기/반기/연간 정기평가.

| 섹션 | 내용 |
|---|---|
| **기본정보** | 대상자 · 평가기간 · 평가자 |
| **항목별 점수** | 직무 역량·태도·성과 등 (가중치 적용) |
| **종합 의견** | 자유서술 (3언어 자동 번역) |
| **AI 보조** | `/hr/evaluations/ai` — 사건평가 누적 데이터를 기반으로 초안 생성 |

저장 시 `EVAL-YYMMDD-###` 자동 발급.

## 7.5 연차 (`/hr/leave`)

### 입력값별 데이터 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **신청자** | `Leave.employeeId`. 본인 자동, 관리자만 대리 가능 |
| **종류** (kind) | ANNUAL · HALF · SICK · OTHER — 잔여 연차 계산 분기 |
| **시작/종료일** | `startDate/endDate`. 일수 자동 계산 (반차는 0.5) |
| **사유** | 자유 텍스트 (3언어 자동 번역) |

### 저장 시 일어나는 일

1. **`Leave` 행 생성** — `LV-YYMMDD-###` + 상태 `PENDING`.
2. **부서장 알림** — 승인 대기 알림 발송.
3. **승인 후** → 직원 잔여 연차에서 자동 차감, 캘린더에 자동 표시.
4. **거절 후** → 사유 첨부 + 신청자 알림.

---

# 8부. 재경

재경 모듈은 두 화면으로 구성됩니다.

| 화면 | 경로 | 역할 |
|---|---|---|
| 미수금 / 미지급금 | `/finance/payables` | 매출/매입 자동 연동되는 채권·채무 관리 |
| 비용 | `/finance/expenses` | 일반 운영비, 매출/매입 연결 비용 |

## 8.1 미수금 / 미지급금 (`/finance/payables`)

매출 등록 시 자동으로 **미수금**(`RECEIVABLE`) 레코드가, 매입 등록 시 자동으로 **미지급금**(`PAYABLE`) 레코드가 생성됩니다.

### 리스트 화면 (NEW — 검색 + 정렬 + 잔여일 + 변경일)

상단에 **미결제 합계 (VND)** 카드. 표는 다음 컬럼.

#### 검색 필터 영역
- **구분** select: 전체 / 미수금(RECEIVABLE) / 미지급금(PAYABLE)
- **상태** select: 전체 / OPEN / PARTIAL / PAID / 연체(OVERDUE)
- **전표번호** 텍스트: 부분 일치 (Sales/Purchase/Expense 코드 모두)
- **거래처** ClientCombobox (서버 검색)
- **기간(발행)** 시작일 ~ 종료일 (`createdAt` 기준)
- **기간(예정일)** 시작일 ~ 종료일 (`dueDate` 기준)
- [검색] / [초기화] 버튼

#### 컬럼

| 컬럼 | 의미 | 정렬 |
|---|---|---|
| **구분** | RECEIVABLE → 「미수금」 / PAYABLE → 「미지급금」 (3언어 풀네임) | — |
| **상태** | `OPEN` · `PARTIAL` · `PAID` · OVERDUE 합성 | — |
| **전표** | 원본 매출/매입/비용 번호 | — |
| **거래처** | `BLOCKED` 인 거래처는 이름 옆에 빨간 배지 | — |
| **금액** | VND | ▲▼ |
| **입금/지급** | 누적 결제액 | — |
| **잔액** | `amount - paidAmount` | ▲▼ |
| **예정일** | `dueDate` (최초 발행 시 결제조건으로 셋팅, 이후 불변) | ▲▼ |
| **변경일** | `revisedDueDate ?? dueDate` (상세에서 수정한 새 만기) | ▲▼ |
| **잔여일** | `오늘 - 변경일`. 색상: 음수=초록(남음), 0=노랑(오늘), 양수=빨강(연체). PAID 면 빈칸 | ▲▼ |

기본 정렬: **잔여일 내림차순** (연체 큰 것이 위).

> **예정일 vs 변경일**: 최초 발행 시 자동 셋팅된 결제 예정일은 `dueDate` (불변). 상세에서 만기 협상 결과를 입력하면 `revisedDueDate` 에 저장. 잔여일·연체 판정은 변경일 기준.

### 상세 화면 — 입력값별 영향도

`/finance/payables/[id]` — 두 섹션 + 입력 영향도:

#### 연락 이력 (PrContactLog) 추가

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **일자** | `PrContactLog.contactDate` |
| **연락 방법** | `method` — PHONE/EMAIL/VISIT/CHAT |
| **연락 내용 (3언어 중 1)** | `contactNoteVi/En/Ko` — 한 언어 입력 시 자동 번역 |
| **고객 응답 (3언어 중 1)** | `responseVi/En/Ko` — 동일 |

#### 결제 이력 (PrPayment) 추가

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **결제 금액** | `PrPayment.amount`. PR 의 `paidAmount` 자동 누적 |
| **결제 일자** | `paidAt` |
| **결제 방법** | `method` — BANK/CASH/CARD/OTHER |
| **메모** | 자유 |

#### 결제 등록 시 자동 일어나는 일

1. **PR `paidAmount` 갱신** = SUM(PrPayment.amount).
2. **PR `status` 자동 전환** — `paidAmount = 0` → `OPEN`, `0 < paidAmount < amount` → `PARTIAL`, `paidAmount >= amount` → `PAID`, `dueDate < 오늘` → `OVERDUE`.
3. **거래처 `receivableStatus` 재계산** — 누적 미수금 변화에 따라 `NORMAL` ↔ `WARNING` ↔ `BLOCKED` 자동 전환.
4. **회계마감 잠금 검사** — 잠긴 월 PR 의 결제 등록은 차단(책 B 3부).

### 엑셀 다운로드

상단 우측 `[엑셀]` 버튼으로 현재 필터 결과를 .xlsx 로 받습니다.

## 8.2 비용 (`/finance/expenses`)

일반 운영 비용을 등록하고 매출/매입에 안분(allocations) 합니다.

### 신규 등록 — 입력값별 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **자동코드** | `EXP-YYMMDD-###` (자동 발급) |
| **비용 종류 (expenseType)** | `GENERAL` / `PURCHASE` / `SALES` / `TRANSPORT` — `SALES`/`PURCHASE` 선택 시 연결 매출/매입 ID 가 필수가 됨 |
| **금액·통화·환율** | `amount/currency/fxRate`. 통계는 VND 환산값 사용 |
| **발생일** | `incurredAt`. 회계마감(잠금) 월 판단 기준 |
| **연결 매출/매입** | `SALES` 시 `linkedSalesId`, `PURCHASE` 시 `linkedPurchaseId` 필수. 매출/매입 상세에서 「관련 비용」 으로 노출 |
| **메모** | `note` (자유) |

### 저장 시 일어나는 일

1. **`Expense` 행 생성**.
2. **연결 매출/매입의 손익 재계산** — 즉시 통계에 반영.
3. **회계마감 검사** — `incurredAt` 이 잠긴 월이면 신규 등록도 차단.

### Allocations (안분)

한 비용을 여러 매출/매입 또는 부서·프로젝트에 비율 배분합니다. 비용 상세 페이지의 **안분 / Allocations** 탭에서 라인 단위로 등록.

회계마감(잠금) 정책의 영향을 받습니다 — 잠긴 월에 속한 비용 수정·삭제는 차단(책 B 3부).

---

# 9부. 회의 / 캘린더 / 메시징

## 9.1 주간보고 / 회의록 (`/weekly-report`)

주간 단위 업무 보고와 회의 기록을 통합 관리.

### 화면 구성 — 2개 패널

| 패널 | 내용 |
|---|---|
| **Tasks** | 진행 중 업무 — 지시사항/내용 (3언어), 담당자, 상태 |
| **Backlog** | 누적 미결 업무 + 거래처별 이력 |

### Tasks — 입력값별 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **지시사항 (instructionVi/En/Ko)** | 한 언어 입력 시 자동 3언어 번역. `WeeklyReportTask.instruction*` 컬럼 |
| **내용 (contentVi/En/Ko)** | 동일 패턴. 진행 결과·상세 보고 |
| **담당자** | `ownerEmployeeId`. 통계 「업무 처리량」 집계 |
| **상태** | TODO/IN_PROGRESS/DONE — 캘린더·대시보드 미결 카운트 분기 |

표시는 사용자 언어 → VI → KO → EN 순으로 가용한 언어를 자동 선택해 보여 줍니다 (`pick3` 함수).

### Backlog — 입력값별 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **거래처** (ClientCombobox) | `Backlog.clientId`. 거래처별 미결 업무 누적 |
| **업무 이력** (3언어 자동 번역) | 거래처별 누적 — 영업·AS 화면에서 「최근 미결 업무」 섹션으로 자동 노출 |

## 9.2 캘린더 (`/calendar`)

월·주·일 보기 전환. `/master/schedules` 에 등록된 일정과 회사 공통 이벤트가 모두 표시됩니다. 일정 카드 클릭 → 상세 보기 / 수정.

## 9.3 채팅 (`/chat`)

WebSocket 기반 실시간 메시징.

### 메시지 입력 — 데이터 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **메시지 본문** (한 언어 입력) | 전송 시 Claude API 가 자동으로 3언어 컬럼(`contentVi/En/Ko`) 모두 채움 |
| **첨부 파일** (선택) | `/api/files` 업로드 → `messageFiles` 연결 |
| **수신자 (DM)** | 회사 스코프 내 직원만 검색 가능 — 관리자 ALL 모드에서 양사 가능 |

### 표시 옵션

수신자는 화면에서 1/2/3개 언어 표시를 선택할 수 있습니다 (예: KO 만 / KO+VI / KO+VI+EN). 베트남측 동료가 한국어로 보낸 메시지를 베트남어로 즉시 읽을 수 있습니다.

### 새 채팅 (`/chat/new`)

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **상대** (단일/다수) | DM 또는 그룹 채팅. 첫 메시지 전송 시 `ChatRoom` 자동 생성 |
| **방 이름** (그룹만) | `ChatRoom.name`. 자유 |

---

# 10부. 통계 (열람용)

> 일반 사원에게는 **보기 권한**만 부여됩니다. 분석 도구로 활용하세요. 깊이 있는 KPI/SN별 이익 분석은 관리자가 별책 **B — 7부**에서 다룹니다.

`/stats` 메뉴는 4개 탭으로 구성됩니다.

| 탭 | 내용 |
|---|---|
| **매출 / 영업** | 월별 매출 추이, 거래처/프로젝트별 합계, 영업담당자 실적 |
| **렌탈 / AS** | 활성 IT/TM 계약 수, 월별 청구·정산, AS 처리 시간(SLA) |
| **재고 / 인사** | 품목별 회전, 부서별 인원, 평가 점수 분포 |
| **재경** | 미수금 잔액 추이, 비용 카테고리별 합계, 통화 환산 요약 |

### 사용 팁

- 모든 차트는 **회사 스코프**가 자동 적용됩니다 (TV/VR 분리 또는 통합조회).
- 표 우상단의 `[엑셀]` 버튼으로 raw 데이터를 .xlsx 로 받을 수 있습니다.
- 상세 분석(SN 별 이익·TCO 등)은 관리자 권한이 필요하며 별책 B 7부 참조.

---

# 부록 A — 자동코드 표 (요약)

| 대상 | 형식 | 비고 |
|---|---|---|
| 거래처 | `CL-YYMMDD-###` | 일자별 일련번호 |
| 품목   | `ITM-YYMMDD-###` | 일자별 일련번호 |
| 사원   | `TNV-###` (TV) / `VNV-###` (VR) | **회사별 일련번호, YYMMDD 미포함** |
| IT계약 | `TLS-YYMMDD-###` / `VRT-YYMMDD-###` | |
| TM렌탈 | `TM-YYMMDD-###` | |
| AS전표 | `YY/MM/DD-##` | 슬래시 구분 |
| 평가   | `INC-YYMMDD-###` (사건) / `EVAL-YYMMDD-###` (정기) | |
| 입·퇴사 | `ONB-YYMMDD-###` / `OFF-YYMMDD-###` | |
| 연차   | `LV-YYMMDD-###` | |
| 비용   | `EXP-YYMMDD-###` | |
| 일정   | `SCH-YYMMDD-###` | |
| 라이선스 | `LIC-YYMMDD-###` | |

---

# 부록 B — 회사코드 정책 (요약)

- 회사코드는 `TV` 또는 `VR` 두 가지뿐.
- 로그인 시 선택 → 세션 전체 고정 → 모든 쿼리에 자동 주입.
- `allowedCompanies` 가 둘 이상인 사용자(주로 ADMIN/MANAGER)는 사이드바 회사 picker 로 통합조회(`ALL`) 모드 전환 가능.
- 공유 마스터(`clients`, `items`, `warehouses`)에는 회사코드 없음 — 두 법인이 같은 데이터를 봅니다.
- 그 외 업무 데이터는 모두 회사코드 필수 — 인덱스로 강제.

---

# 부록 C — 3언어 자동번역 (요약)

자유서술 필드(AS 증상·사건평가·메모·요청 등)는 모두 **3언어 컬럼 + originalLang** 형태로 저장됩니다.

- 사용자가 한 언어로만 입력 → 저장 시 Claude API 가 나머지 2개 언어를 자동 번역.
- 표시는 사이드바에서 선택한 언어로 즉시 보여 주고, 「원문 보기」 토글로 다른 언어를 확인.
- 번역 결과 수정은 관리자만 가능.
- 사람 이름·고유명사도 동일하게 처리되지만 음역이 어색할 수 있음 — 필요 시 직접 입력 권장.

---

# 부록 D — 다운로드 / 업로드 가이드 (모듈별 주의·꿀팁)

엑셀 업로드·다운로드 기능을 사용할 때 자주 만나는 문제와 빠른 처리 방법을 모아 둡니다. 모든 업로드 화면은 「📤 Excel upload」 / 「📋 Empty template」 / 「📥 Download Excel」 의 세 가지 버튼이 공통으로 노출됩니다.

## D.1 공통 사항 (모든 모듈)

- **헤더 행 1행 필수** — 첫 행에 컬럼 이름이 있어야 합니다. 데이터는 2행부터.
- **빈 셀 = null** — 비워두면 그 필드는 입력 안 함. 단 필수 컬럼은 비우면 행 단위 에러로 거절.
- **참조 값(거래처/품목/직원 코드 등)은 DB와 정확히 일치** 해야 매핑됨. 대소문자·공백 구분.
- **3언어 자동번역 필드**(증상·메모 등)는 한 언어만 채워도 OK — 저장 시 나머지 2개 언어 자동 채움.
- **자동 발급 코드(`SLS-`/`PUR-`/`ITM-` 등)**는 빈칸 그대로 두면 서버가 자동 채움. 수동 지정 시 충돌 가능성 있음.
- **에러 메시지 = 행 번호 + 필드 + 사유** 형식. "행 4 (ITM-D330): 설명 — 필수 항목인데 비어있음" 처럼 정확히 어떤 행 어떤 필드인지 안내.
- **부분 실패 허용** — 실패한 행만 수정 후 다시 올리면 됨 (성공 행은 멱등 upsert 라 중복 등록 안 됨).
- **분할 업로드 권장** — 한 번에 100~500행. 그 이상은 끊어서 (각 회 결과·에러 즉시 확인 가능, 안전).

> 💡 **꿀팁**: 큰 파일을 만들기 전에 5~10행짜리 미니 파일로 먼저 테스트. 헤더 매칭·필수 누락 잡기 좋음.

## D.2 거래처 (`/master/clients`)

| 컬럼 | 필수 | 비고 |
|---|:-:|---|
| `clientCode` | ☐ | 빈칸 = `CL-YYMMDD-###` 자동 발급 |
| `companyNameVi` | ☑ | 베트남어 회사명 (검색 메인 키) |
| `companyNameKo` | ☐ | 빈칸이면 자동 번역 |
| `companyNameEn` | ☐ | 빈칸이면 자동 번역 |
| `taxCode` (MST) | ☐ | 베트남 세금코드 — 같은 값 재등록 차단 |
| `bankAccount/Holder/BankName` | ☐ | 결제 정보 |
| `paymentTerms` | ☐ | 일수 (기본 30) |
| `address/phone/email` | ☐ | 연락처 |

⚠️ **주의**: `taxCode` 가 다른 거래처와 중복되면 오류. 거래처 통합·이름 변경 시 기존 행 수정 (PATCH) 권장.
💡 **꿀팁**: 신규 5~10건은 직접 등록이 빠름. 30건 이상부터 엑셀 사용. ECOUNT 에서 export 한 데이터는 별도 ECOUNT import 도구 사용 (B 매뉴얼 참조).

## D.3 품목 (`/master/items`)

엑셀 업로드 컬럼 13종 — 자세한 정의는 본문 1.2 참조. 여기서는 자주 만나는 함정만:

⚠️ **필수 항목** (행 검증):
- 모든 행: `itemType`, `name`, `description`
- `CONSUMABLE`/`PART`: 추가로 `compatibleItemCodes` 1건 이상

⚠️ **PRODUCT 행에서 다음 컬럼은 채워도 무시됨** (헷갈림 방지):
- `colorChannel`, `expectedYield`, `yieldCoverageBase`, `compatibleItemCodes`, `parentItemCode`, `bomQuantity`, `bomNote`

⚠️ **BOM 부모 연결 (parentItemCode)** 은 반드시 부모 행이 같은 파일 안 또는 DB에 미리 존재해야 함. 부모를 먼저 등록 후 자식.
- 같은 파일 안에서 부모·자식 함께 올리는 경우: 파일 내 행 순서는 무관 (서버가 Phase 1 후 Phase 3 처리).

⚠️ **BOM 최대 3단계** — Level 3 부품의 자식 등록 시도는 무시.

⚠️ **호환 매핑** (compatibleItemCodes): 세미콜론(`;`) 구분. 예: `ITM-010;ITM-011`.
- 매핑된 PRODUCT 가 DB에 없으면 그 매핑만 무시 (행 자체는 성공).

💡 **꿀팁**:
- **계열 등록 패턴**: 본체 PRODUCT 1건 → 호환 토너 4종 (BLACK/CYAN/MAGENTA/YELLOW) → A'ssy → A'ssy 자식. 한 시트에 다 채워도 됨.
- **시드 후 추가**: 기존 시드된 토너에 expectedYield 만 채우려면 itemCode 만 적고 변경할 컬럼만 채워서 업로드 (upsert). 다만 호환 장비 누락은 에러 — 한 번 매핑된 거 다시 비우면 무시되지 않으므로 PATCH 화면에서 수정 권장.
- **수백 건 한 번에**: 권장 500행 이하, 상한 2000행. 500행 = ~12초.
- **다운로드**: 「📥 Download Excel」 → 현재 필터된 결과만. 전체 백업이 아님.

## D.4 매출 / 매입 (`/sales`, `/purchases`)

⚠️ **필수**:
- 매출: `clientCode`, `projectCode`, 라인의 `itemCode`/`quantity`/`unitPrice`
- 매입: `supplierCode`, `projectCode`, 라인 정보

⚠️ **`projectCode` 는 회사 스코프**. TV/VR 별로 같은 코드라도 다른 프로젝트. 현재 세션 회사의 프로젝트만 매칭 시도.

⚠️ **TRADE 매출 라인 = 재고 OUT 자동**. 라인 S/N 검증 3중 적용 — 이미 출고된 SN, 활성 IT/TM 계약 SN 은 거절.
⚠️ **매입 라인 S/N 은 새로 입고**. 이미 재고에 있는 SN 과 충돌 시 거절.

💡 **꿀팁**:
- **외화 매출**: `currency` 컬럼에 USD/KRW/JPY/CNY 입력 + `fxRate` 명시. VND 는 비워도 자동 1.0.
- **CALIBRATION 매출**: 라인의 `certNumber/certDate/certPdf` 컬럼 채우면 고객 포탈 자동 노출.
- **부분 실패**: 라인 1개라도 SN 거절되면 그 매출 헤더 자체 거절. 라인 단위 일부 성공은 없음.

## D.5 IT 계약 장비 (`/rental/it-contracts/[id]` → 일괄 업로드)

장비 수백 대 한 번에 등록할 때.

⚠️ **필수**: `serialNumber`, `itemCode`. 그 외는 모두 옵션이지만 SNMP 자동수집 사용 시 `deviceModel` 권장.

⚠️ **STRICT 재고확인** — 자사 재고(`InventoryItem`)에 등록된 SN 만 통과. 외부 임대 장비는 직접 등록 화면에서 LOOSE 모드로 처리.

💡 **꿀팁**:
- **SNMP 자동수집 활성화**: `deviceModel` (예: `SAMSUNG_X7500`) 채우고 토큰 발급. `deviceIp` 는 비워도 됨 — 에이전트가 자동 스캔으로 채움.
- **resetAt** 컬럼: 메인보드 교체 등 카운터 리셋 일자. 이후 청구 사용량 계산 시 prev 무시.

## D.6 TM 렌탈 / 재고 / AS

- **TM 렌탈** (`/rental/tm-rentals`): 라인 N개. 라인별 `startDate/endDate` 필수. 회수 시 endDate 변경 또는 별도 화면 처리.
- **재고 입출고** (`/inventory/transactions`): 일괄 등록 가능하지만 **매입/매출/매입반품은 매입·매출 모듈에서만**. 엑셀에 PURCHASE/SALE/RETURN_IN 사유 들어 있으면 무시되지 않고 거절.
- **AS 출동** 자체는 일괄 업로드 미지원 (1건씩 등록). **출동 사진**은 모바일에서 직접 업로드 (D.8).

## D.7 인사 (입사·퇴사·연차)

⚠️ 입사/퇴사는 **PDF 자동 발급**이 핵심 — 엑셀 업로드는 거의 사용 안 함. 양식대로 폼에서 등록.
⚠️ 연차는 일자별 다중 등록 가능 — 같은 직원 같은 일자 중복 시 거절.

## D.8 사진 / 파일 업로드 (모바일·웹 공통)

- **AS 출동 미터 사진** — 모바일 카메라에서 즉시. JPEG 자동 압축 (~500KB 목표).
- **거래처 서명** — HTML5 Canvas → base64 PNG 저장. PDF 임베드용.
- **계측기 교정 성적서 PDF** — 매출 등록 시 라인의 `certPdf` 첨부. 고객 포탈 다운로드 대상.
- **개인사진/신분증** — `idCardPhotoUrl` 컬럼. 회사 정책상 권한 있는 인사 담당자만 다운로드.

⚠️ **파일 크기**: 단일 파일 10MB 이내 권장. 그 이상은 압축 후 업로드 (브라우저 멈춤 위험).
⚠️ **포맷**: JPEG/PNG/PDF 만. HEIC(아이폰 기본)는 자동 변환 안 됨 — 폰 카메라 설정에서 「가장 호환 가능한 형식」 선택 권장.
💡 **꿀팁**: 모바일에서 사진 찍고 바로 첨부하면 자동 회전·압축 처리. PC 에서 다른 폴더 거쳐 올리면 회전 메타데이터 사라질 수 있음.

## D.9 다운로드 — 자주 쓰는 패턴

| 다운로드 | 위치 | 비고 |
|---|---|---|
| 매출 / 매입 / 거래처 / 품목 엑셀 | 각 리스트 화면 우상단 「📥 Download Excel」 | 현재 화면 필터·검색 결과만 |
| 사용량 확인서 PDF | `/admin/usage-confirmations` 행의 「📄 PDF」 | pdf-lib 생성, Noto Sans CJK 임베드 |
| AS 출동 사진 | 출동 상세 → 사진 카드 → 우클릭 저장 | 다중 다운로드는 미지원 |
| 교정 성적서 | 매출 라인 → 인증서 카드 → 다운로드 | 고객 포탈에서도 같은 파일 |
| QR 라벨 시트 | `/inventory/labels` → 「인쇄 / Print」 | A4 시트, 매입 ID 동반 시 헤더 자동 |
| 적정율 리포트 | `/admin/yield-analysis` → (CSV/엑셀 향후 추가) | 현재는 화면 표만 |
| 감사로그 | `/admin/audit-logs` → 별도 권한 필요 | 대용량 우려, 페이지네이션 |

💡 **꿀팁**: 엑셀 다운로드는 「현재 화면 상태」 기준입니다. 검색·필터를 미리 조정한 후 다운로드.

---

# 부록 E — 최근 추가 기능 (2026-04-30 기준)

## E.1 매출 4단계 워크플로 (Mock 매출)

`/sales` 매출 화면에 단계 뱃지 + KPI + 검색 추가.

| 단계 | 뱃지 | 의미 | 누가 액션 |
|---|---|---|---|
| 🟡 기술 대기 | TECH | SNMP 사용량 확정 미완료 | 기술팀 |
| 🟠 영업 발행 대기 | SALES | 사용량 확정 + 영업이 [매출 발행] 대기 | 영업 |
| 🔵 재경 CFM 대기 | FINANCE | 영업 발행됨 + 재경 [CFM] 대기 | 재경 |
| 🟢 완료 | DONE | 재경 CFM 완료 (lock) | — |

- 매월 1일 09:00 KST cron 자동 발행 — 모든 ACTIVE IT/TM 계약에 전월 DRAFT 매출 1건씩.
- 사용량 확인서 ADMIN_CONFIRMED 시점에 같은 (계약, 월) DRAFT 매출 자동 동기화 — 추가 사용량 라인까지 채움.
- 매출 상세에서 [🟠 매출 발행] 클릭 → isDraft=false + 미수금 자동 발행.
- 재경 CFM 후엔 일반 PATCH 차단 (잠금). ADMIN 만 잠금 해제 가능.

## E.2 IT/TM 렌탈 — 조기 종료 버튼 🛑

계약 상세 헤더 우상단 **🛑 계약 종료 (조기/정상)** — 종료일자 / 사유 / 상태(COMPLETED/CANCELED) 입력 → 자동:
- endDate 변경 + status 변경
- 모든 활성 장비 회수 (`removedAt = 종료일`)
- 종료일 이후 월의 DRAFT 매출 삭제

## E.3 포탈 — 「내 요청」 상세 페이지

`/portal/requests/[id]` — 포탈 메인의 티켓번호 클릭 시 진입:
- 종류·상태·담당자·완료일
- AS 면 증상 풀텍스트 / 소모품 면 요청 품목 표
- **진행 타임라인** — 📥 접수 → 🚚 출동 #1 (담당자, 부품 사용) → ✅ 완료 또는 ⏳ 대기

## E.4 재고 — 현상태 메모 + 양품/불량

InventoryItem 새 필드:
- `stateNoteVi/En/Ko` — 자유 텍스트 (저장 시 3국어 자동 번역)
- 양품/불량 분류는 기존 `status` enum 그대로:
  - 🟢 양품 = `NORMAL`
  - 🔴 불량 = `NEEDS_REPAIR` / `PARTS_USED` / `IRREPARABLE`

UI: `/inventory/stock` → SN 펼침 → 상태 변경 + Remark 입력. 새 stateNote 필드는 후속 UI 작업에서 입력 폼 추가 예정.

## E.5 호환검색 + BOM 3단계 + colorChannel

A 매뉴얼 본문 6.x 참조 — 이미 적용됨.

## E.6 사이드바 즐겨찾기 ❤

각 메뉴 우측 하트 ♡ 클릭 → ♥ 빨간색 + 사이드바 상단 "❤ 즐겨찾기" 그룹에 자동 노출. localStorage 저장.

## E.7 페이지 폭 확장

다음 페이지들이 `max-w-6xl` (1109px) → `max-w-screen-2xl` (1366px) 로 확장:
- 매출 (`/sales`)
- AS 접수 (`/as/tickets`)
- AS 출동 (`/as/dispatches`)

표 가로 잘림 해결.

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

- **v2.4.0 · 2026-05-03**: 재경 **Layer 3 — 회계원장** 신설. VAS(베트남 회계기준) 기반 ChartOfAccounts(39 계정 × 2 법인) + JournalEntry/JournalLine + AccountMapping(14 트리거).
  - 매출/매입/CashTransaction/Expense/Payroll bulk-pay 5개 모듈에 자동 분개 hook 추가 — 트랜잭션 발생 시 `JournalEntry` + 차변·대변 라인 자동 생성, source 별 색상 배지.
  - 신규 화면 3종: `/finance/chart-of-accounts` (계정과목표 — type 필터 + 검색 + 계층 들여쓰기 표시), `/finance/journal-entries` (전표 리스트 + 펼침 라인 + DRAFT→POSTED 전기 / POSTED→REVERSED 역분개 액션), `/finance/account-mappings` (트리거→VAS 코드 매핑 편집).
  - 자동분개 정책: 매출 = 차) 미수금(131) / 부가세예수금(3331) 대) 매출(5111). 매입 = 차) 재고(156) / 매입세액(133) 대) 외상매입금(331). Cash IN/OUT 은 카테고리(SALES_COLLECTION/PAYROLL/EXPENSE)별 상대계정 자동 lookup. Expense 는 paymentStatus=PAID 면 즉시 출금, 아니면 미지급금. Payroll bulk-pay 는 차) 급여비용(6421) 대) 예금(112).
  - 사이드바 재경 그룹 +3 메뉴(📒 계정과목표 / 📝 회계 전표 / 🔗 자동분개 매핑). i18n vi/en/ko 60+ 키 추가. AccountStandard enum(VAS/K_IFRS/IFRS) — 향후 K-IFRS 프리셋 확장 가능.
- **v2.3.2 · 2026-05-03**: Layer 1·2 누락분 14건 중 8건 일괄 fix.
  - **#3**: 미수금/미지급금 입금 모달(`/finance/payables/[id]`)에 [계좌] 드롭다운 추가 — 선택 시 CashTransaction + 잔고 동기 자동.
  - **#2**: `/finance/expenses` 리스트에 paymentMethod·paymentStatus 컬럼 + 상태 필터 5종 + PENDING_REIMBURSE 행에 [환급 승인] 버튼.
  - **#4·#9**: `/api/jobs/finance-monthly-snapshot` 신규 cron — 매월 1일 03:00 KST, 전월 BankAccountMonthlySnapshot upsert + Budget.actualAmount/variance 자동 집계 + 예산 초과 시 BUDGET_OVERRUN 알림.
  - **#6**: `NotificationType` 에 `CASH_SHORTAGE_ALERT` + `BUDGET_OVERRUN` enum 값 추가, cash-shortage-alert cron 이 ADMIN 들에게 3언어 알림 정식 발송.
  - **#7**: `/finance/accounts` 행별 [+ 입금] [− 출금] [↔ 이체] 액션 버튼 + 모달 — 별도 화면 이동 없이 바로 처리.
  - **#11**: `/finance/profitability` [Excel 다운로드] 버튼 — 거래처별 매출/직접비/공헌이익/순이익 export.
  - **#13**: `/api/finance/bank-accounts/integrity-check` 신규 — currentBalance 캐시 vs SUM 검증 + drift 0.01 이상 시 ok=false.
  - 남은 6건 (#5/#8/#10/#12/#14 등 차트·UI 디테일·간접비 배분 실행)은 Layer 4 시점에 통합 처리 예정.
- **v2.3.1 · 2026-05-03**: 비용 등록 UI 강화 — Layer 1 (v2.2.0) 에서 누락되었던 작업 13 보강.
  - 증상: schema 와 API 는 신규 6 필드(paymentMethod / vendorClientId / vendorName / targetClientId / cashOut / cashOutAccountId)를 받지만 `/finance/expenses/new` 화면에 입력 칸이 없어 사용자가 활용 불가.
  - 수정: `expense-new-form.tsx` 에 3개 신규 섹션 추가 — ① 결제 정보(결제방법 5종 + 자동 결정 결제상태 표시), ② 발생 업체/귀속 거래처(거래처 마스터 드롭다운 + vendorName 직접 입력), ③ 즉시 출금(법인카드/이체/시재금 시 체크박스 + 계좌 선택). 개인 선지급 시 PENDING_REIMBURSE 안내 Note 표시.
  - `new/page.tsx` 에 Client / BankAccount 옵션 prefetch 추가.
- **v2.3.0 · 2026-05-03**: 재경 Layer 2 신규 모듈 — **비용/원가 관리** (CostCenter + AllocationRule + Budget + ExpenseAllocation.costCenterId 확장 + 거래처별 수익성 리포트).
  - 신규 모델: `CostCenter` (DEPARTMENT / BRANCH / PROJECT 3 유형, companyCode unique [code]), `AllocationRule` (DIRECT / INDIRECT / COMMON), `Budget` (월별 costCenter × yearMonth unique).
  - 신규 enum: CostCenterType, AllocationType, AllocationBasisV2 (REVENUE_RATIO / HEADCOUNT_RATIO / EQUAL / CUSTOM).
  - 신규 화면 2종: `/finance/cost-centers` (비용센터 + 예산 등록·실적 비교 vs 예산), `/finance/profitability` (거래처별 수익성 — 매출 - 직접비 - 간접비 = 순이익, 수익률 표시).
  - 신규 API: `/api/finance/cost-centers` (GET/POST + [id] PATCH/DELETE), `/api/finance/budgets` (GET/POST upsert), `/api/finance/profitability` (Sales + Expense.targetClient + AsDispatchPart 거래처별 교차 집계).
  - i18n 22 키 vi/en/ko 동시. 사이드바 재경 그룹 2 메뉴 추가 (🏢 비용 센터, 📈 거래처 수익성).
- **v2.2.0 · 2026-05-03**: 재경 Layer 1 신규 모듈 — **자금관리**(BankAccount/CashTransaction/BankAccountMonthlySnapshot) + **Expense 강화**(결제방법·결제상태·발생업체·귀속고객·환급 워크플로) + **Payroll 일괄지급** + **자금부족 알림 cron**.
  - 신규 화면 3종: `/finance/accounts`(계좌 CRUD + 현재 잔고), `/finance/cash-transactions`(입출금 내역), `/finance/cash-dashboard`(잔고 + 7/14/30일 예측 + 미수/미지급 TOP10 + 월별 추이).
  - 신규 API: `/api/finance/bank-accounts`, `/api/finance/cash-transactions` (+ `/transfer`), `/api/finance/cash-dashboard`, `/api/finance/expenses/[id]/reimburse`, `/api/hr/payrolls/bulk-pay`, `/api/jobs/cash-shortage-alert`.
  - 기존 PrPayment API 트랜잭션에 `bankAccountId` 옵션 추가 — 입금/결제 시 CashTransaction 자동 생성 + BankAccount.currentBalance 동기화.
  - Expense API 에 `cashOut` + `cashOutAccountId` 옵션 — IMMEDIATE_OUT 결제수단(법인카드·이체·시재금)일 때 비용 등록과 동시에 출금 처리.
  - 4 enum 신설(BankAccountType·CashTxnType·CashCategory·CashTxnStatus) + 2 enum(ExpensePaymentMethod·ExpensePaymentStatus).
  - i18n 50+ 키 vi/en/ko 동시 추가. 사이드바 재경 그룹에 3 메뉴 추가.
- **v2.1.2 · 2026-05-03**: v2.1.1 의 `enterWith` 가 RSC concurrent render 격리로 propagate 안 되는 케이스 발견. Chrome 검증에서 VR 전환 후에도 매출 123건 그대로 표시.
  - 조치: Prisma extension 에 `resolveSessionCompanyCode()` fallback 도입 — ALS 컨텍스트가 비어있으면 `next/headers` 의 `x-session-user` 헤더를 직접 읽어 세션 companyCode 추출.
  - 결과: Server Component / Route Handler / Cron / Test 모든 경로에서 단일 함수로 회사코드 결정. ALS 격리에 영향 안 받음.
- **v2.1.1 · 2026-05-03**: Server Component 자동 회사 필터 버그 fix.
  - 증상: VR 전환 후 매출 목록이 여전히 TV 데이터 123건 표시.
  - 원인: `getSession()` 만 호출하는 server component (예: `/sales/page.tsx`)는 `withSessionContext` wrap 이 없어서 ALS 컨텍스트 미설정 → Prisma extension 의 `COMPANY_SCOPED_MODELS` 필터가 작동하지 않았음.
  - 수정: `src/lib/session.ts` 의 `getSession()` 안에서 `requestContextStore.enterWith(ctx)` 로 sticky ALS 컨텍스트 자동 설정. Route Handler (이미 wrap 됨) 와 무충돌.
  - 결과: 모든 server component 에서 `prisma.X.findMany()` 호출이 자동으로 회사 필터 적용.
- **v2.1.0 · 2026-05-03**: companyCode 전수 보강 — 34개 모델에 일괄 추가(Phase A 10건 Critical, B 15건 포탈/SNMP/적정율, C 9건 자식 denormalize). Prisma extension 의 `COMPANY_SCOPED_MODELS` 가 `findMany/findFirst/count` 에 `WHERE companyCode = session` 자동 주입, `create` 에 `data.companyCode` 자동 채움(미설정 시). ADMIN 통합조회(`companyCode=ALL`)는 우회. `CodeSequence` 는 `(companyCode, key)` 복합 PK 로 변경되어 TV/VR 자동코드 시퀀스 분리.
- **v2.0.0 · 2026-05-02 (PM)**: 커밋 4룰 정착 — ① 버전 갱신·사이드바 상단 노출 ② 3개국어 동시 ③ 매뉴얼 변경이력 동기 ④ Chrome 검증 필수. `src/lib/version.ts` 신설.
- **2026-05-02 (AM)**: 본 보강판 발행. 6부 재고 완전 재작성, 부록 F~K 추가.
- **2026-05-01**: SUPPLIES itemType 추가 (4종 itemType), TRANSFER Internal 모드 추가, 매입반품/폐기/재고조정 4행 추가, 진리표 30→34행.
- **2026-04 후반**: 4축 진리표 도입, ECOUNT 16-value enum 폐기.
- **2026-04 중반**: NIIMBOT B21 라벨 50×70mm 세로형 단일 규격, 컬러 채널 배지, EX/TLS 소유 배지.
- **2026-04 초반**: QR 다중 스캔, 상태 기반 시나리오 추천.
