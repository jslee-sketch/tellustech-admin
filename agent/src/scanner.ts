// 네트워크 자동 스캔 — 같은 서브넷의 모든 SNMP 프린터 발견.
//
// 표준 OID 사용:
//   sysDescr     1.3.6.1.2.1.1.1.0
//   prtMarkerLifeCount  1.3.6.1.2.1.43.10.2.1.4.1.1  (총 페이지)
//   prtGeneralSerialNumber 1.3.6.1.2.1.43.5.1.1.17.1 (S/N)
//
// 1~254 IP 병렬 스캔, 응답 없으면 2초 timeout.

import * as os from "os";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const snmp = require("net-snmp");

export type DiscoveredDevice = {
  ip: string;
  serialNumber: string;
  brand: string;
  modelName: string;
  totalPages: number;
  sysDescription: string;
};

const OID_SYS_DESCR = "1.3.6.1.2.1.1.1.0";
const OID_TOTAL = "1.3.6.1.2.1.43.10.2.1.4.1.1";
const OID_SERIAL = "1.3.6.1.2.1.43.5.1.1.17.1";

function getNetworkSubnets(): string[] {
  const ifs = os.networkInterfaces();
  const subnets: string[] = [];
  for (const name of Object.keys(ifs)) {
    for (const iface of ifs[name] ?? []) {
      if (iface.family !== "IPv4" || iface.internal) continue;
      // 192.168.0.123 → 192.168.0
      const parts = iface.address.split(".");
      if (parts.length === 4) subnets.push(parts.slice(0, 3).join("."));
    }
  }
  return [...new Set(subnets)];
}

function snmpGet(session: any, oids: string[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    session.get(oids, (err: any, varbinds: any[]) => {
      if (err) reject(err); else resolve(varbinds);
    });
  });
}

async function probeDevice(ip: string, timeout = 2000): Promise<DiscoveredDevice | null> {
  let session: any = null;
  try {
    session = snmp.createSession(ip, "public", { timeout, retries: 0, version: snmp.Version2c });
    const vb = await snmpGet(session, [OID_SYS_DESCR, OID_TOTAL, OID_SERIAL]);
    const sysDescr = String(vb[0]?.value ?? "");
    const totalPagesRaw = vb[1]?.value;
    const serialRaw = vb[2]?.value;
    if (!totalPagesRaw && totalPagesRaw !== 0) return null; // 프린터 아님
    const totalPages = Number(totalPagesRaw);
    if (!Number.isFinite(totalPages)) return null;

    const brand = detectBrand(sysDescr);
    const modelName = detectModel(sysDescr, brand);
    const serialNumber = String(serialRaw ?? "").trim() || "UNKNOWN";

    return { ip, serialNumber, brand, modelName, totalPages, sysDescription: sysDescr };
  } catch {
    return null;
  } finally {
    try { session?.close(); } catch { /* */ }
  }
}

function detectBrand(sysDescr: string): string {
  const s = sysDescr.toUpperCase();
  if (s.includes("SAMSUNG")) return "Samsung";
  if (s.includes("SINDOH")) return "Sindoh";
  if (s.includes("HP ") || s.includes("HEWLETT")) return "HP";
  if (s.includes("CANON")) return "Canon";
  if (s.includes("BROTHER")) return "Brother";
  if (s.includes("XEROX")) return "Xerox";
  if (s.includes("RICOH")) return "Ricoh";
  if (s.includes("KYOCERA")) return "Kyocera";
  if (s.includes("EPSON")) return "Epson";
  return "Generic";
}

function detectModel(sysDescr: string, brand: string): string {
  // sysDescr 예시: "Samsung SCX-8123ND; S/W:V01.04.04.04;..."
  // 브랜드명 뒤 첫 토큰을 모델명으로 사용
  const idx = sysDescr.toUpperCase().indexOf(brand.toUpperCase());
  if (idx >= 0) {
    const after = sysDescr.slice(idx + brand.length).trim();
    const tok = after.split(/[\s;,]/)[0]?.trim();
    if (tok) return tok;
  }
  // fallback: 첫 80자
  return sysDescr.slice(0, 80);
}

export async function scanNetwork(onProgress?: (pct: number, found: number) => void): Promise<DiscoveredDevice[]> {
  const subnets = getNetworkSubnets();
  if (subnets.length === 0) return [];

  const all: DiscoveredDevice[] = [];
  for (const subnet of subnets) {
    const promises: Promise<DiscoveredDevice | null>[] = [];
    for (let i = 1; i <= 254; i++) {
      promises.push(probeDevice(`${subnet}.${i}`));
    }
    let done = 0;
    for (const p of promises) {
      p.then((r) => {
        done++;
        if (r) all.push(r);
        if (onProgress) onProgress(Math.floor((done / promises.length) * 100), all.length);
      });
    }
    await Promise.allSettled(promises);
  }
  return all;
}

export async function probeSingleIp(ip: string): Promise<DiscoveredDevice | null> {
  return probeDevice(ip, 5000);
}
