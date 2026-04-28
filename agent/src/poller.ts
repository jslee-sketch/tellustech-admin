// 등록된 장비 SNMP 폴링.
// config.devices 의 deviceModel 에 따라 OID 결정.
// 모델 OID 는 ERP 가 발급한 config 에 직접 들어있지 않고, 표준 prtMarkerLifeCount 를 fallback 으로 사용.
// 현재 단순화: 표준 OID 만 사용 (총 페이지). 흑백/컬러 분리는 ERP 측 SnmpModelOid 로 넘김.
// → 필요 시 config 에 oid 정보 포함하도록 ERP /generate-package 확장.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const snmp = require("net-snmp");
import type { AgentDevice } from "./config";

const OID_TOTAL = "1.3.6.1.2.1.43.10.2.1.4.1.1";

export type PollResult = {
  serialNumber: string;
  brand: string;
  itemName: string;
  totalPages: number;
  bwPages: number | null;
  colorPages: number | null;
  collectedAt: string;
  deviceIp: string | null;
  success: boolean;
  error?: string;
};

function snmpGet(session: any, oids: string[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    session.get(oids, (err: any, vb: any[]) => {
      if (err) reject(err); else resolve(vb);
    });
  });
}

export async function pollDevice(d: AgentDevice): Promise<PollResult> {
  const ip = d.deviceIp ?? "0.0.0.0";
  const community = d.snmpCommunity ?? "public";
  let session: any = null;
  try {
    session = snmp.createSession(ip, community, { timeout: 5000, retries: 1, version: snmp.Version2c });
    const vb = await snmpGet(session, [OID_TOTAL]);
    const totalPages = Number(vb[0]?.value ?? 0);
    return {
      serialNumber: d.serialNumber,
      brand: d.deviceModel?.split("_")[0]?.replace(/^./, (c) => c.toUpperCase()) ?? "Generic",
      itemName: d.itemName,
      totalPages,
      bwPages: null,
      colorPages: null,
      collectedAt: new Date().toISOString(),
      deviceIp: ip,
      success: true,
    };
  } catch (err: any) {
    return {
      serialNumber: d.serialNumber,
      brand: "—",
      itemName: d.itemName,
      totalPages: 0,
      bwPages: null,
      colorPages: null,
      collectedAt: new Date().toISOString(),
      deviceIp: ip,
      success: false,
      error: String(err?.message ?? err),
    };
  } finally {
    try { session?.close(); } catch { /* */ }
  }
}

export async function pollAll(devices: AgentDevice[]): Promise<PollResult[]> {
  return Promise.all(devices.map(pollDevice));
}
