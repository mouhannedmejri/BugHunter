-- AlterTable
ALTER TABLE "OrgInvite" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "OrgInvite_orgId_userId_idx" ON "OrgInvite"("orgId", "userId");

-- AddForeignKey
ALTER TABLE "OrgInvite" ADD CONSTRAINT "OrgInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
