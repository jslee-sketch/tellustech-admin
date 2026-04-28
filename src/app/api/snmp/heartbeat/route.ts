import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authContractToken } from "@/lib/snmp-token";

// POST /api/snmp/heartbeat — 에이전트 상태 보고
// 헤더: X-Contract-Token
// Body: { agentVersion, agentMachineId?, scannedDevices, successCount, errorMessages?: string[] }
export async function POST(request: Request) {
  const tok = String(request.headers.get("X-Contract-Token") ?? "").trim();
  const contract = await authContractToken(tok);
  if (!contract) return NextResponse.json({ error: "invalid_contract_token" }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }

  await prisma.agentHeartbeat.create({
    data: {
      contractId: contract.id,
      agentVersion: String(body?.agentVersion ?? "?"),
      agentMachineId: String(body?.agentMachineId ?? "") || null,
      scannedDevices: Number(body?.scannedDevices ?? 0),
      successCount: Number(body?.successCount ?? 0),
      errorMessages: Array.isArray(body?.errorMessages) ? body.errorMessages.map(String) : [],
    },
  });
  return NextResponse.json({ ok: true });
}
