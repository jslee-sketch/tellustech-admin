import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authDeviceToken } from "@/lib/snmp-token";

// POST /api/snmp/readings — 에이전트 → ERP 카운터 PUSH
// 헤더: X-Device-Token: tok_xxx (대표 장비). 단일 토큰으로 여러 장비 readings 도 가능 (계약 묶음)
// Body: { readings: [{ deviceToken, serialNumber, brand, itemName, totalPages, bwPages, colorPages, collectedAt, deviceIp, agentVersion?, agentMachineId? }] }
export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const readings = Array.isArray(body?.readings) ? body.readings : [];
  if (readings.length === 0) return NextResponse.json({ error: "empty_readings" }, { status: 400 });

  let received = 0;
  let dedupeSkipped = 0;
  const errors: string[] = [];

  for (const r of readings) {
    const tok = String(r.deviceToken ?? "");
    const eq = await authDeviceToken(tok);
    if (!eq) { errors.push(`auth_failed:${r.serialNumber}`); continue; }

    const collectedAt = new Date(String(r.collectedAt ?? Date.now()));

    // removedAt 이후 reading 거절 (server-side 검증)
    if (eq.removedAt && eq.removedAt < collectedAt) { errors.push(`equipment_removed:${r.serialNumber}`); continue; }

    // 카운터 음수/리셋 감지 — 직전 reading 과 비교
    const prev = await prisma.snmpReading.findFirst({
      where: { equipmentId: eq.id, collectedAt: { lt: collectedAt } },
      orderBy: { collectedAt: "desc" },
      select: { totalPages: true },
    });
    let isCounterReset = false;
    if (prev && Number(r.totalPages) < prev.totalPages) {
      isCounterReset = true;
      // 0 으로 클립하지 않음 — totalPages 는 그대로 저장. usage 계산 시점에 음수 처리.
    }

    try {
      await prisma.snmpReading.create({
        data: {
          equipmentId: eq.id,
          contractId: eq.itContract.id,
          clientId: eq.itContract.clientId,
          brand: String(r.brand ?? "—"),
          itemName: String(r.itemName ?? eq.item?.name ?? "—"),
          serialNumber: String(r.serialNumber ?? eq.serialNumber),
          totalPages: Number(r.totalPages ?? 0),
          bwPages: r.bwPages !== undefined && r.bwPages !== null ? Number(r.bwPages) : null,
          colorPages: r.colorPages !== undefined && r.colorPages !== null ? Number(r.colorPages) : null,
          collectedAt,
          collectedBy: "AGENT",
          deviceIp: String(r.deviceIp ?? "") || null,
          agentVersion: String(r.agentVersion ?? "") || null,
          agentMachineId: String(r.agentMachineId ?? "") || null,
          isCounterReset,
          companyCode: "TV",
        },
      });
      received++;
      // DHCP IP 변경 자동 갱신 + lastReadingAt 갱신
      const newIp = String(r.deviceIp ?? "").trim() || null;
      await prisma.itContractEquipment.update({
        where: { id: eq.id },
        data: {
          lastReadingAt: collectedAt,
          ...(newIp && newIp !== eq.deviceIp ? { deviceIp: newIp } : {}),
        },
      });
    } catch (e: any) {
      // @@unique([equipmentId, collectedAt]) 충돌 → 멱등 처리
      if (String(e?.code) === "P2002") { dedupeSkipped++; continue; }
      errors.push(`db_error:${r.serialNumber}:${e?.message ?? "unknown"}`);
    }
  }

  return NextResponse.json({ ok: true, received, dedupeSkipped, errors });
}
