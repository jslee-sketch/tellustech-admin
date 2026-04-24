-- CreateEnum
CREATE TYPE "CompanyCode" AS ENUM ('TV', 'VR');

-- CreateEnum
CREATE TYPE "BranchType" AS ENUM ('BN', 'HN', 'HCM', 'NT', 'DN');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('VI', 'EN', 'KO');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'SALES', 'TECH', 'CALIBRATION', 'ACCOUNTING', 'HR', 'CLIENT');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('PRODUCT', 'CONSUMABLE', 'PART');

-- CreateEnum
CREATE TYPE "WarehouseType" AS ENUM ('INTERNAL', 'EXTERNAL', 'CLIENT');

-- CreateEnum
CREATE TYPE "ClientGrade" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('NORMAL', 'WARNING', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RentalType" AS ENUM ('IT', 'TM');

-- CreateEnum
CREATE TYPE "StockCheckMode" AS ENUM ('STRICT', 'LOOSE');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "BillingMethod" AS ENUM ('SNMP', 'MANUAL', 'PHOTO');

-- CreateEnum
CREATE TYPE "InventoryTxnType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "InventoryReason" AS ENUM ('PURCHASE', 'CALIBRATION', 'REPAIR', 'RENTAL', 'DEMO', 'RETURN', 'CONSUMABLE_OUT');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE');

-- CreateEnum
CREATE TYPE "ASStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'DISPATCHED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('PRAISE', 'IMPROVEMENT');

-- CreateEnum
CREATE TYPE "EvaluationGrade" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('LT', 'P', 'KSX', 'CT7', 'DB', 'TS', 'KL', 'X');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('PURCHASE', 'SALES', 'GENERAL');

-- CreateEnum
CREATE TYPE "AllocationBasis" AS ENUM ('QUANTITY', 'AMOUNT');

-- CreateEnum
CREATE TYPE "PayableReceivableKind" AS ENUM ('PAYABLE', 'RECEIVABLE');

-- CreateEnum
CREATE TYPE "PayableReceivableStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('STOCK_LOW', 'AS_NEW', 'CONTRACT_EXPIRING', 'CALIBRATION_DUE', 'RECEIVABLE_OVERDUE', 'SCHEDULE_DUE', 'LICENSE_EXPIRING', 'OTHER');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('PDF', 'PHOTO', 'SIGNATURE', 'RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "ScheduleConfirmStatus" AS ENUM ('ON_TIME', 'LATE');

-- CreateEnum
CREATE TYPE "OnboardingOffboardingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ChatRoomType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "SalesType" AS ENUM ('IT_RENTAL', 'TM_RENTAL', 'CALIBRATION', 'REPAIR', 'PRODUCT_SALES', 'SERVICE', 'OTHER');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branchType" "BranchType" NOT NULL,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "departmentId" TEXT,
    "nameVi" TEXT NOT NULL,
    "nameEn" TEXT,
    "nameKo" TEXT,
    "position" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "photoUrl" TEXT,
    "idCardNumber" TEXT,
    "idCardPhotoUrl" TEXT,
    "salary" DECIMAL(15,2),
    "insuranceNumber" TEXT,
    "contractType" TEXT,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "hireDate" TIMESTAMP(3),
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "clientCode" TEXT NOT NULL,
    "companyNameVi" TEXT NOT NULL,
    "companyNameEn" TEXT,
    "companyNameKo" TEXT,
    "taxCode" TEXT,
    "businessLicenseNo" TEXT,
    "bankAccountNumber" TEXT,
    "bankName" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "leadSource" TEXT,
    "referrerId" TEXT,
    "grade" "ClientGrade",
    "marketingTags" TEXT[],
    "receivableStatus" "ReceivableStatus" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "nameVi" TEXT NOT NULL,
    "nameEn" TEXT,
    "nameKo" TEXT,
    "unit" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "warehouseType" "WarehouseType" NOT NULL,
    "branchType" "BranchType",
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "projectCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "salesType" "SalesType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_contracts" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "installationAddress" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "deposit" DECIMAL(15,2),
    "installationFee" DECIMAL(15,2),
    "deliveryFee" DECIMAL(15,2),
    "additionalServiceFee" DECIMAL(15,2),
    "contractMgrName" TEXT,
    "contractMgrPhone" TEXT,
    "contractMgrOffice" TEXT,
    "contractMgrEmail" TEXT,
    "technicalMgrName" TEXT,
    "technicalMgrPhone" TEXT,
    "technicalMgrOffice" TEXT,
    "technicalMgrEmail" TEXT,
    "financeMgrName" TEXT,
    "financeMgrPhone" TEXT,
    "financeMgrOffice" TEXT,
    "financeMgrEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "it_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_monthly_billing" (
    "id" TEXT NOT NULL,
    "itContractId" TEXT NOT NULL,
    "billingMonth" TIMESTAMP(3) NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "counterBw" INTEGER,
    "counterColor" INTEGER,
    "billingMethod" "BillingMethod" NOT NULL,
    "photoUrl" TEXT,
    "customerSignature" TEXT,
    "yieldVerified" BOOLEAN NOT NULL DEFAULT false,
    "computedAmount" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "it_monthly_billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tm_rentals" (
    "id" TEXT NOT NULL,
    "rentalCode" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contractNumber" TEXT,
    "address" TEXT,
    "contractMgrName" TEXT,
    "contractMgrPhone" TEXT,
    "contractMgrEmail" TEXT,
    "technicalMgrName" TEXT,
    "technicalMgrPhone" TEXT,
    "technicalMgrEmail" TEXT,
    "financeMgrName" TEXT,
    "financeMgrPhone" TEXT,
    "financeMgrEmail" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tm_rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tm_rental_items" (
    "id" TEXT NOT NULL,
    "tmRentalId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "options" TEXT,
    "serialNumber" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "salesPrice" DECIMAL(15,2) NOT NULL,
    "supplierName" TEXT,
    "purchasePrice" DECIMAL(15,2),
    "commission" DECIMAL(15,2),
    "profit" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tm_rental_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_orders" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "itContractId" TEXT,
    "rentalType" "RentalType" NOT NULL,
    "billingMonth" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "editable" BOOLEAN NOT NULL DEFAULT true,
    "canceled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_stock" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "branchType" "BranchType" NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "serialNumbers" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "txnType" "InventoryTxnType" NOT NULL,
    "reason" "InventoryReason" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "scannedBarcode" TEXT,
    "note" TEXT,
    "performedById" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_depreciation" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "itemId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "acquisitionCost" DECIMAL(15,2) NOT NULL,
    "method" "DepreciationMethod" NOT NULL,
    "usefulLifeMonths" INTEGER NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "depreciationAmount" DECIMAL(15,2) NOT NULL,
    "bookValue" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_depreciation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibrations" (
    "id" TEXT NOT NULL,
    "calibrationCode" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contractMgrName" TEXT,
    "contractMgrPhone" TEXT,
    "contractMgrEmail" TEXT,
    "technicalMgrName" TEXT,
    "technicalMgrPhone" TEXT,
    "technicalMgrEmail" TEXT,
    "financeMgrName" TEXT,
    "financeMgrPhone" TEXT,
    "financeMgrEmail" TEXT,
    "performedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calibrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_devices" (
    "id" TEXT NOT NULL,
    "calibrationId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceNumber" TEXT,
    "serialNumber" TEXT,
    "standardAmount" DECIMAL(15,2),
    "actualAmount" DECIMAL(15,2),
    "certNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calibration_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_certs" (
    "id" TEXT NOT NULL,
    "calibrationId" TEXT NOT NULL,
    "certNumber" TEXT NOT NULL,
    "fileId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3),
    "alertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calibration_certs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "as_tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "itemId" TEXT,
    "serialNumber" TEXT,
    "status" "ASStatus" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "symptomVi" TEXT,
    "symptomEn" TEXT,
    "symptomKo" TEXT,
    "originalLang" "Language",
    "receivableBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "as_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "as_dispatches" (
    "id" TEXT NOT NULL,
    "asTicketId" TEXT NOT NULL,
    "dispatchEmployeeId" TEXT,
    "transportMethod" TEXT,
    "originAddress" TEXT,
    "destinationAddress" TEXT,
    "googleDistanceKm" DECIMAL(10,2),
    "meterPhotoUrl" TEXT,
    "meterOcrKm" DECIMAL(10,2),
    "distanceMatch" BOOLEAN,
    "transportCost" DECIMAL(15,2),
    "receiptFileId" TEXT,
    "departedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "as_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "salesNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "salesEmployeeId" TEXT,
    "usagePeriodStart" TIMESTAMP(3),
    "usagePeriodEnd" TIMESTAMP(3),
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_items" (
    "id" TEXT NOT NULL,
    "salesId" TEXT NOT NULL,
    "itemId" TEXT,
    "itemName" TEXT NOT NULL,
    "serialNumber" TEXT,
    "stockCheck" "StockCheckMode" NOT NULL DEFAULT 'LOOSE',
    "quantity" DECIMAL(15,3) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "projectId" TEXT,
    "salesEmployeeId" TEXT,
    "usagePeriodStart" TIMESTAMP(3),
    "usagePeriodEnd" TIMESTAMP(3),
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "warehouseInboundDone" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "itemId" TEXT,
    "itemName" TEXT NOT NULL,
    "serialNumber" TEXT,
    "stockCheck" "StockCheckMode" NOT NULL DEFAULT 'LOOSE',
    "quantity" DECIMAL(15,3) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "baseSalary" DECIMAL(15,2) NOT NULL,
    "allowances" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incentives" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incentives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_records" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "leaveCode" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" DECIMAL(5,2) NOT NULL,
    "reason" TEXT,
    "approverId" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "incidentCode" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "contentVi" TEXT,
    "contentEn" TEXT,
    "contentKo" TEXT,
    "originalLang" "Language",
    "evidenceFileId" TEXT,
    "visibilityManagerOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peer_reviews" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "biasDetected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peer_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "evaluationCode" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "scoreAsTat" DECIMAL(5,2),
    "scoreDispatchEff" DECIMAL(5,2),
    "scoreSalesContrib" DECIMAL(5,2),
    "scoreErpInputSpeed" DECIMAL(5,2),
    "scoreErpDeadline" DECIMAL(5,2),
    "scoreErpMastery" DECIMAL(5,2),
    "scoreAttendance" DECIMAL(5,2),
    "scorePeer" DECIMAL(5,2),
    "scoreIncident" DECIMAL(5,2),
    "reasonsJson" JSONB,
    "totalScore" DECIMAL(5,2) NOT NULL,
    "totalReason" TEXT,
    "grade" "EvaluationGrade" NOT NULL,
    "managerAdjustment" DECIMAL(5,2),
    "managerAdjustReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regular_evaluations" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "evaluationCode" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "answersJson" JSONB NOT NULL,
    "normalizedScore" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regular_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "expenseCode" TEXT NOT NULL,
    "expenseType" "ExpenseType" NOT NULL,
    "linkedSalesId" TEXT,
    "linkedPurchaseId" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "note" TEXT,
    "incurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_allocations" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "projectId" TEXT,
    "departmentId" TEXT,
    "basis" "AllocationBasis" NOT NULL,
    "weight" DECIMAL(10,4) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payables_receivables" (
    "id" TEXT NOT NULL,
    "kind" "PayableReceivableKind" NOT NULL,
    "salesId" TEXT,
    "purchaseId" TEXT,
    "expenseId" TEXT,
    "clientId" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "status" "PayableReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payables_receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delay_reasons" (
    "id" TEXT NOT NULL,
    "payableReceivableId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentVi" TEXT,
    "contentEn" TEXT,
    "contentKo" TEXT,
    "originalLang" "Language",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delay_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "email" TEXT,
    "employeeId" TEXT,
    "allowedCompanies" "CompanyCode"[],
    "role" "UserRole" NOT NULL,
    "preferredLang" "Language" NOT NULL DEFAULT 'KO',
    "chatDisplayMode" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode",
    "userId" TEXT,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode",
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "titleVi" TEXT,
    "titleEn" TEXT,
    "titleKo" TEXT,
    "bodyVi" TEXT,
    "bodyEn" TEXT,
    "bodyKo" TEXT,
    "linkUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT,
    "category" "FileCategory" NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "compressed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_campaigns" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode",
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "clientId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "contentJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode",
    "type" "ChatRoomType" NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_room_members" (
    "chatRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "chat_room_members_pkey" PRIMARY KEY ("chatRoomId","userId")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "chatRoomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "contentVi" TEXT,
    "contentEn" TEXT,
    "contentKo" TEXT,
    "originalLang" "Language" NOT NULL,
    "mentions" TEXT[],
    "attachmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_cards" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "onboardingCode" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "personalInfo" JSONB NOT NULL,
    "education" JSONB,
    "consentSignature" TEXT,
    "profilePhotoId" TEXT,
    "generatedPdfId" TEXT,
    "status" "OnboardingOffboardingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offboarding_cards" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "offboardingCode" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "returnedItems" JSONB,
    "paidItems" JSONB,
    "stoppedItems" JSONB,
    "issuedItems" JSONB,
    "hrSignature" TEXT,
    "accountingSignature" TEXT,
    "employeeSignature" TEXT,
    "generatedPdfId" TEXT,
    "status" "OnboardingOffboardingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offboarding_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "scheduleCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "repeatCron" TEXT,
    "alertBeforeHours" INTEGER,
    "relatedModule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_confirmations" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ScheduleConfirmStatus" NOT NULL,
    "note" TEXT,

    CONSTRAINT "schedule_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" TEXT NOT NULL,
    "companyCode" "CompanyCode" NOT NULL,
    "licenseCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerEmployeeId" TEXT,
    "acquiredAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "renewalCost" DECIMAL(15,2),
    "alertBeforeDays" INTEGER,
    "certificateFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ScheduleTargets" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ScheduleTargets_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ScheduleReporters" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ScheduleReporters_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AsTicketPhotos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AsTicketPhotos_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "departments_companyCode_idx" ON "departments"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "departments_companyCode_code_key" ON "departments"("companyCode", "code");

-- CreateIndex
CREATE INDEX "employees_companyCode_idx" ON "employees"("companyCode");

-- CreateIndex
CREATE INDEX "employees_departmentId_idx" ON "employees"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_companyCode_employeeCode_key" ON "employees"("companyCode", "employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "clients_clientCode_key" ON "clients"("clientCode");

-- CreateIndex
CREATE INDEX "client_contacts_clientId_idx" ON "client_contacts"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "items_itemCode_key" ON "items"("itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "projects_companyCode_idx" ON "projects"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "projects_companyCode_projectCode_key" ON "projects"("companyCode", "projectCode");

-- CreateIndex
CREATE UNIQUE INDEX "it_contracts_contractNumber_key" ON "it_contracts"("contractNumber");

-- CreateIndex
CREATE INDEX "it_contracts_clientId_idx" ON "it_contracts"("clientId");

-- CreateIndex
CREATE INDEX "it_contracts_status_idx" ON "it_contracts"("status");

-- CreateIndex
CREATE INDEX "it_monthly_billing_itContractId_idx" ON "it_monthly_billing"("itContractId");

-- CreateIndex
CREATE INDEX "it_monthly_billing_billingMonth_idx" ON "it_monthly_billing"("billingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "it_monthly_billing_itContractId_serialNumber_billingMonth_key" ON "it_monthly_billing"("itContractId", "serialNumber", "billingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "tm_rentals_rentalCode_key" ON "tm_rentals"("rentalCode");

-- CreateIndex
CREATE INDEX "tm_rentals_clientId_idx" ON "tm_rentals"("clientId");

-- CreateIndex
CREATE INDEX "tm_rental_items_tmRentalId_idx" ON "tm_rental_items"("tmRentalId");

-- CreateIndex
CREATE INDEX "tm_rental_items_serialNumber_idx" ON "tm_rental_items"("serialNumber");

-- CreateIndex
CREATE INDEX "rental_orders_companyCode_billingMonth_idx" ON "rental_orders"("companyCode", "billingMonth");

-- CreateIndex
CREATE INDEX "rental_orders_itContractId_idx" ON "rental_orders"("itContractId");

-- CreateIndex
CREATE INDEX "inventory_stock_companyCode_branchType_idx" ON "inventory_stock"("companyCode", "branchType");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_stock_companyCode_itemId_warehouseId_month_key" ON "inventory_stock"("companyCode", "itemId", "warehouseId", "month");

-- CreateIndex
CREATE INDEX "inventory_transactions_companyCode_performedAt_idx" ON "inventory_transactions"("companyCode", "performedAt");

-- CreateIndex
CREATE INDEX "inventory_transactions_serialNumber_idx" ON "inventory_transactions"("serialNumber");

-- CreateIndex
CREATE INDEX "asset_depreciation_companyCode_idx" ON "asset_depreciation"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "asset_depreciation_companyCode_serialNumber_month_key" ON "asset_depreciation"("companyCode", "serialNumber", "month");

-- CreateIndex
CREATE UNIQUE INDEX "calibrations_calibrationCode_key" ON "calibrations"("calibrationCode");

-- CreateIndex
CREATE INDEX "calibrations_clientId_idx" ON "calibrations"("clientId");

-- CreateIndex
CREATE INDEX "calibration_devices_calibrationId_idx" ON "calibration_devices"("calibrationId");

-- CreateIndex
CREATE UNIQUE INDEX "calibration_certs_certNumber_key" ON "calibration_certs"("certNumber");

-- CreateIndex
CREATE INDEX "calibration_certs_calibrationId_idx" ON "calibration_certs"("calibrationId");

-- CreateIndex
CREATE INDEX "calibration_certs_nextDueAt_idx" ON "calibration_certs"("nextDueAt");

-- CreateIndex
CREATE UNIQUE INDEX "as_tickets_ticketNumber_key" ON "as_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "as_tickets_clientId_idx" ON "as_tickets"("clientId");

-- CreateIndex
CREATE INDEX "as_tickets_status_idx" ON "as_tickets"("status");

-- CreateIndex
CREATE INDEX "as_tickets_serialNumber_idx" ON "as_tickets"("serialNumber");

-- CreateIndex
CREATE INDEX "as_dispatches_asTicketId_idx" ON "as_dispatches"("asTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_salesNumber_key" ON "sales"("salesNumber");

-- CreateIndex
CREATE INDEX "sales_clientId_idx" ON "sales"("clientId");

-- CreateIndex
CREATE INDEX "sales_projectId_idx" ON "sales"("projectId");

-- CreateIndex
CREATE INDEX "sales_items_salesId_idx" ON "sales_items"("salesId");

-- CreateIndex
CREATE INDEX "sales_items_serialNumber_idx" ON "sales_items"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_purchaseNumber_key" ON "purchases"("purchaseNumber");

-- CreateIndex
CREATE INDEX "purchases_supplierId_idx" ON "purchases"("supplierId");

-- CreateIndex
CREATE INDEX "purchases_projectId_idx" ON "purchases"("projectId");

-- CreateIndex
CREATE INDEX "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");

-- CreateIndex
CREATE INDEX "purchase_items_serialNumber_idx" ON "purchase_items"("serialNumber");

-- CreateIndex
CREATE INDEX "payroll_companyCode_month_idx" ON "payroll"("companyCode", "month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_employeeId_month_key" ON "payroll"("employeeId", "month");

-- CreateIndex
CREATE INDEX "incentives_companyCode_month_idx" ON "incentives"("companyCode", "month");

-- CreateIndex
CREATE INDEX "incentives_employeeId_idx" ON "incentives"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "leave_records_leaveCode_key" ON "leave_records"("leaveCode");

-- CreateIndex
CREATE INDEX "leave_records_companyCode_employeeId_idx" ON "leave_records"("companyCode", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_incidentCode_key" ON "incidents"("incidentCode");

-- CreateIndex
CREATE INDEX "incidents_companyCode_subjectId_idx" ON "incidents"("companyCode", "subjectId");

-- CreateIndex
CREATE INDEX "incidents_authorId_idx" ON "incidents"("authorId");

-- CreateIndex
CREATE INDEX "peer_reviews_companyCode_subjectId_period_idx" ON "peer_reviews"("companyCode", "subjectId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_evaluationCode_key" ON "evaluations"("evaluationCode");

-- CreateIndex
CREATE INDEX "evaluations_companyCode_subjectId_period_idx" ON "evaluations"("companyCode", "subjectId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "regular_evaluations_evaluationCode_key" ON "regular_evaluations"("evaluationCode");

-- CreateIndex
CREATE INDEX "regular_evaluations_companyCode_subjectId_idx" ON "regular_evaluations"("companyCode", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_expenseCode_key" ON "expenses"("expenseCode");

-- CreateIndex
CREATE INDEX "expenses_expenseType_idx" ON "expenses"("expenseType");

-- CreateIndex
CREATE INDEX "expense_allocations_expenseId_idx" ON "expense_allocations"("expenseId");

-- CreateIndex
CREATE INDEX "payables_receivables_kind_status_idx" ON "payables_receivables"("kind", "status");

-- CreateIndex
CREATE INDEX "payables_receivables_dueDate_idx" ON "payables_receivables"("dueDate");

-- CreateIndex
CREATE INDEX "delay_reasons_payableReceivableId_idx" ON "delay_reasons"("payableReceivableId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

-- CreateIndex
CREATE INDEX "audit_log_tableName_recordId_idx" ON "audit_log"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "audit_log_companyCode_occurredAt_idx" ON "audit_log"("companyCode", "occurredAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "chat_messages_chatRoomId_createdAt_idx" ON "chat_messages"("chatRoomId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_cards_onboardingCode_key" ON "onboarding_cards"("onboardingCode");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_cards_employeeId_key" ON "onboarding_cards"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "offboarding_cards_offboardingCode_key" ON "offboarding_cards"("offboardingCode");

-- CreateIndex
CREATE UNIQUE INDEX "offboarding_cards_employeeId_key" ON "offboarding_cards"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_scheduleCode_key" ON "schedules"("scheduleCode");

-- CreateIndex
CREATE INDEX "schedules_companyCode_dueAt_idx" ON "schedules"("companyCode", "dueAt");

-- CreateIndex
CREATE INDEX "schedule_confirmations_scheduleId_idx" ON "schedule_confirmations"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_licenseCode_key" ON "licenses"("licenseCode");

-- CreateIndex
CREATE INDEX "licenses_companyCode_expiresAt_idx" ON "licenses"("companyCode", "expiresAt");

-- CreateIndex
CREATE INDEX "_ScheduleTargets_B_index" ON "_ScheduleTargets"("B");

-- CreateIndex
CREATE INDEX "_ScheduleReporters_B_index" ON "_ScheduleReporters"("B");

-- CreateIndex
CREATE INDEX "_AsTicketPhotos_B_index" ON "_AsTicketPhotos"("B");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_contracts" ADD CONSTRAINT "it_contracts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_monthly_billing" ADD CONSTRAINT "it_monthly_billing_itContractId_fkey" FOREIGN KEY ("itContractId") REFERENCES "it_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_rentals" ADD CONSTRAINT "tm_rentals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_rental_items" ADD CONSTRAINT "tm_rental_items_tmRentalId_fkey" FOREIGN KEY ("tmRentalId") REFERENCES "tm_rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_itContractId_fkey" FOREIGN KEY ("itContractId") REFERENCES "it_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_depreciation" ADD CONSTRAINT "asset_depreciation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibrations" ADD CONSTRAINT "calibrations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_devices" ADD CONSTRAINT "calibration_devices_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES "calibrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_certs" ADD CONSTRAINT "calibration_certs_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES "calibrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_certs" ADD CONSTRAINT "calibration_certs_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "as_tickets" ADD CONSTRAINT "as_tickets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "as_tickets" ADD CONSTRAINT "as_tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "as_dispatches" ADD CONSTRAINT "as_dispatches_asTicketId_fkey" FOREIGN KEY ("asTicketId") REFERENCES "as_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "as_dispatches" ADD CONSTRAINT "as_dispatches_dispatchEmployeeId_fkey" FOREIGN KEY ("dispatchEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "as_dispatches" ADD CONSTRAINT "as_dispatches_receiptFileId_fkey" FOREIGN KEY ("receiptFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incentives" ADD CONSTRAINT "incentives_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_evidenceFileId_fkey" FOREIGN KEY ("evidenceFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_reviews" ADD CONSTRAINT "peer_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_reviews" ADD CONSTRAINT "peer_reviews_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regular_evaluations" ADD CONSTRAINT "regular_evaluations_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regular_evaluations" ADD CONSTRAINT "regular_evaluations_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_allocations" ADD CONSTRAINT "expense_allocations_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables_receivables" ADD CONSTRAINT "payables_receivables_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables_receivables" ADD CONSTRAINT "payables_receivables_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables_receivables" ADD CONSTRAINT "payables_receivables_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delay_reasons" ADD CONSTRAINT "delay_reasons_payableReceivableId_fkey" FOREIGN KEY ("payableReceivableId") REFERENCES "payables_receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_members" ADD CONSTRAINT "chat_room_members_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_members" ADD CONSTRAINT "chat_room_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_cards" ADD CONSTRAINT "onboarding_cards_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offboarding_cards" ADD CONSTRAINT "offboarding_cards_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_confirmations" ADD CONSTRAINT "schedule_confirmations_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_confirmations" ADD CONSTRAINT "schedule_confirmations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_ownerEmployeeId_fkey" FOREIGN KEY ("ownerEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScheduleTargets" ADD CONSTRAINT "_ScheduleTargets_A_fkey" FOREIGN KEY ("A") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScheduleTargets" ADD CONSTRAINT "_ScheduleTargets_B_fkey" FOREIGN KEY ("B") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScheduleReporters" ADD CONSTRAINT "_ScheduleReporters_A_fkey" FOREIGN KEY ("A") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScheduleReporters" ADD CONSTRAINT "_ScheduleReporters_B_fkey" FOREIGN KEY ("B") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsTicketPhotos" ADD CONSTRAINT "_AsTicketPhotos_A_fkey" FOREIGN KEY ("A") REFERENCES "as_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AsTicketPhotos" ADD CONSTRAINT "_AsTicketPhotos_B_fkey" FOREIGN KEY ("B") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
