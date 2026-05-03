import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  const tables = [
    "client","item","warehouse","employee","department","bankAccount",
    "costCenter","chartOfAccount","accountMapping","inventoryItem","sales",
    "purchase","payableReceivable","cashTransaction","journalEntry","expense",
    "payroll","license","schedule","itContract","tmRental","asTicket",
    "portalPoint","notification","project",
  ];
  for (const t of tables) {
    try { console.log(t.padEnd(22), "=", await (prisma as any)[t].count()); }
    catch (e: any) { console.log(t.padEnd(22), "= ERR", String(e.message ?? e).slice(0, 80)); }
  }
  await prisma.$disconnect();
})();
