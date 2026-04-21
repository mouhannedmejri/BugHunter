-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "verificationApprovedAt" TIMESTAMP(3),
ADD COLUMN     "verificationRejectedAt" TIMESTAMP(3),
ADD COLUMN     "verificationRejectedReason" TEXT,
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verificationSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingStep" TEXT NOT NULL DEFAULT 'COMPLETE';

-- CreateTable
CREATE TABLE "OrgVerification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "country" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "primaryUseCase" TEXT NOT NULL,
    "estimatedPrograms" INTEGER NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "documents" TEXT[],
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgVerification_orgId_key" ON "OrgVerification"("orgId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgVerification" ADD CONSTRAINT "OrgVerification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
