-- DropIndex
DROP INDEX "CompetencyLevelChange_competencyId_createdAt_idx";

-- CreateIndex
CREATE INDEX "CompetencyLevelChange_targetUserId_competencyId_createdAt_idx" ON "CompetencyLevelChange"("targetUserId", "competencyId", "createdAt");

-- CreateIndex
CREATE INDEX "CompetencyLevelChange_competencyId_targetUserId_createdAt_idx" ON "CompetencyLevelChange"("competencyId", "targetUserId", "createdAt");
