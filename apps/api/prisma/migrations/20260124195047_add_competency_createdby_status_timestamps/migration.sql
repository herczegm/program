-- CreateEnum
CREATE TYPE "CompetencyStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Competency" ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "status" "CompetencyStatus" NOT NULL DEFAULT 'ACTIVE';

-- AddForeignKey
ALTER TABLE "Competency" ADD CONSTRAINT "Competency_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
