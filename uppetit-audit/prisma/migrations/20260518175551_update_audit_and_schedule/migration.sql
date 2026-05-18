-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "tuName" TEXT;

-- AlterTable
ALTER TABLE "VisitPlan" ADD COLUMN     "assignerId" TEXT;

-- AddForeignKey
ALTER TABLE "VisitPlan" ADD CONSTRAINT "VisitPlan_assignerId_fkey" FOREIGN KEY ("assignerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
