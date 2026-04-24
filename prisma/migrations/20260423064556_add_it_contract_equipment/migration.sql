-- CreateTable
CREATE TABLE "it_contract_equipment" (
    "id" TEXT NOT NULL,
    "itContractId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "modelName" TEXT,
    "manufacturer" TEXT,
    "installedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "monthlyBaseFee" DECIMAL(15,2),
    "bwIncludedPages" INTEGER,
    "bwOverageRate" DECIMAL(10,2),
    "colorIncludedPages" INTEGER,
    "colorOverageRate" DECIMAL(10,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "it_contract_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "it_contract_equipment_itContractId_idx" ON "it_contract_equipment"("itContractId");

-- CreateIndex
CREATE INDEX "it_contract_equipment_serialNumber_idx" ON "it_contract_equipment"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "it_contract_equipment_itContractId_serialNumber_key" ON "it_contract_equipment"("itContractId", "serialNumber");

-- AddForeignKey
ALTER TABLE "it_contract_equipment" ADD CONSTRAINT "it_contract_equipment_itContractId_fkey" FOREIGN KEY ("itContractId") REFERENCES "it_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
