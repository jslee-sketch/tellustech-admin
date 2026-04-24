import { NextResponse } from "next/server";
import { withSessionContext } from "@/lib/session";
import { fetchSnmpBatch, type DeviceModel } from "@/lib/snmp";

// POST: 장비 목록 (model, ip, serialNumber) 를 받아 SNMP mock 조회 → 카운터 반환.
// 실제 연동은 net-snmp 설치 + 장비 IP 스키마 추가 후. 현재는 구조만.

export async function POST(request: Request) {
  return withSessionContext(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const targets = Array.isArray((body as { targets?: unknown }).targets)
      ? ((body as { targets: { model: DeviceModel; ip: string; serialNumber: string }[] }).targets)
      : [];
    if (targets.length === 0) return NextResponse.json({ error: "no_targets" }, { status: 400 });
    const readings = await fetchSnmpBatch(targets);
    return NextResponse.json({ readings, note: "SNMP 연동 스텁 — 실제 net-snmp 설치 후 교체 예정" });
  });
}
