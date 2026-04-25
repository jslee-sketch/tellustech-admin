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
 * 실제 SNMP 쿼리. SNMP_REAL=1 환경변수 + net-snmp 패키지 설치 시 실물 호출.
 * 그 외(개발/스테이징)에는 deterministic mock 으로 매일 증가하는 숫자 반환.
 *
 * IP 가 null/빈문자열이면 mock 으로 fallback (DB 마이그레이션 직후 deviceIp 미입력 상태).
 */
export async function fetchSnmpCounters(
  model: DeviceModel,
  ip: string | null,
): Promise<SnmpReading> {
  const useReal = process.env.SNMP_REAL === "1" && ip;
  const safeIp = ip ?? "0.0.0.0";

  if (useReal) {
    try {
      // 동적 require — 패키지 미설치 시 에러를 잡아 mock 으로 fallback.
      // 타입 어노테이션은 unknown 으로 보존.
      const snmp = await import("net-snmp" as string).catch(() => null) as
        | { createSession: (target: string, community: string) => { get: (oids: string[], cb: (err: unknown, varbinds: { value: number | bigint }[]) => void) => void; close: () => void } }
        | null;
      if (!snmp) {
        return mockReading(model, safeIp, "net-snmp_not_installed");
      }
      const community = process.env.SNMP_COMMUNITY ?? "public";
      const session = snmp.createSession(safeIp, community);
      const oids = [SNMP_OIDS[model].bw, SNMP_OIDS[model].color];
      const varbinds = await new Promise<{ value: number | bigint }[]>((resolve, reject) => {
        session.get(oids, (err: unknown, vb: { value: number | bigint }[]) => {
          session.close();
          if (err) reject(err); else resolve(vb);
        });
      });
      return {
        model,
        ip: safeIp,
        counterBw: Number(varbinds[0]?.value ?? 0),
        counterColor: Number(varbinds[1]?.value ?? 0),
        fetchedAt: new Date(),
        success: true,
      };
    } catch (err) {
      return {
        model, ip: safeIp, counterBw: null, counterColor: null,
        fetchedAt: new Date(), success: false, error: String(err),
      };
    }
  }

  return mockReading(model, safeIp);
}

function mockReading(model: DeviceModel, ip: string, note?: string): SnmpReading {
  const seed = Array.from(ip).reduce((s, c) => s + c.charCodeAt(0), 0);
  const dayOffset = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return {
    model,
    ip,
    counterBw: 1000 + seed * 10 + dayOffset * 100,
    counterColor: 200 + seed * 2 + dayOffset * 30,
    fetchedAt: new Date(),
    success: true,
    ...(note ? { error: `mock(${note})` } : {}),
  };
}

/**
 * 여러 장비 동시 쿼리. 실패한 것은 success=false 로 반환. ip null 허용.
 */
export async function fetchSnmpBatch(
  targets: { model: DeviceModel; ip: string | null; serialNumber: string }[],
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
          ip: targets[i].ip ?? "0.0.0.0",
          serialNumber: targets[i].serialNumber,
          counterBw: null,
          counterColor: null,
          fetchedAt: new Date(),
          success: false,
          error: r.status === "rejected" ? String(r.reason) : "unknown",
        },
  );
}
