-- CreateTable
CREATE TABLE "BranchCategoryVisibility" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "resourceCategoryId" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchCategoryVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BranchCategoryVisibility_branchId_resourceCategoryId_key" ON "BranchCategoryVisibility"("branchId", "resourceCategoryId");

-- CreateIndex
CREATE INDEX "BranchCategoryVisibility_companyId_idx" ON "BranchCategoryVisibility"("companyId");

-- CreateIndex
CREATE INDEX "BranchCategoryVisibility_companyId_branchId_idx" ON "BranchCategoryVisibility"("companyId", "branchId");

-- AddForeignKey
ALTER TABLE "BranchCategoryVisibility" ADD CONSTRAINT "BranchCategoryVisibility_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchCategoryVisibility" ADD CONSTRAINT "BranchCategoryVisibility_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchCategoryVisibility" ADD CONSTRAINT "BranchCategoryVisibility_resourceCategoryId_fkey" FOREIGN KEY ("resourceCategoryId") REFERENCES "ResourceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
