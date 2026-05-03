import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, requireString, serverError, trimNonEmpty, optionalEnum, requireEnum } from "@/lib/api-utils";
import type { BankAccountType, Currency, BranchType } from "@/generated/prisma/client";

const ACCOUNT_TYPES: readonly BankAccountType[] = ["CHECKING", "SAVINGS", "CASH", "OTHER"] as const;
const CURRENCIES: readonly Currency[] = ["VND", "USD", "KRW", "JPY", "CNY"] as const;
const BRANCHES: readonly BranchType[] = ["BN", "HN", "HCM", "NT", "DN"] as const;

export async function GET() {
  return withSessionContext(async () => {
    const accounts = await prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { accountCode: "asc" },
    });
    return ok({ accounts });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async () => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const accountCode = requireString(p.accountCode, "accountCode");
      const accountName = requireString(p.accountName, "accountName");
      const bankName = requireString(p.bankName, "bankName");
      const accountNumber = requireString(p.accountNumber, "accountNumber");
      const accountType = requireEnum(p.accountType, ACCOUNT_TYPES, "accountType");
      const currency = optionalEnum(p.currency, CURRENCIES) ?? "VND";
      const branchCode = optionalEnum(p.branchCode, BRANCHES);
      const openingBalance = Number(p.openingBalance ?? 0);
      const openingDate = p.openingDate ? new Date(String(p.openingDate)) : new Date();
      const lowBalanceThreshold = p.lowBalanceThreshold ? Number(p.lowBalanceThreshold).toFixed(2) : null;
      const account = await prisma.bankAccount.create({
        data: {
          accountCode, accountName, bankName, accountNumber,
          accountType, currency, branchCode,
          openingBalance: openingBalance.toFixed(2),
          currentBalance: openingBalance.toFixed(2),
          openingDate,
          note: trimNonEmpty(p.note),
          lowBalanceThreshold,
        },
      });
      return ok({ account }, { status: 201 });
    } catch (err) { return serverError(err); }
  });
}
