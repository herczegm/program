CREATE EXTENSION IF NOT EXISTS citext;

-- CreateTable
CREATE TABLE "CompetencyGroup" (
    "id" TEXT NOT NULL,
    "name" CITEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetencyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetencyGroup_sortOrder_idx" ON "CompetencyGroup"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CompetencyGroup_name_key" ON "CompetencyGroup"("name");
