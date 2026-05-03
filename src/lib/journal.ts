// 자동 분개 엔진 — Layer 3.
// 매출/매입/Cash/Expense/Payroll 트랜잭션이 발생하면 이 모듈이 호출되어
// JournalEntry + JournalLine 을 생성한다. AccountMapping 으로 모듈→VAS 코드를 lookup.
// 차변=Debit, 대변=Credit. 모든 entry 는 차대 합계가 같아야 한다.

import { prisma } from "@/lib/prisma";
import { generateDatedCode } from "@/lib/code-generator";
import { assertPeriodOpen } from "@/lib/financial-statements";

type LineInput = {
  accountCode: string;
  debit?: number;
  credit?: number;
  description?: string;
  costCenterId?: string;
  clientId?: string;
};

type CreateOpts = {
  entryDate: Date;
  description: string;
  source: "MANUAL" | "SALES" | "PURCHASE" | "CASH" | "EXPENSE" | "PAYROLL" | "ADJUSTMENT";
  sourceModuleId?: string;
  companyCode: "TV" | "VR";
  lines: LineInput[];
  createdById?: string;
  autoPost?: boolean; // true 면 즉시 POSTED, false 면 DRAFT
};

export async function createJournalEntry(opts: CreateOpts): Promise<{ id: string; entryNo: string }> {
  // 차대 검증
  let totalDebit = 0;
  let totalCredit = 0;
  for (const l of opts.lines) {
    totalDebit += Number(l.debit ?? 0);
    totalCredit += Number(l.credit ?? 0);
  }
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`JournalEntry 차대 불일치: debit=${totalDebit} credit=${totalCredit}`);
  }
  if (opts.lines.length < 2) {
    throw new Error("JournalEntry 는 최소 2개 라인 필요");
  }

  // 마감 가드 — closed period 면 throw
  await assertPeriodOpen(new Date(opts.entryDate), opts.companyCode);

  const entryNo = await generateDatedCode({
    prefix: "JE",
    date: new Date(opts.entryDate),
    lookupLast: async (fullPrefix) => {
      const row = await prisma.journalEntry.findFirst({
        where: { entryNo: { startsWith: fullPrefix }, companyCode: opts.companyCode },
        orderBy: { entryNo: "desc" },
        select: { entryNo: true },
      });
      return row?.entryNo ?? null;
    },
  });

  const entry = await prisma.journalEntry.create({
    data: {
      entryNo,
      entryDate: opts.entryDate,
      description: opts.description,
      source: opts.source,
      sourceModuleId: opts.sourceModuleId ?? null,
      status: opts.autoPost ? "POSTED" : "DRAFT",
      postedAt: opts.autoPost ? new Date() : null,
      postedById: opts.autoPost ? opts.createdById ?? null : null,
      createdById: opts.createdById ?? null,
      companyCode: opts.companyCode,
      lines: {
        create: opts.lines.map((l, idx) => ({
          lineNo: idx + 1,
          accountCode: l.accountCode,
          debitAmount: l.debit ?? 0,
          creditAmount: l.credit ?? 0,
          description: l.description ?? null,
          costCenterId: l.costCenterId ?? null,
          clientId: l.clientId ?? null,
          companyCode: opts.companyCode,
        })),
      },
    },
  });

  return { id: entry.id, entryNo };
}

// AccountMapping 에서 트리거별 코드를 lookup. 없으면 null.
export async function lookupAccountCode(
  trigger: string,
  companyCode: "TV" | "VR",
): Promise<string | null> {
  const m = await prisma.accountMapping.findUnique({
    where: { companyCode_trigger: { companyCode, trigger: trigger as never } },
    select: { accountCode: true, isActive: true },
  });
  if (!m || !m.isActive) return null;
  return m.accountCode;
}

// ============================================================
// 자동 분개 hooks — 각 모듈에서 호출.
// 실패해도 원천 트랜잭션은 롤백하지 않음 (try/catch 후 console 만).
// ============================================================

// 매출: 차) 미수금 / 부가세예수금   대) 매출
export async function postSalesJournal(args: {
  salesId: string;
  salesDate: Date;
  totalAmount: number; // 부가세 포함
  vatAmount: number;
  netAmount: number;
  clientId?: string;
  companyCode: "TV" | "VR";
  description: string;
  createdById?: string;
}): Promise<{ id: string; entryNo: string } | null> {
  try {
    const [recvCode, vatCode, revCode] = await Promise.all([
      lookupAccountCode("SALES_RECEIVABLE", args.companyCode),
      lookupAccountCode("SALES_VAT_OUT", args.companyCode),
      lookupAccountCode("SALES_REVENUE", args.companyCode),
    ]);
    if (!recvCode || !revCode) return null;

    const lines: LineInput[] = [
      { accountCode: recvCode, debit: args.totalAmount, description: "매출 미수금", clientId: args.clientId },
      { accountCode: revCode, credit: args.netAmount, description: "매출", clientId: args.clientId },
    ];
    if (args.vatAmount > 0 && vatCode) {
      lines.push({ accountCode: vatCode, credit: args.vatAmount, description: "매출 부가세" });
    }
    return await createJournalEntry({
      entryDate: args.salesDate,
      description: args.description,
      source: "SALES",
      sourceModuleId: args.salesId,
      companyCode: args.companyCode,
      lines,
      createdById: args.createdById,
      autoPost: true,
    });
  } catch (e) {
    console.error("[journal] postSalesJournal failed:", e);
    return null;
  }
}

// 매입: 차) 재고자산 / 매입세액   대) 매입 미지급금
export async function postPurchaseJournal(args: {
  purchaseId: string;
  purchaseDate: Date;
  totalAmount: number;
  vatAmount: number;
  netAmount: number;
  supplierId?: string;
  companyCode: "TV" | "VR";
  description: string;
  createdById?: string;
}): Promise<{ id: string; entryNo: string } | null> {
  try {
    const [invCode, vatCode, payCode] = await Promise.all([
      lookupAccountCode("PURCHASE_INVENTORY", args.companyCode),
      lookupAccountCode("PURCHASE_VAT_IN", args.companyCode),
      lookupAccountCode("PURCHASE_PAYABLE", args.companyCode),
    ]);
    if (!invCode || !payCode) return null;

    const lines: LineInput[] = [
      { accountCode: invCode, debit: args.netAmount, description: "매입 — 재고자산", clientId: args.supplierId },
    ];
    if (args.vatAmount > 0 && vatCode) {
      lines.push({ accountCode: vatCode, debit: args.vatAmount, description: "매입 부가세" });
    }
    lines.push({ accountCode: payCode, credit: args.totalAmount, description: "매입 미지급금", clientId: args.supplierId });

    return await createJournalEntry({
      entryDate: args.purchaseDate,
      description: args.description,
      source: "PURCHASE",
      sourceModuleId: args.purchaseId,
      companyCode: args.companyCode,
      lines,
      createdById: args.createdById,
      autoPost: true,
    });
  } catch (e) {
    console.error("[journal] postPurchaseJournal failed:", e);
    return null;
  }
}

// CashTransaction:
//   IN  : 차) 예금  대) 미수금/매출/기타
//   OUT : 차) 미지급금/비용/기타  대) 예금
//   TRANSFER: 차) 예금(toBank)  대) 예금(fromBank)
export async function postCashJournal(args: {
  cashTxId: string;
  txnDate: Date;
  type: "IN" | "OUT" | "TRANSFER";
  amount: number;
  category?: string; // CashCategory enum string (e.g. "SALES_COLLECTION", "PURCHASE_PAYMENT", "TRANSFER", "OTHER")
  bankAccountCode: string; // 1xx 계열 (보통 112)
  contraAccountCode?: string; // 상대 계정 (생략 시 카테고리로 추론)
  companyCode: "TV" | "VR";
  description: string;
  createdById?: string;
}): Promise<{ id: string; entryNo: string } | null> {
  try {
    // 상대 계정 추론
    let contra = args.contraAccountCode ?? null;
    if (!contra) {
      if (args.type === "IN") {
        if (args.category === "SALES_COLLECTION") contra = await lookupAccountCode("SALES_RECEIVABLE", args.companyCode);
        else contra = await lookupAccountCode("CASH_IN", args.companyCode);
      } else if (args.type === "OUT") {
        if (args.category === "PURCHASE_PAYMENT") contra = await lookupAccountCode("PURCHASE_PAYABLE", args.companyCode);
        else if (args.category === "PAYROLL") contra = await lookupAccountCode("PAYROLL_PAYABLE", args.companyCode);
        else if (args.category === "EXPENSE") contra = await lookupAccountCode("EXPENSE_OPEX", args.companyCode);
        else contra = await lookupAccountCode("CASH_OUT", args.companyCode);
      } else {
        contra = args.bankAccountCode; // TRANSFER 는 동일 계정 (별도 계좌면 외부에서 지정)
      }
    }
    if (!contra) return null;

    const lines: LineInput[] =
      args.type === "IN"
        ? [
            { accountCode: args.bankAccountCode, debit: args.amount, description: args.description },
            { accountCode: contra, credit: args.amount, description: args.description },
          ]
        : args.type === "OUT"
        ? [
            { accountCode: contra, debit: args.amount, description: args.description },
            { accountCode: args.bankAccountCode, credit: args.amount, description: args.description },
          ]
        : [
            { accountCode: args.bankAccountCode, debit: args.amount, description: "이체 입금" },
            { accountCode: contra, credit: args.amount, description: "이체 출금" },
          ];

    return await createJournalEntry({
      entryDate: args.txnDate,
      description: args.description,
      source: "CASH",
      sourceModuleId: args.cashTxId,
      companyCode: args.companyCode,
      lines,
      createdById: args.createdById,
      autoPost: true,
    });
  } catch (e) {
    console.error("[journal] postCashJournal failed:", e);
    return null;
  }
}

// Expense: 차) 비용  대) 미지급금 (PENDING) 또는 예금 (즉시지급)
export async function postExpenseJournal(args: {
  expenseId: string;
  expenseDate: Date;
  amount: number;
  paymentStatus: string; // ExpensePaymentStatus
  costCenterId?: string;
  companyCode: "TV" | "VR";
  description: string;
  createdById?: string;
}): Promise<{ id: string; entryNo: string } | null> {
  try {
    const opexCode = await lookupAccountCode("EXPENSE_OPEX", args.companyCode);
    if (!opexCode) return null;

    let creditCode: string | null = null;
    if (args.paymentStatus === "PAID") {
      // 즉시 출금 — 예금에서 차감
      creditCode = await lookupAccountCode("CASH_OUT", args.companyCode);
    } else {
      // 미지급금
      creditCode = await lookupAccountCode("PURCHASE_PAYABLE", args.companyCode);
    }
    if (!creditCode) return null;

    return await createJournalEntry({
      entryDate: args.expenseDate,
      description: args.description,
      source: "EXPENSE",
      sourceModuleId: args.expenseId,
      companyCode: args.companyCode,
      lines: [
        { accountCode: opexCode, debit: args.amount, description: args.description, costCenterId: args.costCenterId },
        { accountCode: creditCode, credit: args.amount, description: args.description },
      ],
      createdById: args.createdById,
      autoPost: true,
    });
  } catch (e) {
    console.error("[journal] postExpenseJournal failed:", e);
    return null;
  }
}

// Payroll: 차) 급여비용  대) 급여 미지급금 (지급 전) 또는 예금 (지급 완료)
export async function postPayrollJournal(args: {
  payrollId: string;
  payDate: Date;
  amount: number;
  isPaid: boolean;
  companyCode: "TV" | "VR";
  description: string;
  createdById?: string;
}): Promise<{ id: string; entryNo: string } | null> {
  try {
    const salaryCode = await lookupAccountCode("PAYROLL_SALARY", args.companyCode);
    const creditCode = args.isPaid
      ? await lookupAccountCode("CASH_OUT", args.companyCode)
      : await lookupAccountCode("PAYROLL_PAYABLE", args.companyCode);
    if (!salaryCode || !creditCode) return null;

    return await createJournalEntry({
      entryDate: args.payDate,
      description: args.description,
      source: "PAYROLL",
      sourceModuleId: args.payrollId,
      companyCode: args.companyCode,
      lines: [
        { accountCode: salaryCode, debit: args.amount, description: args.description },
        { accountCode: creditCode, credit: args.amount, description: args.description },
      ],
      createdById: args.createdById,
      autoPost: true,
    });
  } catch (e) {
    console.error("[journal] postPayrollJournal failed:", e);
    return null;
  }
}
