// ERP API 통신. fetch (Node 18+ 기본).
// 헤더 인증: deviceToken 또는 contractToken.

import type { AgentConfig, AgentDevice } from "./config";
import { AGENT_VERSION, getMachineId } from "./config";
import type { PollResult } from "./poller";
import type { DiscoveredDevice } from "./scanner";

export type SendResult = { ok: boolean; received?: number; dedupeSkipped?: number; errors?: string[]; httpStatus?: number };

export async function sendReadings(config: AgentConfig, results: PollResult[]): Promise<SendResult> {
  const devicesByToken = new Map(config.devices.map((d) => [d.serialNumber, d]));
  const readings = results.filter((r) => r.success).map((r) => {
    const d = devicesByToken.get(r.serialNumber);
    return {
      deviceToken: d?.deviceToken,
      serialNumber: r.serialNumber,
      brand: r.brand,
      itemName: r.itemName,
      totalPages: r.totalPages,
      bwPages: r.bwPages,
      colorPages: r.colorPages,
      collectedAt: r.collectedAt,
      deviceIp: r.deviceIp,
      agentVersion: AGENT_VERSION,
      agentMachineId: getMachineId(),
    };
  });
  if (readings.length === 0) return { ok: true, received: 0 };

  try {
    const url = new URL(config.agentReadingsPath, config.erpUrl).toString();
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readings }),
    });
    const j: any = await r.json().catch(() => ({}));
    return { ok: r.ok, received: j?.received, dedupeSkipped: j?.dedupeSkipped, errors: j?.errors, httpStatus: r.status };
  } catch (err: any) {
    return { ok: false, errors: [String(err?.message ?? err)] };
  }
}

export async function registerDevices(config: AgentConfig, discovered: DiscoveredDevice[]): Promise<{ ok: boolean; results: any[] }> {
  try {
    const url = new URL(config.agentRegisterPath, config.erpUrl).toString();
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Contract-Token": config.contractToken },
      body: JSON.stringify({ devices: discovered.map((d) => ({ ip: d.ip, serialNumber: d.serialNumber, brand: d.brand, model: d.modelName, totalPages: d.totalPages, sysDescription: d.sysDescription })) }),
    });
    const j: any = await r.json().catch(() => ({}));
    return { ok: r.ok, results: j?.results ?? [] };
  } catch (err: any) {
    return { ok: false, results: [{ error: String(err?.message ?? err) }] };
  }
}

export async function sendHeartbeat(config: AgentConfig, scannedDevices: number, successCount: number, errorMessages: string[]): Promise<void> {
  try {
    const url = new URL(config.agentHeartbeatPath, config.erpUrl).toString();
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Contract-Token": config.contractToken },
      body: JSON.stringify({ agentVersion: AGENT_VERSION, agentMachineId: getMachineId(), scannedDevices, successCount, errorMessages }),
    });
  } catch { /* heartbeat 실패는 무시 */ }
}

export async function checkLatestVersion(config: AgentConfig): Promise<{ latestVersion: string; downloadUrl: string; releaseNotes: string }> {
  try {
    const url = new URL(config.agentVersionCheckPath, config.erpUrl).toString();
    const r = await fetch(url);
    const j: any = await r.json();
    return { latestVersion: String(j?.latestVersion ?? AGENT_VERSION), downloadUrl: String(j?.downloadUrl ?? ""), releaseNotes: String(j?.releaseNotes ?? "") };
  } catch {
    return { latestVersion: AGENT_VERSION, downloadUrl: "", releaseNotes: "" };
  }
}
