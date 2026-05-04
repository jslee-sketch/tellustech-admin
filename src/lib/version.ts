// ============================================================
// Tellustech ERP — Build Version
//
// 룰 (사용자 정착 2026-05-02):
//  ① 모든 변경사항/커밋마다 이 파일의 VERSION + BUILD_DATE 갱신.
//  ② 사이드바 상단에 즉시 노출.
//  ③ 매뉴얼 (A/B + 3언어) 변경이력 동기 갱신.
//  ④ Chrome 검증 통과해야 PASS.
//
// 버전 체계: vMAJOR.MINOR.PATCH
//   MAJOR = 큰 모델·아키텍처 변경 (예: 16-value enum → 4축 진리표)
//   MINOR = 신규 모듈·진리표 행 추가 (예: SUPPLIES itemType, TRANSFER Internal)
//   PATCH = 버그픽스·UI 개선·i18n·문서 업데이트
// ============================================================

export const VERSION = "v2.9.5";
export const BUILD_DATE = "2026-05-04";
export const VERSION_NOTE = "재고 3화면 보강 + options/평균매입단가/가용수량/현황 컬럼 — 실시간재고: 옵션·가용수량·평균단가·재고금액 / S/N별재고: 옵션·현황(재고/렌탈/수리/교정/데모)·외부위탁위치 / 입출고현황: S/N 옵션 표시 + 단일 S/N 이력 detail card + DB 마이그레이션 (PurchaseItem.options/InventoryItem.options)";
