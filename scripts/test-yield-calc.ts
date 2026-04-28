// 적정율 계산 결과 검증 — 핵심 공식만 inline 으로 검증.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function classify(name: string): "BW" | "CYAN" | "MAGENTA" | "YELLOW" {
  if (/cyan/i.test(name)) return "CYAN";
  if (/magenta/i.test(name)) return "MAGENTA";
  if (/yellow/i.test(name)) return "YELLOW";
  return "BW";
}
function pickBadge(rate: number): string {
  if (rate >= 120) return "BLUE";
  if (rate >= 80) return "GREEN";
  if (rate >= 50) return "YELLOW";
  if (rate >= 30) return "ORANGE";
  return "RED";
}

const SCENARIOS = [
  { sn: "SN-X7500-K001", expected: { bw: 90, color: 90, badgeBw: "GREEN" } },
  { sn: "SN-D330-H001",  expected: { bw: 60, color: null, badgeBw: "YELLOW" } },
  { sn: "SN-X7500-W001", expected: { bw: 20, color: 20, badgeBw: "RED" } },
  { sn: "SN-D330-S001",  expected: { bw: 130, color: null, badgeBw: "BLUE" } },
  { sn: "SN-X7500-C001", expected: { bw: 85, color: null, badgeBw: "GREEN" } },
];

const periodStart = new Date("2026-01-01");
const periodEnd = new Date("2026-04-01");

async function calc(sn: string) {
  const eq = await prisma.itContractEquipment.findFirst({ where: { serialNumber: sn } });
  if (!eq) return null;

  const startReading = await prisma.snmpReading.findFirst({
    where: { equipmentId: eq.id, collectedAt: { lte: periodStart } },
    orderBy: { collectedAt: "desc" },
  });
  const endReading = await prisma.snmpReading.findFirst({
    where: { equipmentId: eq.id, collectedAt: { lte: periodEnd } },
    orderBy: { collectedAt: "desc" },
  });
  const actualBw = Math.max(0, (endReading?.bwPages ?? endReading?.totalPages ?? 0) - (startReading?.bwPages ?? startReading?.totalPages ?? 0));
  const actualColor = Math.max(0, (endReading?.colorPages ?? 0) - (startReading?.colorPages ?? 0));

  const parts = await prisma.asDispatchPart.findMany({
    where: {
      targetEquipmentSN: sn,
      asDispatch: { completedAt: { gte: periodStart, lte: periodEnd } },
    },
    include: { item: true },
  });

  const ac = eq.actualCoverage ?? 5;
  let expBw = 0;
  const groups: Record<"CYAN"|"MAGENTA"|"YELLOW", number> = { CYAN: 0, MAGENTA: 0, YELLOW: 0 };
  for (const p of parts) {
    if (!p.item.expectedYield) continue;
    const ratio = (p.item.yieldCoverageBase ?? 5) / Math.max(1, ac);
    const contributed = p.quantity * p.item.expectedYield * ratio;
    const c = classify(p.item.name);
    if (c === "BW") expBw += contributed;
    else groups[c] += contributed;
  }
  const colorPresent = groups.CYAN > 0 && groups.MAGENTA > 0 && groups.YELLOW > 0;
  const expColor = colorPresent ? Math.min(groups.CYAN, groups.MAGENTA, groups.YELLOW) : 0;
  const rateBw = expBw > 0 ? Math.round((actualBw / expBw) * 1000) / 10 : 0;
  const rateColor = expColor > 0 ? Math.round((actualColor / expColor) * 1000) / 10 : null;
  return { rateBw, rateColor, badgeBw: pickBadge(rateBw), badgeColor: rateColor !== null ? pickBadge(rateColor) : null, actualBw, expBw, actualColor, expColor };
}

async function main() {
  let pass = 0, fail = 0;
  for (const s of SCENARIOS) {
    const r = await calc(s.sn);
    if (!r) { console.log(`❌ ${s.sn}: equipment not found`); fail++; continue; }
    const okBw = Math.abs(r.rateBw - s.expected.bw) < 1;
    const okBadge = r.badgeBw === s.expected.badgeBw;
    const okColor = s.expected.color === null
      ? r.rateColor === null || r.rateColor === 0
      : r.rateColor !== null && Math.abs(r.rateColor - s.expected.color) < 1;
    const ok = okBw && okBadge && okColor;
    if (ok) pass++; else fail++;
    console.log(
      `${ok ? "✅" : "❌"} ${s.sn}: BW ${r.actualBw}/${r.expBw}=${r.rateBw}% [${r.badgeBw}]` +
      (r.rateColor !== null ? ` Color ${r.actualColor}/${r.expColor}=${r.rateColor}% [${r.badgeColor}]` : "") +
      `  (expected BW ${s.expected.bw}% ${s.expected.badgeBw}${s.expected.color !== null ? `, Color ${s.expected.color}%` : ""})`,
    );
  }
  console.log(`\n결과: ${pass}/${SCENARIOS.length} PASS`);
  if (fail > 0) process.exit(1);
}

main().catch(console.error).finally(() => prisma.$disconnect());
