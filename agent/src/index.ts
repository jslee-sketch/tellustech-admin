// 메인 엔트리. 실행 모드:
//   --setup   : 첫 실행 — 네트워크 스캔 + 사용자 선택 + ERP 등록
//   --silent  : 백그라운드 — 매일 00:00 수집일 체크 + 매일 12:00 업데이트 체크 + 매시간 pending 재시도
//   --collect : 즉시 1회 수집 (디버그/수동 트리거)
//   --status  : 최근 로그 + pending 큐 출력
// 기본: --setup (첫 실행 호환).

import * as cron from "node-cron";
import { loadConfig, AGENT_VERSION } from "./config";
import { runSetup } from "./setup";
import { pollAll } from "./poller";
import { sendReadings, sendHeartbeat } from "./api-client";
import { savePending, getPending, deletePending, incrementRetry, purgeOldPending, appendLog, fileLog, getRecentLogs } from "./local-store";
import { checkAndDownloadUpdate } from "./auto-update";

async function collectOnce(): Promise<void> {
  const config = loadConfig();
  appendLog("info", `collect start — ${config.devices.length} devices`);
  const results = await pollAll(config.devices);
  const successCount = results.filter((r) => r.success).length;
  const errors = results.filter((r) => !r.success).map((r) => `${r.serialNumber}: ${r.error}`);
  appendLog("info", `collected: ${successCount}/${results.length}`);

  // 전송 시도 — 실패 시 5회 재시도 후 포기
  let attempt = 0;
  let sent = false;
  while (attempt < 5 && !sent) {
    attempt++;
    const r = await sendReadings(config, results);
    if (r.ok) {
      appendLog("info", `sent ok: received=${r.received} dedupe=${r.dedupeSkipped}`);
      sent = true;
    } else {
      appendLog("warn", `send failed (attempt ${attempt}/5): ${r.errors?.join(",")}`);
      if (attempt < 5) await new Promise((res) => setTimeout(res, 2000 * attempt));
    }
  }
  if (!sent) {
    appendLog("error", `transmit failed after 5 retries — saving local`);
    savePending(results);
  }

  await sendHeartbeat(config, results.length, successCount, errors).catch(() => undefined);
}

async function retryPending(): Promise<void> {
  const config = loadConfig();
  purgeOldPending(5);
  const pending = getPending();
  if (pending.length === 0) return;
  appendLog("info", `retrying ${pending.length} pending batches`);
  for (const p of pending) {
    const r = await sendReadings(config, p.payload);
    if (r.ok) { deletePending(p.id); appendLog("info", `pending ${p.id} sent ok`); }
    else { incrementRetry(p.id); appendLog("warn", `pending ${p.id} retry++ (${p.retryCount + 1}/5)`); }
  }
}

async function runSilent(): Promise<void> {
  const config = loadConfig();
  fileLog(`agent silent mode start v${AGENT_VERSION}`);

  // 매일 00:00 수집일 체크
  cron.schedule("0 0 * * *", async () => {
    const today = new Date().getDate();
    if (today !== config.snmpCollectDay) return;
    appendLog("info", `📊 monthly auto-collect (day ${today})`);
    await collectOnce();
  });

  // 매시간 pending 재시도
  cron.schedule("0 * * * *", () => { retryPending().catch(() => undefined); });

  // 매일 12:00 자동 업데이트 체크
  cron.schedule("0 12 * * *", async () => {
    appendLog("info", "checking for agent updates");
    const r = await checkAndDownloadUpdate();
    if (r.updated) appendLog("info", `update downloaded v${r.latestVersion} — restart pending`);
  });

  // 시작 시 즉시 heartbeat
  await sendHeartbeat(config, 0, 0, []).catch(() => undefined);
  appendLog("info", "scheduler armed (00:00 collect / hourly retry / 12:00 update check)");

  // 무한 대기 (cron 이 동작하도록 프로세스 유지)
  setInterval(() => { /* keep alive */ }, 60_000);
}

function showStatus(): void {
  console.log(`\nTellustech SNMP Agent v${AGENT_VERSION}\n`);
  try {
    const c = loadConfig();
    console.log(`계약: ${c.contractCode} | 고객: ${c.clientName}`);
    console.log(`등록 장비: ${c.devices.length}대 | 수집일: 매월 ${c.snmpCollectDay}일`);
  } catch (e: any) { console.log(`config 로드 실패: ${e.message}`); }
  const pending = getPending();
  console.log(`\n미전송 큐: ${pending.length}건`);
  console.log(`\n최근 로그:`);
  const logs = getRecentLogs(20);
  logs.forEach((l) => console.log(`  [${l.createdAt}] [${l.level}] ${l.msg}`));
}

async function main(): Promise<void> {
  const arg = process.argv[2] ?? "--setup";
  switch (arg) {
    case "--setup":   await runSetup(); break;
    case "--silent":  await runSilent(); break;
    case "--collect": await collectOnce(); break;
    case "--status":  showStatus(); break;
    default:
      console.log(`Tellustech SNMP Agent v${AGENT_VERSION}\n사용법: tellustech-agent.exe [--setup | --silent | --collect | --status]`);
  }
}

main().catch((e) => { console.error(e); fileLog(`fatal: ${e?.message ?? e}`); process.exit(1); });
