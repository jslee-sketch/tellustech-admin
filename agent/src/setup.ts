// 첫 실행 (--setup) 시 콘솔 TUI — 네트워크 스캔 + 사용자 선택 + ERP 등록.
//
// 흐름:
//   1) config.json 로드 (없으면 종료)
//   2) 네트워크 스캔 (스피너)
//   3) 발견된 장비 표시 + 번호 입력
//   4) 선택된 장비를 ERP /register-devices 로 전송 → 토큰 발급
//   5) config.json 갱신 (devices 배열 + token)

import * as readline from "readline";
import { loadConfig, saveConfig, AGENT_VERSION } from "./config";
import { scanNetwork, probeSingleIp } from "./scanner";
import type { DiscoveredDevice } from "./scanner";
import { registerDevices } from "./api-client";
import { fileLog } from "./local-store";

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(question, (a) => { rl.close(); res(a.trim()); }));
}

function box(lines: string[]): void {
  const w = 64;
  console.log("╔" + "═".repeat(w - 2) + "╗");
  for (const l of lines) {
    const pad = Math.max(0, w - 4 - l.length);
    console.log("║ " + l + " ".repeat(pad) + " ║");
  }
  console.log("╚" + "═".repeat(w - 2) + "╝");
}

export async function runSetup(): Promise<void> {
  fileLog(`setup start v${AGENT_VERSION}`);
  let config;
  try { config = loadConfig(); } catch (e: any) { console.error("❌ " + e.message); process.exit(1); return; }

  box([
    `🖨️  Tellustech SNMP Agent v${AGENT_VERSION}`,
    "프린터 자동 검색",
    "",
    `계약: ${config.contractCode}`,
    `고객: ${config.clientName} (${config.clientCode})`,
  ]);
  console.log();

  let discovered: DiscoveredDevice[] = [];
  let attempt = 0;

  while (discovered.length === 0 && attempt < 3) {
    attempt++;
    process.stdout.write(`네트워크 스캔 중... (시도 ${attempt}/3)`);
    discovered = await scanNetwork();
    process.stdout.write("\r" + " ".repeat(60) + "\r");
    if (discovered.length === 0 && attempt < 3) {
      console.log(`⚠️ 발견된 프린터가 없습니다. 다시 시도... (${attempt})`);
    }
  }

  if (discovered.length === 0) {
    box([
      "⚠️ 프린터를 찾지 못했습니다.",
      "",
      "원인:",
      "  1. 프린터가 네트워크에 연결되지 않음",
      "  2. 방화벽이 SNMP(UDP 161) 차단",
      "  3. 프린터 SNMP 설정이 꺼져 있음",
      "",
      "수동 IP 입력 모드:",
    ]);
    const ip = await ask("프린터 IP를 직접 입력하세요 (또는 Enter 로 종료): ");
    if (!ip) process.exit(0);
    const single = await probeSingleIp(ip);
    if (!single) { console.log("❌ 응답 없음. 종료합니다."); process.exit(1); }
    discovered = [single];
  }

  console.log(`발견된 프린터 ${discovered.length}대:\n`);
  discovered.forEach((d, i) => {
    console.log(`  [${i + 1}] ${d.ip}  ${d.brand} ${d.modelName}`);
    console.log(`      S/N: ${d.serialNumber}   카운터: ${d.totalPages.toLocaleString()}`);
    console.log();
  });

  const sel = await ask("우리 장비 번호를 선택하세요 (예: 1,2 / 전체=all): ");
  let selectedIdx: number[] = [];
  if (sel.toLowerCase() === "all") selectedIdx = discovered.map((_, i) => i);
  else selectedIdx = sel.split(",").map((s) => Number(s.trim()) - 1).filter((n) => n >= 0 && n < discovered.length);

  if (selectedIdx.length === 0) { console.log("선택 없음. 종료합니다."); process.exit(0); }

  const selected = selectedIdx.map((i) => discovered[i]);
  console.log(`\n✅ ${selected.length}대 등록 중...\n`);

  const result = await registerDevices(config, selected);
  if (!result.ok) { console.log("❌ ERP 등록 실패. config.json 의 contractToken/erpUrl 을 확인하세요."); process.exit(1); }

  // config 에 결과 반영
  for (const r of result.results) {
    if (r.status === "matched") {
      const disc = selected.find((d) => d.serialNumber === r.serialNumber);
      if (!disc) continue;
      const existing = config.devices.find((d) => d.serialNumber === r.serialNumber);
      if (existing) {
        existing.deviceToken = r.deviceToken;
        existing.deviceIp = disc.ip;
      } else {
        config.devices.push({
          serialNumber: r.serialNumber,
          itemName: `${disc.brand} ${disc.modelName}`,
          deviceModel: null,
          deviceIp: disc.ip,
          deviceToken: r.deviceToken,
          snmpCommunity: "public",
        });
      }
      console.log(`  → ${disc.brand} ${disc.modelName} (${disc.ip}) ✅ 등록 완료`);
    } else if (r.status === "pending_review") {
      console.log(`  → ${r.serialNumber} ⚠️ 미등록 장비 — 관리자 검토 대기`);
    } else {
      console.log(`  → ${r.serialNumber} ❌ ${r.status}`);
    }
  }
  saveConfig(config);

  box([
    "✅ 설정 완료!",
    "",
    `다음 자동 수집: 매월 ${config.snmpCollectDay}일 09:00`,
    "에이전트가 백그라운드에서 실행됩니다.",
    "",
    "[Enter] 키로 닫기",
  ]);
  await ask("");
  fileLog("setup complete");
}
