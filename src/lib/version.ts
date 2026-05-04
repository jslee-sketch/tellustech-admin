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

export const VERSION = "v2.9.3";
export const BUILD_DATE = "2026-05-04";
export const VERSION_NOTE = "입출고 OUT 도착창고 필드 추가 (외부 거래처/Internal 모두) + IN 도착창고 외부창고 옵션 노출 + QR 라벨 마스터 검증 (registered S/N만 QR 생성·item 일치 확인) + S/N 정합성 backfill (123 orphan 자동 마스터 등록) + production 시드+검증 (308 created)";
