-- CreateTable
CREATE TABLE "CompetencyLevelChange" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "oldLevel" INTEGER NOT NULL,
    "newLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetencyLevelChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetencyLevelChange_targetUserId_createdAt_idx" ON "CompetencyLevelChange"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CompetencyLevelChange_actorUserId_createdAt_idx" ON "CompetencyLevelChange"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CompetencyLevelChange_competencyId_createdAt_idx" ON "CompetencyLevelChange"("competencyId", "createdAt");

-- AddForeignKey
ALTER TABLE "CompetencyLevelChange" ADD CONSTRAINT "CompetencyLevelChange_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyLevelChange" ADD CONSTRAINT "CompetencyLevelChange_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyLevelChange" ADD CONSTRAINT "CompetencyLevelChange_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
