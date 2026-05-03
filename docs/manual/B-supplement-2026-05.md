# Tellustech ERP 관리자 매뉴얼 보강판 (v2 · 2026-05)

> 본 문서는 `B-admin-manual.md` 의 핵심 모듈(SNMP·적정율·포탈운영·재고)에 대한 심층 가이드를 보강합니다. 사용자 매뉴얼(`A-employee-manual.md`)의 보강판(A-supplement) 과 함께 보시면 전체 흐름을 이해할 수 있습니다.

---

# 보강 1 — SNMP¹⁰ 자동수집 (심층)

> ¹⁰ SNMP = Simple Network Management Protocol. 네트워크 장비의 상태·카운터를 표준 OID 로 조회하는 프로토콜.

## 전체 워크플로 (관리자 관점)

```
[1] 고객사에 Windows Agent 설치 (admin 다운로드 → 토큰 발급)
       │
       ▼
[2] Agent 가 매시간 프린터 SNMP polling (총 페이지 카운터 등)
       │
       ▼
[3] /api/snmp/ingest 로 카운터 전송 (토큰 인증)
       │
       ▼
[4] DB 에 SnmpReading 저장 (S/N + timestamp + 카운터값)
       │
       ▼
[5] 매월 1일 02:00 KST cron: 사용량 확인서 6단계 워크플로
        ① 전월 카운터 차이 계산
        ② Item.expectedYield 와 비교
        ③ 적정율 산출 → YieldAnalysis 저장
        ④ YieldBadge 부여
        ⑤ 부정 의심 시 ADMIN 알림 (3언어 자동번역)
        ⑥ PDF 생성 → /admin/usage-confirmations 에 저장
       │
       ▼
[6] 고객 포탈 (또는 이메일) 로 PDF 전송 → 청구서 첨부
```

## 토큰 관리

- 발급: `/admin/snmp` → `[+ Agent 발급]` → 고객별 1토큰. 발급 시 1회만 노출 (재조회 불가).
- 폐기: `[Revoke]` → 즉시 `tokenRevokedAt` 스탬프. Agent 401 응답 받음.
- 재발급: 폐기 후 `[+ 재발급]` → 새 토큰. 고객사에 전달 필요.

## Agent 자동 업데이트

- GitHub Releases 의 최신 `.exe` URL 을 `/api/snmp/agent-version` 이 반환.
- Agent 가 시작 시 / 매일 한 번 비교 → 신 버전이면 다운로드 후 자동 재시작.

## 예외 처리

| 상황 | 시스템 동작 | 관리자 조치 |
|---|---|---|
| Agent 가 24시간 연락 두절 | 알림 (`SNMP_AGENT_OFFLINE`) | 고객사에 PC 재시작 안내 |
| 카운터 역행 (≤ 이전값) | reading 무시 + 로그 | 프린터 교체/펌웨어 의심 |
| 전월 데이터 0건 | 사용량 확인서 SKIP | 고객 수동 보고 요청 |

---

# 보강 2 — 소모품 적정율 분석 (`/admin/yield-analysis`)

## 핵심 개념

각 토너 카트리지의 **정격 출력장수**(`Item.expectedYield`) 대비 **실 출력 페이지**(SNMP 카운터)를 비교 → **적정율**(yieldRate) 계산.

```
적정율 = (실제 출력 페이지) / (정격 출력장수 × yieldCoverageBase 보정) × 100%
```

| 적정율 | 배지 | 의미 |
|---|---|---|
| ≥ 90% | 🔵 BLUE | 매우 양호 (정상 사용) |
| 70~89% | 🟢 GREEN | 양호 |
| 50~69% | 🟡 YELLOW | 주의 |
| 30~49% | 🟠 ORANGE | 경고 |
| < 30% | 🔴 RED | **부정 의심** — ADMIN 자동 알림 |

> **컬러 토너 공식** (시안+마젠타+옐로우 동시 소모): 1 페이지 = C+M+Y 모두 1장씩 → 적정율 계산 시 `MIN(sum_C, sum_M, sum_Y)` 사용.

## 4탭 대시보드

| 탭 | 용도 |
|---|---|
| **전체 현황** | 계약별 그룹 + 평균 적정율 |
| **부정 의심** | RED 배지만 필터. 조사 완료 표시 가능 |
| **기사별 통계** | 향후 확장 — 현재는 거래처별 |
| **설정** | 임계값(BLUE/GREEN/YELLOW/ORANGE) 조정. 단조감소 유지 |

## 임계값 변경

`/admin/yield-analysis` → **설정** 탭 → 슬라이더 또는 직접 입력. 저장 시 다음 월간 cron 부터 적용.

> 임계값은 **단조감소** 여야 함 (BLUE > GREEN > YELLOW > ORANGE > 0). 위반 시 저장 거부.

## 부정 의심 워크플로

1. 매월 1일 cron 이 RED 자동 검출.
2. ADMIN 들에게 `NotificationType.YIELD_FRAUD_SUSPECT` (3언어).
3. `/admin/yield-analysis` → **부정 의심** 탭 → 행 펼치기 → 카운터 이력 확인.
4. 조사 후 `[조사 완료]` 클릭 → `fraudReviewedAt` + `fraudReviewNote` 기록.

---

# 보강 3 — 고객 포탈 운영 (Phase A·B·C·D)

## 4개 Phase 개요

| Phase | 화면 | 의미 |
|---|---|---|
| **A** | `/admin/portal-points` | 포탈 포인트 — 매출액 기준 자동 적립 + 수동 조정 |
| **B** | `/admin/portal-banners` | 포탈 배너 — 3언어 텍스트 + 이미지 스케줄 |
| **C** | `/admin/portal-posts` | 포탈 게시글 — AI 초안 생성 + 검토 후 발행 |
| **D** | `/admin/feedback` + `/admin/surveys` + `/admin/referrals` | 고객 의견·서베이·업체 추천 |

## Phase C — AI 게시글 자동 생성

- **월요일 09:00 KST** cron `/api/jobs/portal-news-generate` 가 자동 실행.
- 매출 데이터, 적정율 통계, 신규 고객 등 수치를 Claude API 에 전달.
- 3언어(VI/EN/KO) 초안 동시 생성 → `draft` 탭에 저장.
- 관리자가 검토 후 `[발행]` 클릭 → 고객 포탈에 노출.

## Phase D 운영

- **고객 의견** (`/admin/feedback`): 고객이 포탈에서 보낸 1줄 의견. 카테고리·중요도 라벨링 후 회의 안건 등재 가능.
- **서베이** (`/admin/surveys`): 분기별 NPS 등 정기 조사. 응답률 + 점수 트렌드.
- **업체 추천** (`/admin/referrals`): 기존 고객이 추천한 신규 업체. 첫 입금 발생 시 추천인에게 포인트 지급.

---

# 보강 4 — 재고 4축 진리표 (관리자용 심층)

`A-supplement-2026-05.md` 의 6.2 절을 참조하되, 관리자가 알아야 할 추가 사항:

## ClientRuleOverride

특정 거래처에 대해 **BASE_RULES 의 일부 행을 덮어쓰기** 할 수 있습니다.

```sql
-- 예: ABC 거래처는 외주수리 후 회수해도 매입후보 자동 생성하지 않도록.
INSERT INTO "ClientRuleOverride" (clientId, referenceModule, overrideJson)
VALUES ('client_abc', 'REPAIR', '{"autoPurchaseCandidate": false}');
```

UI 는 추후 추가 예정. 현재는 DB 직접 변경.

## 진리표 변경 절차

1. `src/lib/inventory-rules.ts` 의 `BASE_RULES` 객체 수정.
2. `SubKind` 타입 확장 시 i18n 콤보 라벨 추가.
3. `transaction-new-form.tsx` `COMBOS_BY_TYPE` 업데이트.
4. `/api/inventory/sn/[sn]/state` 추천 로직 보강.
5. E2E 테스트 (`scripts/test-inv-e2e.ts`) 시나리오 추가.

> 룰 추가 시 **autoPurchaseCandidate / autoSalesCandidate** 가 PR DRAFT 자동 생성을 트리거합니다. 회계 흐름 검증 필수.

---

# 보강 5 — 회계 마감 (`/admin/closings`)

## 마감 동작

매월 단위(`YYYY-MM`)로 4종 레코드를 일괄 잠금:

| 잠금 대상 | 효과 |
|---|---|
| `Sales` | 매출 수정·삭제 차단 |
| `Purchase` | 매입 수정·삭제 차단 |
| `InventoryTransaction` | 입출고 수정·삭제 차단 |
| `PayableReceivable` | 미수금/미지급금 수정·삭제 차단 |

각 레코드에 `lockedAt = now()`, `lockReason = "회계 마감 YYYY-MM"` 자동 스탬프.

## 잠금 해제

원칙적으로 마감 후 해제 불가. 단, 긴급 시 ADMIN 권한으로 `/admin/closings` → 해당 월 → **[잠금 해제]** → `lockedAt = NULL`. 모든 변경은 `audit_log` 에 기록.

---

# 보강 6 — 권한관리 (`/admin/permissions`)

## 역할(Role) 기반

| Role | 의미 |
|---|---|
| `ADMIN` | 시스템 전체 (회사 통합조회 가능) |
| `MANAGER` | 회사 내 모든 모듈 |
| `EMPLOYEE` | 자신의 데이터 + 부서 내 일부 모듈 |
| `CLIENT` | 고객 포탈 전용 (별도 인증) |

## allowedCompanies

각 사용자의 `allowedCompanies` 컬럼:
- `["TV"]` 또는 `["VR"]` → 해당 회사만
- `["TV","VR"]` → 통합 조회 가능 (사이드바 ALL 버튼 노출)

회사 전환 시 모든 SQL 쿼리에 `WHERE company_code = :session` 자동 주입.

---

# 보강 7 — 감사로그 (`/admin/audit-logs`)

## 자동 기록 대상

모든 업무 테이블의 INSERT / UPDATE / DELETE:
- 어떤 테이블, 어떤 행 (`record_id`)
- 변경 전 값 (`before` JSON)
- 변경 후 값 (`after` JSON)
- 누가 (`user_id`), 언제 (`createdAt`), 어느 회사 (`company_code`)

## 검색 / 필터

- 테이블명 / 기간 / 사용자 / 회사 코드.
- 변경 다이프 자동 표시 (before vs after 색상).

---

# 보강 8 — 휴지통 (`/admin/trash`)

## 7일 복원 정책

소프트 삭제된 모든 레코드는 **7일** 동안 휴지통에 보관. 7일 경과 시 자동 영구 삭제 (다음 cron 에서).

| 액션 | 권한 |
|---|---|
| 복원 (`Restore`) | ADMIN |
| 즉시 영구 삭제 | ADMIN (7일 대기 무시) |
| 7일 자동 삭제 | 시스템 cron (매일 01:00 KST) |

## 복원 시 고려사항

- 외래 키 의존성 자동 검증. 부모 레코드가 이미 영구 삭제됐으면 복원 거부.
- `audit_log` 에 `restored_at` 기록.

---

# 보강 9 — Mock 매출 워크플로

테스트 / 데모용 매출 자동 생성 도구.

| 단계 | 동작 |
|---|---|
| ① IT 계약 선택 | 활성 계약 중 한 개 |
| ② 월 선택 | 매출 발생 월 |
| ③ 자동 단가 적용 | 본체 + 소모품 단가 |
| ④ Mock Sales 생성 | `OUT/TRADE/SALE/COMPANY` 트랜잭션 + Sales 행 |

생성된 매출은 `mock=true` 플래그로 감사 로그에 기록. 회계마감 전 정리 권장.

---

# 보강 10 — 거래처 포탈 계정 관리

## 자동 생성 흐름

`Client` 마스터에 `email` 입력 → 저장 시 자동:
1. 임시 비밀번호 생성 (1회용 토큰).
2. Welcome 이메일 (3언어) 발송.
3. 첫 로그인 시 비밀번호 변경 강제.

## 액세스 토큰 / 세션

- 포탈 로그인 → 쿠키 `tts_session` (회사 ERP 와 별개).
- 만료 24시간. 만료 시 재로그인 필요.
- 비밀번호 분실 시 ADMIN 이 `[리셋]` 버튼으로 재발급.

---

# 보강 11 — 재고 현상태 기술 (자유서술)

`InventoryItem.stateNoteVi/En/Ko` + `stateNoteOriginalLang` — S/N 단위 현상태 메모.

## 입력 시점

- 재고 현황 화면에서 상태 변경(NEEDS_REPAIR 등) 시 같이 입력.
- AS 디스패치 후 결과 메모.
- 매월 점검 결과.

## 자동 번역

저장 시 Claude API 가 나머지 2개 언어로 즉시 번역. 사용자 표시 언어로 자동 노출.

---

# 부록 (관리자) — 추가 색인

| 약어/용어 | 의미 |
|---|---|
| **AGENT_OFFLINE** | SNMP Agent 24h 연락두절 알림 |
| **CRON** | 정기 실행 작업 (cron expression) |
| **fraudReviewedAt** | 부정 의심 조사 완료 시점 |
| **HMR** | Hot Module Replacement (개발 모드) |
| **SnmpReading** | SNMP 카운터 1건 저장 모델 |
| **softDelete** | 7일 휴지통 보관 후 영구 삭제 |
| **YieldAnalysis** | 월별 적정율 분석 결과 모델 |
| **YieldConfig** | 임계값 설정 모델 |
| **mock=true** | Mock 매출 표식 |

---

# 변경 이력 (관리자 매뉴얼 v2 보강판)

- **2026-05-02**: 본 보강판 발행.
- **2026-05-01**: 4축 진리표 30→34행, SUPPLIES itemType, 매입반품/폐기/재고조정/분해조립 콤보.
- **2026-04 후반**: ClientRuleOverride, 자동 PR DRAFT, AI 포탈 게시글, SNMP 6단계 워크플로 + PDF.
- **2026-04 중반**: NIIMBOT B21 라벨, QR 다중 스캔, 컬러 채널 배지.
- **2026-04 초반**: 적정율 4탭 + 부정 의심 알림, 거래처 포탈 자동 계정 발급.
