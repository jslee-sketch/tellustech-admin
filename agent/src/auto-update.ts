// 자동 업데이트 — 매일 1회 ERP /api/snmp/agent-version 체크.
// 새 버전 있으면 다운로드 → C:\Tellustech\update\new-agent.exe 저장 → 재시작 시 교체.
//
// 단순화 (Phase 2):
//   - downloadUrl 응답이 있으면 다운로드
//   - 다운로드 완료 시 .pending 파일로 저장
//   - 다음 PC 부팅 시 install.bat 가 .pending → 본 파일로 교체

import * as fs from "fs";
import * as path from "path";
import { INSTALL_DIR, AGENT_VERSION, loadConfig } from "./config";
import { checkLatestVersion } from "./api-client";
import { fileLog } from "./local-store";

export async function checkAndDownloadUpdate(): Promise<{ updated: boolean; latestVersion: string }> {
  try {
    const config = loadConfig();
    const info = await checkLatestVersion(config);
    if (!info.latestVersion || info.latestVersion === AGENT_VERSION) {
      return { updated: false, latestVersion: info.latestVersion };
    }
    if (compareVersions(info.latestVersion, AGENT_VERSION) <= 0) {
      return { updated: false, latestVersion: info.latestVersion };
    }
    if (!info.downloadUrl) {
      fileLog(`update available v${info.latestVersion} but no downloadUrl`);
      return { updated: false, latestVersion: info.latestVersion };
    }
    fileLog(`downloading update v${info.latestVersion}`);
    const dir = path.join(INSTALL_DIR, "update");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpPath = path.join(dir, "new-agent.exe.pending");
    const r = await fetch(info.downloadUrl);
    if (!r.ok) { fileLog(`download failed: ${r.status}`); return { updated: false, latestVersion: info.latestVersion }; }
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(tmpPath, buf);
    // 메타 파일에 새 버전 명시
    fs.writeFileSync(path.join(dir, "version.txt"), info.latestVersion, "utf8");
    fileLog(`update downloaded to ${tmpPath} — restart to apply`);
    return { updated: true, latestVersion: info.latestVersion };
  } catch (err: any) {
    fileLog(`update check error: ${err?.message ?? err}`);
    return { updated: false, latestVersion: AGENT_VERSION };
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0, nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}
