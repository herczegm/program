-- CreateEnum
CREATE TYPE "CompetencyType" AS ENUM ('CORE', 'CUSTOM');

-- CreateTable
CREATE TABLE "Competency" (
    "id" TEXT NOT NULL,
    "name" CITEXT NOT NULL,
    "type" "CompetencyType" NOT NULL DEFAULT 'CUSTOM',
    "groupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Competency_groupId_sortOrder_idx" ON "Competency"("groupId", "sortOrder");

-- CreateIndex
CREATE INDEX "Competency_type_idx" ON "Competency"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Competency_name_key" ON "Competency"("name");

-- AddForeignKey
ALTER TABLE "Competency" ADD CONSTRAINT "Competency_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CompetencyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
