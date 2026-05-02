// Phase 1: 입출고 진리표 (txnType × referenceModule × subKind × ownerType) → 동작 결정.
// 시나리오 6/7/10/11 의 ownerType 분기는 각각 별도 행으로 풀어서 if문 추가 없이 룩업만으로 결정.
//
// SubKind = REQUEST | RETURN | PURCHASE | SALE | BORROW | LEND | OTHER | CONSUMABLE
// ReferenceModule = RENTAL | REPAIR | CALIB | DEMO | TRADE | CONSUMABLE | null
// OwnerType = COMPANY | EXTERNAL_CLIENT (마스터에서 조회됨; IN-신규는 추론)

import type { AssetOwnerType } from "@/generated/prisma/client";

export type TxnTypeNew = "IN" | "OUT" | "TRANSFER";
export type RefModule = "RENTAL" | "REPAIR" | "CALIB" | "DEMO" | "TRADE" | "CONSUMABLE";
export type SubKind = "REQUEST" | "RETURN" | "PURCHASE" | "SALE" | "BORROW" | "LEND" | "OTHER" | "CONSUMABLE";

export type MasterAction =
  | "NEW"        // InventoryItem 마스터 신규생성 (IN + S/N 미존재)
  | "MOVE"       // 마스터 위치/창고 갱신
  | "ARCHIVE"    // 마스터 archivedAt 스탬프 (외부자산 반환)
  | "TRANSFER_LOC" // 마스터 currentLocationClientId 갱신 (외부 위탁)
  | "NONE";      // 마스터 변경 없음 (TRANSFER External↔External)

export interface RuleAction {
  masterAction: MasterAction;
  autoPurchaseCandidate: boolean;  // 매입후보(PR PAYABLE DRAFT) 자동 생성
  autoSalesCandidate: boolean;     // 매출후보(PR RECEIVABLE DRAFT) 자동 생성
  // S/N 필수 여부 (CONSUMABLE 만 false)
  requireSerialNumber: boolean;
  // 외부 위탁 시 currentLocationClientId 갱신 대상
  setExternalLocation: boolean;
  // QR 라벨에 EX 마크
  externalAssetLabel: boolean;
  // 진리표 시나리오 라벨 (디버그·UI 표시용)
  scenarioLabel: string;
  scenarioId: number;
}

// 키 = `${txnType}|${refModule}|${subKind}|${ownerType}`
type RuleKey = `${TxnTypeNew}|${RefModule}|${SubKind}|${AssetOwnerType}`;

// 20행 진리표 (시나리오 6/7/10/11 각각 2분할 + TRADE 3줄)
// Partial — 정의되지 않은 키는 lookupBaseRule 에서 null 반환
export const BASE_RULES: Partial<Record<RuleKey, RuleAction>> = {
  // === 1) 렌탈 ===
  "IN|RENTAL|RETURN|COMPANY": {
    masterAction: "MOVE", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "렌탈/입고/종료 — 자사 렌탈 회수", scenarioId: 1,
  },
  "IN|RENTAL|BORROW|EXTERNAL_CLIENT": {
    masterAction: "NEW", autoPurchaseCandidate: true, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: true,
    scenarioLabel: "렌탈/입고/매입 — 외주에서 빌림", scenarioId: 2,
  },
  "OUT|RENTAL|RETURN|EXTERNAL_CLIENT": {
    masterAction: "ARCHIVE", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "렌탈/출고/반납 — 외주에 반납", scenarioId: 3,
  },
  "OUT|RENTAL|LEND|COMPANY": {
    masterAction: "TRANSFER_LOC", autoPurchaseCandidate: false, autoSalesCandidate: true,
    requireSerialNumber: true, setExternalLocation: true, externalAssetLabel: false,
    scenarioLabel: "렌탈/출고/매출 — 자사 → 고객", scenarioId: 4,
  },

  // === 2) 수리 — 6/7 ownerType 분기 ===
  "IN|REPAIR|REQUEST|EXTERNAL_CLIENT": {
    masterAction: "NEW", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: true,
    scenarioLabel: "수리/입고/요청 — 고객 수리 의뢰", scenarioId: 5,
  },
  // 시나리오 6a — 자사 자산이 외부수리 후 회수 (외주수리비 매입후보)
  "IN|REPAIR|RETURN|COMPANY": {
    masterAction: "MOVE", autoPurchaseCandidate: true, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "수리/입고/매입 (자사) — 외주수리 후 회수, 외주수리비 매입", scenarioId: 6,
  },
  // 시나리오 6b — 고객 자산이 외부수리 거쳤다가 우리에게 다시 옴 (매입 X — 매출은 8 시점)
  "IN|REPAIR|RETURN|EXTERNAL_CLIENT": {
    masterAction: "MOVE", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: true,
    scenarioLabel: "수리/입고/매입 (외부) — 고객자산 외부수리 후 회수", scenarioId: 6,
  },
  // 시나리오 7a — 자사 자산을 외주에 보냄 (매입후보 X — 회수 시점에)
  "OUT|REPAIR|REQUEST|COMPANY": {
    masterAction: "TRANSFER_LOC", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: true, externalAssetLabel: false,
    scenarioLabel: "수리/출고/의뢰 (자사) — 자사자산 외주 의뢰", scenarioId: 7,
  },
  // 시나리오 7b — 고객 자산을 외주에 위탁
  "OUT|REPAIR|REQUEST|EXTERNAL_CLIENT": {
    masterAction: "TRANSFER_LOC", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: true, externalAssetLabel: true,
    scenarioLabel: "수리/출고/의뢰 (외부) — 고객자산 외부수리 위탁", scenarioId: 7,
  },
  "OUT|REPAIR|RETURN|EXTERNAL_CLIENT": {
    masterAction: "ARCHIVE", autoPurchaseCandidate: false, autoSalesCandidate: true,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "수리/출고/매출 — 고객 반환, 수리비 청구", scenarioId: 8,
  },

  // === 3) 교정 — 10/11 ownerType 분기 (수리와 동일 패턴) ===
  "IN|CALIB|REQUEST|EXTERNAL_CLIENT": {
    masterAction: "NEW", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: true,
    scenarioLabel: "교정/입고/요청 — 고객 교정 의뢰", scenarioId: 9,
  },
  "IN|CALIB|RETURN|COMPANY": {
    masterAction: "MOVE", autoPurchaseCandidate: true, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "교정/입고/매입 (자사) — 외부교정비 매입", scenarioId: 10,
  },
  "IN|CALIB|RETURN|EXTERNAL_CLIENT": {
    masterAction: "MOVE", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: true,
    scenarioLabel: "교정/입고/매입 (외부) — 고객자산 외부교정 후 회수", scenarioId: 10,
  },
  "OUT|CALIB|REQUEST|COMPANY": {
    masterAction: "TRANSFER_LOC", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: true, externalAssetLabel: false,
    scenarioLabel: "교정/출고/의뢰 (자사) — 자사자산 외부교정 의뢰", scenarioId: 11,
  },
  "OUT|CALIB|REQUEST|EXTERNAL_CLIENT": {
    masterAction: "TRANSFER_LOC", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: true, externalAssetLabel: true,
    scenarioLabel: "교정/출고/의뢰 (외부) — 고객자산 외부교정 위탁", scenarioId: 11,
  },
  "OUT|CALIB|RETURN|EXTERNAL_CLIENT": {
    masterAction: "ARCHIVE", autoPurchaseCandidate: false, autoSalesCandidate: true,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "교정/출고/매출 — 고객 반환, 교정비 청구", scenarioId: 12,
  },

  // === 4) 데모 (매입·매출 후보 없음) ===
  "IN|DEMO|BORROW|EXTERNAL_CLIENT": {
    masterAction: "NEW", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: true,
    scenarioLabel: "데모/입고/요청 — 외부에서 빌림", scenarioId: 13,
  },
  "IN|DEMO|RETURN|COMPANY": {
    masterAction: "MOVE", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "데모/입고/종료 — 자사 데모 회수", scenarioId: 14,
  },
  "OUT|DEMO|LEND|COMPANY": {
    masterAction: "TRANSFER_LOC", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: true, externalAssetLabel: false,
    scenarioLabel: "데모/출고/요청 — 자사 → 고객", scenarioId: 15,
  },
  "OUT|DEMO|RETURN|EXTERNAL_CLIENT": {
    masterAction: "ARCHIVE", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "데모/출고/종료 — 외부에 반환", scenarioId: 16,
  },

  // === 5) TRADE 매입/매출 (Purchase/Sales 모듈 자동) ===
  "IN|TRADE|PURCHASE|COMPANY": {
    masterAction: "NEW", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "매입 (Purchase 모듈) — 자사 자산 신규", scenarioId: 17,
  },
  "OUT|TRADE|SALE|COMPANY": {
    masterAction: "ARCHIVE", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "매출 (Sales 모듈) — 자사 자산 영구 출고", scenarioId: 18,
  },
  "IN|TRADE|RETURN|COMPANY": {
    masterAction: "MOVE", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "매출 반품 회수 (고객이 매출품 환불) — 자사 창고 입고", scenarioId: 19,
  },
  // 매입 반품 — supplier 에 사 둔 자산을 반환. archive 로 마스터 비활성.
  // PR 자동 후보는 false (refund 음수 처리는 별도 워크플로 — 매입조정 화면에서 처리됨).
  "OUT|TRADE|RETURN|COMPANY": {
    masterAction: "ARCHIVE", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "매입 반품 (자사 자산 supplier 반환) — archive", scenarioId: 23,
  },
  // 폐기 / 스크랩 — IRREPARABLE 자산을 시스템에서 제거. archive.
  "OUT|TRADE|OTHER|COMPANY": {
    masterAction: "ARCHIVE", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "폐기 / 스크랩 (IRREPARABLE 자산 처분) — archive", scenarioId: 24,
  },

  // === 6) 소모품 출고 (AS dispatch) ===
  "OUT|CONSUMABLE|CONSUMABLE|COMPANY": {
    masterAction: "NONE", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: false, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "소모품 출고 (AS 출동·로트 단위)", scenarioId: 20,
  },

  // === 7) 이동 (TRANSFER) ===
  // 자사 ↔ 자사 창고 이동 — fromWarehouseId/toWarehouseId 둘 다 INTERNAL.
  "TRANSFER|TRADE|OTHER|COMPANY": {
    masterAction: "MOVE", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: false, externalAssetLabel: false,
    scenarioLabel: "이동 — 자사 창고 ↔ 자사 창고 (내부재고이동)", scenarioId: 21,
  },
  // 외주 ↔ 외주 이동 (자사 창고 거치지 않음) — fromClientId/toClientId 사용.
  "TRANSFER|RENTAL|OTHER|EXTERNAL_CLIENT": {
    masterAction: "TRANSFER_LOC", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: true, externalAssetLabel: true,
    scenarioLabel: "이동 — 외부 ↔ 외부 (렌탈)", scenarioId: 22,
  },
  "TRANSFER|REPAIR|OTHER|EXTERNAL_CLIENT": {
    masterAction: "TRANSFER_LOC", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: true, externalAssetLabel: true,
    scenarioLabel: "이동 — 외부 ↔ 외부 (수리)", scenarioId: 22,
  },
  "TRANSFER|CALIB|OTHER|EXTERNAL_CLIENT": {
    masterAction: "TRANSFER_LOC", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: true, externalAssetLabel: true,
    scenarioLabel: "이동 — 외부 ↔ 외부 (교정)", scenarioId: 22,
  },
  "TRANSFER|DEMO|OTHER|EXTERNAL_CLIENT": {
    masterAction: "TRANSFER_LOC", autoPurchaseCandidate: false, autoSalesCandidate: false,
    requireSerialNumber: true, setExternalLocation: true, externalAssetLabel: true,
    scenarioLabel: "이동 — 외부 ↔ 외부 (데모)", scenarioId: 22,
  },
};

// 거래처별 예외 — DB 의 ClientRuleOverride 테이블 룩업.
// 평가 함수 — 호출 측에서 prisma 인스턴스로 lookupOverride 후 BASE_RULES 폴백.
export function lookupBaseRule(
  txnType: TxnTypeNew,
  refModule: RefModule | null,
  subKind: SubKind | null,
  ownerType: AssetOwnerType,
): RuleAction | null {
  if (!refModule || !subKind) return null;
  const key: RuleKey = `${txnType}|${refModule}|${subKind}|${ownerType}`;
  return BASE_RULES[key] ?? null;
}

// IN-신규 시 ownerType 추론: subKind 가 REQUEST/BORROW 면 EXTERNAL_CLIENT, 그 외(RETURN/PURCHASE)는 COMPANY.
export function inferOwnerTypeForNewIn(subKind: SubKind): AssetOwnerType {
  return subKind === "REQUEST" || subKind === "BORROW" ? "EXTERNAL_CLIENT" : "COMPANY";
}

// 진리표를 시나리오 ID 로 그룹핑한 보조 (UI 디버그용)
export function describeScenario(action: RuleAction): string {
  return `[${action.scenarioId}] ${action.scenarioLabel}`;
}

// SubKind 옵션 (UI 드롭다운용)
export const SUBKIND_OPTIONS: { value: SubKind; refModuleHint: RefModule[] }[] = [
  { value: "REQUEST", refModuleHint: ["REPAIR", "CALIB", "DEMO"] },
  { value: "RETURN", refModuleHint: ["RENTAL", "REPAIR", "CALIB", "DEMO", "TRADE"] },
  { value: "BORROW", refModuleHint: ["RENTAL", "DEMO"] },
  { value: "LEND", refModuleHint: ["RENTAL", "DEMO"] },
  { value: "PURCHASE", refModuleHint: ["TRADE"] },
  { value: "SALE", refModuleHint: ["TRADE"] },
  { value: "OTHER", refModuleHint: [] },
  { value: "CONSUMABLE", refModuleHint: ["CONSUMABLE"] },
];

// RefModule 옵션
export const REFMODULE_OPTIONS: RefModule[] = ["RENTAL", "REPAIR", "CALIB", "DEMO", "TRADE", "CONSUMABLE"];
