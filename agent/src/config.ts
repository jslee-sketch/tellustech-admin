// 에이전트 설정 — config.json 로드/저장. 설치 폴더 기준 파일 경로.
// install.bat 가 ZIP 의 config.json 을 C:\Tellustech\ 으로 복사 후, 끝에 ZIP 의 config.json 을 삭제 (보안).
//
// config.json 구조 (ERP /api/admin/snmp/generate-package 응답과 동일):
//   {
//     erpUrl, contractCode, clientCode, clientName, contractToken, snmpCollectDay,
//     devices: [{ serialNumber, itemName, deviceModel, deviceIp, deviceToken, snmpCommunity }],
//     agentVersionCheckPath, agentReadingsPath, agentRegisterPath, agentHeartbeatPath
//   }

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

export type AgentDevice = {
  serialNumber: string;
  itemName: string;
  deviceModel: string | null;
  deviceIp: string | null;
  deviceToken: string;
  snmpCommunity: string;
};

export type AgentConfig = {
  erpUrl: string;
  contractCode: string;
  clientCode: string;
  clientName: string;
  contractToken: string;
  snmpCollectDay: number;
  devices: AgentDevice[];
  agentVersionCheckPath: string;
  agentReadingsPath: string;
  agentRegisterPath: string;
  agentHeartbeatPath: string;
};

export const AGENT_VERSION = "1.0.0";

export const INSTALL_DIR = process.env.AGENT_DIR ?? "C:\\Tellustech";
export const CONFIG_PATH = path.join(INSTALL_DIR, "config.json");
export const LOG_DIR = path.join(INSTALL_DIR, "logs");
export const DB_PATH = path.join(INSTALL_DIR, "agent.db");

export function loadConfig(): AgentConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`config.json not found at ${CONFIG_PATH}. install.bat 으로 설치 후 다시 실행하세요.`);
  }
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return JSON.parse(raw) as AgentConfig;
}

export function saveConfig(config: AgentConfig): void {
  if (!fs.existsSync(INSTALL_DIR)) fs.mkdirSync(INSTALL_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

// PC 머신 식별자 (DPAPI 대신 hostname + 직렬번호로 단순화)
export function getMachineId(): string {
  const hash = crypto.createHash("sha256");
  hash.update(os.hostname());
  hash.update(os.platform());
  hash.update(os.arch());
  return hash.digest("hex").slice(0, 16);
}
