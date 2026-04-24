import "server-only";

// SNMP 카운터 수집 스텁.
// 실제 연동: npm install net-snmp + 복합기별 OID + 장비 IP 정보 (스키마 확장 필요).
// 여기서는 시뮬레이션 + 추후 실물 연결 포인트.

export type DeviceModel = "SAMSUNG_SLX7500" | "SINDOH_D410" | "SINDOH_D320" | "SINDOH_D330";

// 모델별 OID 매핑 (플레이스홀더 — 실제 장비 문서 참조해 교체 필요)
export const SNMP_OIDS: Record<DeviceModel, { bw: string; color: string }> = {
  SAMSUNG_SLX7500: { bw: "1.3.6.1.4.1.236.11.5.11.53.38.1.0", color: "1.3.6.1.4.1.236.11.5.11.53.38.2.0" },
  SINDOH_D410:     { bw: "1.3.6.1.4.1.46240.1.0", color: "1.3.6.1.4.1.46240.2.0" },
  SINDOH_D320:     { bw: "1.3.6.1.4.1.46240.1.0", color: "1.3.6.1.4.1.46240.2.0" },
  SINDOH_D330:     { bw: "1.3.6.1.4.1.46240.1.0", color: "1.3.6.1.4.1.46240.2.0" },
};

export type SnmpReading = {
  model: DeviceModel;
  ip: string;
  counterBw: number | null;
  counterColor: number | null;
  fetchedAt: Date;
  success: boolean;
  error?: string;
};

/**
 * 실제 SNMP 쿼리를 수행. 현재는 mock 값 반환.
 * 실물 연동 시 net-snmp 의 `session.get([...oids])` 로 교체.
 */
export async function fetchSnmpCounters(
  model: DeviceModel,
  ip: string,
): Promise<SnmpReading> {
  // TODO: net-snmp 연동. 지금은 deterministic mock 으로 테스트용 값 반환.
  // IP + 오늘 날짜 기반으로 숫자 생성 → 매일 조금씩 증가하는 것처럼.
  const seed = Array.from(ip).reduce((s, c) => s + c.charCodeAt(0), 0);
  const dayOffset = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return {
    model,
    ip,
    counterBw: 1000 + seed * 10 + dayOffset * 100,
    counterColor: 200 + seed * 2 + dayOffset * 30,
    fetchedAt: new Date(),
    success: true,
  };
}

/**
 * 여러 장비 동시 쿼리. 실패한 것은 success=false 로 반환.
 */
export async function fetchSnmpBatch(
  targets: { model: DeviceModel; ip: string; serialNumber: string }[],
): Promise<Array<SnmpReading & { serialNumber: string }>> {
  const results = await Promise.allSettled(
    targets.map(async (t) => ({
      ...(await fetchSnmpCounters(t.model, t.ip)),
      serialNumber: t.serialNumber,
    })),
  );
  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          model: targets[i].model,
          ip: targets[i].ip,
          serialNumber: targets[i].serialNumber,
          counterBw: null,
          counterColor: null,
          fetchedAt: new Date(),
          success: false,
          error: r.status === "rejected" ? String(r.reason) : "unknown",
        },
  );
}
