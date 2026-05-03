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

export const VERSION = "v2.3.1";
export const BUILD_DATE = "2026-05-03";
export const VERSION_NOTE = "Expense 등록 UI 강화 — 결제방법·업체·귀속·즉시출금 노출 (Layer 1 작업 13 누락분)";
