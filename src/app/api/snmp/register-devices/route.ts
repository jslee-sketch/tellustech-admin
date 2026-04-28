import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authContractToken, generateToken, tokenExpiresAt } from "@/lib/snmp-token";

// POST /api/snmp/register-devices
// 헤더: X-Contract-Token: ctr_xxx
// Body: { devices: [{ ip, serialNumber, brand, model, totalPages, sysDescription? }] }
// 처리:
//   1) 계약 토큰 인증
//   2) S/N 매칭 → ItContractEquipment 갱신 (deviceIp + token 발급)
//   3) 매칭 안 되면 SnmpUnregisteredDevice 큐에 적재 (관리자 검토 대기)
//   4) 응답: 각 장비의 deviceToken (매칭 성공한 것만)
export async function POST(request: Request) {
  const tok = String(request.headers.get("X-Contract-Token") ?? "").trim();
  const contract = await authContractToken(tok);
  if (!contract) return NextResponse.json({ error: "invalid_contract_token" }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const devices = Array.isArray(body?.devices) ? body.devices : [];
  if (devices.length === 0) return NextResponse.json({ error: "empty_devices" }, { status: 400 });

  const results: any[] = [];

  for (const d of devices) {
    const sn = String(d.serialNumber ?? "").trim();
    if (!sn) { results.push({ serialNumber: null, status: "missing_serial" }); continue; }

    const eq = await prisma.itContractEquipment.findFirst({
      where: { itContractId: contract.id, serialNumber: sn, removedAt: null },
    });

    if (eq) {
      // 매칭 성공 — 토큰 발급/갱신 + IP 갱신
      const token = eq.deviceToken && !eq.deviceTokenRevokedAt ? eq.deviceToken : generateToken();
      await prisma.itContractEquipment.update({
        where: { id: eq.id },
        data: {
          deviceToken: token,
          deviceTokenExpiresAt: tokenExpiresAt(),
          deviceTokenRevokedAt: null,
          deviceIp: String(d.ip ?? "").trim() || eq.deviceIp,
          deviceModel: String(d.model ?? "").trim() ? guessModelKey(String(d.brand ?? ""), String(d.model ?? "")) : eq.deviceModel,
          installCounterBw: eq.installCounterBw ?? Number(d.totalPages ?? 0) ?? null,
        },
      });
      results.push({ serialNumber: sn, status: "matched", deviceToken: token });
    } else {
      // 매칭 실패 — 미등록 장비 큐
      const existingUnreg = await prisma.snmpUnregisteredDevice.findFirst({
        where: { contractId: contract.id, serialNumber: sn, status: "PENDING" },
      });
      if (existingUnreg) {
        await prisma.snmpUnregisteredDevice.update({
          where: { id: existingUnreg.id },
          data: { lastSeenAt: new Date(), ip: String(d.ip ?? "").trim() || existingUnreg.ip },
        });
      } else {
        await prisma.snmpUnregisteredDevice.create({
          data: {
            contractId: contract.id,
            ip: String(d.ip ?? "").trim() || "0.0.0.0",
            serialNumber: sn,
            brand: String(d.brand ?? "").trim() || null,
            modelName: String(d.model ?? "").trim() || null,
            sysDescription: String(d.sysDescription ?? "").trim() || null,
            totalPages: d.totalPages !== undefined ? Number(d.totalPages) : null,
            status: "PENDING",
          },
        });
      }
      results.push({ serialNumber: sn, status: "pending_review" });
    }
  }

  return NextResponse.json({ ok: true, results });
}

// 브랜드 + 모델 문자열 → SnmpModelOid.deviceModel 키 추정
function guessModelKey(brand: string, model: string): string | null {
  const b = brand.toUpperCase();
  const m = model.toUpperCase().replace(/[\s\-_]/g, "");
  if (b.includes("SAMSUNG") && m.includes("SCX8123")) return "SAMSUNG_SCX8123";
  if (b.includes("SAMSUNG") && m.includes("X7500")) return "SAMSUNG_X7500";
  if (b.includes("SINDOH") && m.includes("D330")) return "SINDOH_D330";
  if (b.includes("SINDOH") && m.includes("D410")) return "SINDOH_D410";
  if (b.includes("SINDOH") && m.includes("D320")) return "SINDOH_D320";
  return "GENERIC_PRINTER";
}
