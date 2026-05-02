@AGENTS.md

# Tellustech ERP — 프로젝트 규칙

단일 기준 문서: `docs/CLAUDE_CODE_개발시작가이드.md`. 아래 규칙과 충돌 시 가이드가 우선.

## 1. 회사코드(company_code) — 멀티컴퍼니 분리

- 회사코드는 `TV` (Tellustech Vina) 또는 `VR` (Vietrental) 두 가지뿐.
- 로그인 시 사용자가 선택 → 세션 전체에 고정 → 모든 쿼리에 `WHERE company_code = :session` **자동** 주입.
- `users.allowed_companies`: 일반=`["TV"]` 또는 `["VR"]`, 관리자/대표=`["TV","VR"]` (관리자는 통합 조회 모드 전환 가능).
- 고객 포탈은 `client_code` 기반, 회사코드 불필요.

**공유 마스터 (company_code 필드 없음)**: `clients`, `items`, `warehouses` — 이것만.

**완전 분리 (company_code 필수 + 인덱스)**: 직원·부서·IT계약·렌탈·AS·교정·매출·매입·급여·인센티브·재경·일정·라이선스 등 그 외 **전부**.

새 테이블을 만들 때 첫 질문: "이건 마스터인가, 업무 데이터인가?" 업무 데이터면 `company_code` 필수.

## 2. S/N(Serial Number) — 전체 시스템 통합 기준키

- S/N이 모듈 간 연결고리. 설계 시 S/N으로 조인 가능해야 함.
- **재고확인 정책**:
  - IT렌탈 → **엄격**: 자사 재고에 S/N이 있어야만 등록 허용.
  - TM렌탈 / 교정 / AS / 매출 / 매입 → **느슨**: 외부 렌탈·고객 지급품 등 재고에 없을 수 있음 → 없으면 경고만 띄우고 진행.
- 재고확인 모드는 `enum StockCheckMode { STRICT, LOOSE }`로 명시하고 UI/백엔드 모두에서 분기.

## 3. 자동 코드 생성 (공통 유틸)

모든 등록 화면은 코드/번호를 자동 생성. 패턴:

| 대상 | 형식 |
|---|---|
| 거래처 | `CL-YYMMDD-###` |
| 품목 | `ITM-YYMMDD-###` |
| 사원 | `TNV-###` (TV) / `VNV-###` (VR) |
| IT계약 | `TLS-YYMMDD-###` / `VRT-YYMMDD-###` |
| AS전표 | `YY/MM/DD-##` (예: `26/04/23-01`) |
| TM렌탈 | `TM-YYMMDD-###` |
| 평가 | `INC-YYMMDD-###` (사건) / `EVAL-YYMMDD-###` (정기) |
| 입사/퇴사 | `ONB-YYMMDD-###` / `OFF-YYMMDD-###` |
| 연차 | `LV-YYMMDD-###` |
| 비용 | `EXP-YYMMDD-###` |
| 일정 | `SCH-YYMMDD-###` |
| 라이선스 | `LIC-YYMMDD-###` |

구현은 `src/lib/code-generator.ts` 등 한 곳에 모으고, 순번은 회사코드·일자 스코프의 시퀀스로 관리.

## 4. AI 3언어 번역 (저장시점)

- 사용자는 베/영/한 아무 언어로 자유 입력.
- 저장 시 Claude API가 **나머지 2개 언어를 자동 번역** → 3개 언어 컬럼에 모두 저장.
- 스키마 관례: 자유서술 필드는 `content_vi`, `content_en`, `content_ko` 3컬럼 + `original_lang` (감지된 원문 언어).
- 조회 시 사용자 설정 언어 컬럼 즉시 표시 + "원문 보기" 토글.
- 적용 대상: AS 내역, 사건평가, 고객 요청, 메모, 채팅, 지연사유 등 **자유서술 필드 전체**.
- 번역 수정은 관리자만 가능.

**채팅** (WebSocket): 전송 시 동일 구조로 3언어 저장. 수신자 표시는 1/2/3개 언어 중 사용자 선택.

## 5. UI — 다크모드 기본

- Tailwind `dark:` 우선 설계. 루트에 `class="dark"` 기본 적용.
- 라이트모드는 옵션이지만, 첫 접근 시 다크로 보여야 함.
- 색상 토큰은 CSS 변수로 중앙 관리 (`src/app/globals.css`).

## 6. 감사 로그 (audit_log)

- 모든 업무 테이블의 INSERT/UPDATE/DELETE는 `audit_log`에 기록 (table, record_id, before, after, user_id, company_code).
- Prisma middleware 또는 공통 레포지토리 계층으로 일괄 처리. 모듈마다 개별 코드 중복 금지.

## 7. 자유 서술 = 번역 필드 / 단답 = 단일 필드

자유서술 필드를 Prisma 모델에 추가할 때는 반드시 3언어 컬럼으로 나누고, 단답(코드/숫자/enum)은 단일 컬럼으로.

## 8. 금지 / 주의

- `docs/` 폴더는 원본 산출물 — 편집 금지 (사용자 업로드 전용).
- 가이드에 명시되지 않은 폴더/모듈을 임의 추가하지 말 것. 가이드의 10모듈 구조에 먼저 매핑.
- `.env`는 커밋 금지 (`.gitignore`에 이미 포함).

## 9. 필드명 매핑 참고 (E2E에서 확인됨, 리팩토링 시 참조)

테스트 계획서·가이드 문서와 실제 API/스키마 간 필드명이 다른 지점. 새 모듈·클라이언트 추가할 때 실제 스키마 기준으로 작성할 것.

| 영역 | 계획/자연어 명칭 | **실제 API/스키마** |
|---|---|---|
| 세션 쿠키 | `tts-session` | `tts_session` (underscore) |
| Schedule | `name`, `repeatType` | `title`, `dueAt` (required) |
| License | `expiresAt`만 | `name` + `acquiredAt` + `expiresAt` 3종 required |
| InventoryTransaction | `type: "IN"/"OUT"/"TRANSFER"` | `txnType: "IN"/"OUT"/"TRANSFER"` (TRANSFER = External↔External 통과) |
| InventoryTransaction 사유 모델 | 16-value `reason` enum 단일 | **4축 진리표 — `(txnType × referenceModule × subKind × ownerType)`**. legacy `reason` 컬럼은 호환용으로만 자동 채움. 진리표 정의는 `src/lib/inventory-rules.ts` `BASE_RULES` 참조 |
| InventoryTransaction 신규 필드 | — | `referenceModule` (RENTAL/REPAIR/CALIB/DEMO/TRADE/CONSUMABLE), `subKind` (REQUEST/RETURN/PURCHASE/SALE/BORROW/LEND/OTHER/CONSUMABLE), `fromClientId`, `toClientId` |
| InventoryItem 자산 추적 | — | `ownerType` (COMPANY/EXTERNAL_CLIENT) + `ownerClientId` + `currentLocationClientId/SinceAt` (외부 위탁 위치) + `archivedAt` (반환·매각 후 비활성). EXTERNAL_CLIENT 자산은 라벨에 검은 [EX] 배지 |
| Purchase | `clientId` | `supplierId` |
| TmRental 자동코드 필드 | `contractNumber` | `rentalCode` (TM-YYMMDD-###) |
| Incident | `descriptionVi/En/Ko` | `contentVi/contentEn/contentKo` + 최소 한 언어 **50자 이상** + 작성자 empCode 필수 |
| Stock GET 쿼리파라미터 | `itemId=/warehouseId=` | `item=/warehouse=` |
| Stock 응답 | `quantity` | `{ stock: [{ ..., onHand }] }` |

## Phase 상태

- Phase 1~5 완료. 최근 추가된 모듈은 아래 부록 참조.

### 최근 추가 (2026-04 ~)

- **SNMP 자동수집** (Phase 1~3): Windows Agent (Node 18 + pkg 단일 exe), 토큰 인증, 사용량 확인서 6단계 워크플로 + PDF 생성, GitHub Releases 자동 업데이트.
- **소모품 적정율 분석**: `Item.expectedYield`, `ItContractEquipment.actualCoverage`, `YieldAnalysis`, `YieldConfig`, `YieldBadge` enum, `NotificationType.YIELD_FRAUD_SUSPECT`. `/admin/yield-analysis` 4탭 대시보드 + 검색 필터 + 계약별 그룹 펼치기. 매월 1일 02:00 KST `/api/jobs/yield-analysis-monthly` 자동 계산. 부정 의심(RED) 시 ADMIN 자동 알림 (3언어). 컬러 토너 공식: `MIN(sum_C, sum_M, sum_Y)` (1 페이지 = C+M+Y 동시 소모).
- **QR 라벨/스캔 개선**: 모바일 카메라 인식률 (qrbox 동적, focusMode continuous, fps 15), 품목 매핑 server fallback (`/api/master/items?q=`), 인쇄 시 사이드바 숨김 + 헤더(매입처·매입번호·매입일자·출력일자) 자동 출력, 스캔 사유 옵션 매입/매출/반품 차단.
- **사이드바·대시보드 재구성** (13그룹): 마스터·영업·렌탈·A/S·재고·인사·재경·회의·캘린더·메시징·**고객 포탈 운영(NEW)**·**통계(NEW)**·관리. SNMP/사용량확인서/적정율은 렌탈 그룹으로, 견적은 영업 그룹으로, 마감은 재경 그룹으로, 품목호환은 마스터 그룹으로 이동. 대시보드 12개 NavCard 가 사이드바와 1:1.
- **Cron**: `/api/jobs/portal-news-generate` (월요일 09:00 KST · async fire-and-forget · Promise.allSettled). `/api/jobs/yield-analysis-monthly` (매월 1일 02:00 KST).

### 최근 추가 (2026-05 ~)

- **재고사유 — 16-value enum → 4축 진리표** (Phase 1~2): `(txnType × referenceModule × subKind × ownerType)` 키로 `BASE_RULES` 20행 정의 (`src/lib/inventory-rules.ts`). 각 행이 `masterAction` (NEW/MOVE/ARCHIVE/TRANSFER_LOC/NONE) + `autoPurchaseCandidate` + `autoSalesCandidate` + `requireSerialNumber` + `setExternalLocation` + `externalAssetLabel` 결정. 시나리오 6/7/10/11 은 `ownerType` 별도 분기. `ClientRuleOverride` 테이블이 거래처별 예외 허용. legacy `reason` 컬럼은 `deriveLegacyReason()` 으로 자동 채움.
- **외부 자산 추적**: `InventoryItem.ownerType`/`ownerClientId`/`inboundReason`/`inboundAt`/`currentLocationClientId`/`currentLocationSinceAt`/`archivedAt` 추가. 외부 자산(고객 수리·교정·데모기 등)이 자사 창고에 입고되면 EXTERNAL_CLIENT 로 등록되어 매입금 미발생. 외부 위탁 시 `currentLocationClientId` 설정. 반환·매각 시 `archivedAt` 설정.
- **PayableReceivable 자동 DRAFT**: `referenceModule × subKind` 조합이 `autoPurchaseCandidate`/`autoSalesCandidate` 인 거래는 매입/매출 트랜잭션 직후 `PayableReceivable` 행을 `DRAFT` 상태(amount=0)로 자동 생성. `sourceInventoryTxnId` 로 역추적. 재경 담당자가 금액 확정 시 `OPEN` 으로 승급.
- **다행 입출고 등록 + 시나리오 콤보**: `/inventory/transactions/new` 가 카드 레이아웃으로 한 번에 100~수백 라인 처리 (`/api/inventory/transactions/bulk` · `prisma.$transaction({ timeout: 30_000 })`). reason 단일 드롭다운 → 22개 `txn.combo.*` 시나리오 콤보 (`COMBOS_BY_TYPE`). `referenceModule` + `subKind` 자동 매핑.
- **QR 다중 스캔 (Phase 2.8)**: `/inventory/scan` 이 스캐너 상시 가동 + 스캔 시마다 `/api/inventory/sn/[sn]/state` 호출하여 마스터 상태(`NEW` / `OWN_IN_STOCK` / `OWN_AT_EXTERNAL` / `EXTERNAL_IN_STOCK` / `EXTERNAL_AT_VENDOR` / `ARCHIVED`)에 따른 추천 시나리오 도출. 스캔 누적 → 1 이벤트로 `/api/inventory/transactions/bulk` 일괄 등록. 첫 스캔이 `txnType` + `comboKey` + 창고/거래처 자동 프리필.
- **QR 라벨 NIIMBOT B21 통합** (Phase 3): 3종(60×40/50×35/40×30) 규격 → **단일 70×50mm** (`LABEL_SPEC` 단일 상수). `@page size: 50mm 70mm; margin: 0;` + `page-break-after: always` 로 라벨 1장 = 1페이지. QR 데이터는 JSON `{itemCode, serialNumber, contractNumber}` 유지. `@media print { color: #000 !important; background: transparent !important; }` 로 다크모드 토큰 무력화.
- **컬러 채널 배지 in 라벨**: `Item.colorChannel` (BLACK/CYAN/MAGENTA/YELLOW/DRUM/FUSER/NONE) 이 라벨에 자동 표시 — itemCode 옆 작은 컬러 배지 (`K/C/M/Y/D/F`). `-webkit-print-color-adjust: exact` 로 컬러 전사지 사용 시 그대로 컬러 인쇄 (현재 흑백 전사지에서는 OS 가 grayscale 자동 변환되지만 글자는 식별 가능). 추가 입력 단계 없음 — 품목 등록 시 채널 지정만 하면 매입·재고·라벨이 일관 적용.
- **라벨 일괄 인쇄**: `/inventory/stock` S/N 탭 + `/master/items` 리스트에 체크박스 + `🏷 라벨 인쇄 (N장)` 헤더 버튼. 행별 🏷 아이콘은 항상 노출(모바일 대응). `/master/items/[id]` 단건 페이지에도 🏷 버튼. 라벨 페이지는 `?sns=SN1,SN2` / `?items=ITM1,ITM2` / `?purchaseId=...` / `?itemCode=&sn=` 4가지 프리필 모드 지원.
- **인벤토리 흐름 전수정비**: `src/lib/amendments.ts` (IT 계약 ADD/REPLACE/REMOVE), `src/lib/adjustments.ts` (매출/매입 RETURN·EXCHANGE), `src/app/api/sales|purchases/route.ts` (TRADE 강제 S/N + 마스터 매칭 + archive), `src/app/api/as-dispatches/[id]/parts/route.ts` (CONSUMABLE) 모두 `referenceModule`+`subKind` 작성. 단건 `/api/inventory/transactions` 도 `deriveRefModule()` + `deriveSubKind()` 헬퍼로 호환.
- **포탈 QR 스캔**: `/portal/as-request` 와 `/portal/supplies-request` 에 `<QrScanModal>` 정사각형 스캐너 추가 (88% qrbox · `aspect-square` · `max-w-md`). 스캐너 디코드 → 장비/품목 자동 매칭.
- **E2E 테스트 인프라**: `scripts/test-inv-e2e.ts` — 6 거래처/2 창고/5 품목/4 마스터 시드 + 23 시나리오 4 라운드 의존성 정렬 실행 + `BASE_RULES` masterAction + PR DRAFT 카운트 검증 + 교차검증. 결과 31/31 PASS.
