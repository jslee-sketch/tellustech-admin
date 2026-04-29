import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

(async () => {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: "KORTECH", mode: "insensitive" } },
        { username: { contains: "kortech", mode: "insensitive" } },
        { username: { startsWith: "CL-E2E-001" } },
        { clientAccount: { clientCode: { in: ["KORTECH", "CL-E2E-001"] } } },
      ],
    },
    select: { id: true, username: true, role: true, isActive: true, mustChangePassword: true, clientId: true, lastLoginAt: true, createdAt: true, clientAccount: { select: { clientCode: true, companyNameVi: true } } },
  });
  console.log("matched users:", users.length);
  for (const u of users) console.log(" ", JSON.stringify(u));

  const c1 = await prisma.client.findUnique({ where: { clientCode: "KORTECH" }, include: { portalUser: true } });
  const c2 = await prisma.client.findUnique({ where: { clientCode: "CL-E2E-001" }, include: { portalUser: true } });
  console.log("\nKORTECH client portalUser:", c1?.portalUser ? { username: c1.portalUser.username, isActive: c1.portalUser.isActive, mustChange: c1.portalUser.mustChangePassword } : "(none)");
  console.log("CL-E2E-001 portalUser:", c2?.portalUser ? { username: c2.portalUser.username, isActive: c2.portalUser.isActive, mustChange: c2.portalUser.mustChangePassword } : "(none)");

  await prisma.$disconnect();
})();
