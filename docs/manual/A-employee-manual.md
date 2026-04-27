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
> 관리자 전용 기능(권한관리·회계마감·휴지통·감사로그 등)은 별책 **B — 관리자 매뉴얼**을 참고하세요.
> 고객사가 사용하는 포탈은 별책 **C — 고객 포탈 가이드**가 따로 있습니다.

---

# 1부. 시작하기

## 1.1 ERP 접속과 로그인

<!-- TODO: 본문 작성 — 접속 URL, 로그인 화면, 회사선택, 비밀번호 분실 -->

## 1.2 첫 로그인 후 해야 할 일

<!-- TODO: 본문 작성 — 비밀번호 변경, 본인 정보 확인, 부서 매핑 -->

## 1.3 언어 전환과 다크모드

<!-- TODO: 본문 작성 — VI/EN/KO 토글, 다크모드는 기본 -->

## 1.4 화면 구성 (사이드바·헤더·메인)

<!-- TODO: 본문 작성
  - 사이드바 그룹 헤더 + 모듈 트리
  - 헤더 우측: 동그란 SVG 국기 3개 (VI/EN/KO 전환)
  - 회사 picker (allowedCompanies > 1 일 때만 표시 — TV/VR 통합조회 모드 전환)
  - 메인 영역: 페이지 헤더, 검색바, 데이터테이블, 우상단 [신규] 버튼
-->

---

# 2부. 마스터 모듈

## 2.1 거래처 (`/master/clients`)

<!-- TODO: 등록·수정·검색·자동검색 콤보박스·수금상태 배지 -->

## 2.2 품목 (`/master/items`)

<!-- TODO: 등록·수정·유형(PRODUCT/CONSUMABLE/PART)·자동코드 ITM-YYMMDD-### -->

## 2.3 창고 (`/master/warehouses`)

<!-- TODO: INTERNAL/EXTERNAL 구분·등록 -->

## 2.4 직원 (`/master/employees`)

<!-- TODO: 등록·자동코드 TNV-### / VNV-### (회사별 일련번호, YYMMDD 미포함) -->

## 2.5 부서 (`/master/departments`)

<!-- TODO: 회사별 부서 트리 -->

## 2.6 프로젝트 (`/master/projects`)

<!-- TODO: 프로젝트 등록·기간·담당자 -->

## 2.7 일정·CFM (`/master/schedules`, `/calendar`)

<!-- TODO: 자동코드 SCH-YYMMDD-###, 캘린더 연동, CFM(컨펌) 상태 -->

## 2.8 라이선스 (`/master/licenses`)

<!-- TODO: 라이선스 만료일 알림 -->

> 호환매핑(`/admin/item-compatibility`)은 관리자 전용입니다. **책 B — 6부**를 참고하세요.

---

# 3부. 영업 (매출/매입)

## 3.1 매출 (`/sales`)
## 3.2 매입 (`/purchases`)
## 3.3 자동검색 콤보박스 — 거래처/품목/S/N 입력
## 3.4 수정·환불(Adjustments)

<!-- TODO -->

---

# 4부. 렌탈

## 4.1 IT 계약 (`/rental/it-contracts`)
## 4.2 TM 렌탈 (`/rental/tm-rentals`)
## 4.3 장비 등록·교체(Amendments)
## 4.4 청구·정산

<!-- TODO -->

---

# 5부. AS

## 5.1 AS 접수 (`/as/tickets`)
## 5.2 AS 출동 (`/as/dispatches`)
## 5.3 4단계 워크플로 (RECEIVED → IN_PROGRESS → COMPLETED → CONFIRMED)
## 5.4 부품 사용·소모품 출고
## 5.5 사진 첨부·서명

<!-- TODO -->

---

# 6부. 재고

## 6.1 재고 현황 (`/inventory/stock`)
## 6.2 입출고 등록 (`/inventory/transactions`) — IN/OUT/TRANSFER + 사유
## 6.3 QR 스캔 입출고 (`/inventory/scan`)
## 6.4 QR 라벨 발행 (`/inventory/labels`)
## 6.5 감가상각 (`/inventory/depreciation`)

<!-- TODO -->

---

# 7부. 인사

## 7.1 입사 (`/hr/onboarding`)
## 7.2 퇴사 (`/hr/offboarding`)
## 7.3 사건평가 (`/hr/incidents`)
## 7.4 정기평가 (`/hr/evaluations`)
## 7.5 연차 (`/hr/leave`)
## 7.6 급여 (`/hr/payroll`)
## 7.7 인센티브 (`/hr/incentives`)

<!-- TODO -->

---

# 8부. 재경

## 8.1 미수금 / 미지급금 (`/finance/payables`)
## 8.2 비용 (`/finance/expenses`)
## 8.3 비용 배분(allocations)

<!-- TODO -->

---

# 9부. 회의 / 캘린더 / 메시징

## 9.1 회의록 (`/weekly-report`, `/meetings`)
## 9.2 캘린더 (`/calendar`)
## 9.3 채팅 (`/chat`)

<!-- TODO -->

---

# 10부. 통계 (열람용)

> 일반 사원에게는 **보기 권한**만 부여됩니다. 분석 도구로 활용하세요.
> 깊이 있는 KPI/SN별 이익 분석은 관리자가 별책 **B — 7부**에서 다룹니다.

## 10.1 매출 / 영업 탭
## 10.2 렌탈 / AS 탭
## 10.3 재고 / 인사 탭
## 10.4 재경 탭

<!-- TODO -->

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
- `allowedCompanies` 가 둘 이상인 사용자(관리자)는 헤더 회사 picker 로 통합조회 모드 전환 가능.
- 공유 마스터(`clients`, `items`, `warehouses`)에는 회사코드 없음.
- 그 외 업무 데이터는 모두 회사코드 필수.
