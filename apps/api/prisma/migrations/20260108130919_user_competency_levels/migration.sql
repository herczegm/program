-- CreateTable
CREATE TABLE "UserCompetencyLevel" (
    "userId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCompetencyLevel_pkey" PRIMARY KEY ("userId","competencyId")
);

-- CreateIndex
CREATE INDEX "UserCompetencyLevel_competencyId_idx" ON "UserCompetencyLevel"("competencyId");

-- AddForeignKey
ALTER TABLE "UserCompetencyLevel" ADD CONSTRAINT "UserCompetencyLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompetencyLevel" ADD CONSTRAINT "UserCompetencyLevel_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
