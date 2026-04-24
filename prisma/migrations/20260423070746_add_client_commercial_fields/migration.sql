-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('MANUFACTURING', 'LOGISTICS', 'EDUCATION', 'IT', 'OTHER');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "bankHolder" TEXT,
ADD COLUMN     "emailConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "industry" "Industry",
ADD COLUMN     "paymentTerms" INTEGER,
ADD COLUMN     "referrerEmployeeId" TEXT,
ADD COLUMN     "representative" TEXT,
ADD COLUMN     "salesPicId" TEXT;

-- CreateIndex
CREATE INDEX "clients_referrerEmployeeId_idx" ON "clients"("referrerEmployeeId");

-- CreateIndex
CREATE INDEX "clients_salesPicId_idx" ON "clients"("salesPicId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_referrerEmployeeId_fkey" FOREIGN KEY ("referrerEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_salesPicId_fkey" FOREIGN KEY ("salesPicId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
