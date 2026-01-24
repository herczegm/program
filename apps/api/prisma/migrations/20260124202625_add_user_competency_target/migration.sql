-- CreateTable
CREATE TABLE "UserCompetencyTarget" (
    "userId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "targetLevel" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCompetencyTarget_pkey" PRIMARY KEY ("userId","competencyId")
);

-- CreateIndex
CREATE INDEX "UserCompetencyTarget_competencyId_idx" ON "UserCompetencyTarget"("competencyId");

-- CreateIndex
CREATE INDEX "UserCompetencyTarget_userId_idx" ON "UserCompetencyTarget"("userId");

-- CreateIndex
CREATE INDEX "UserCompetencyTarget_deadline_idx" ON "UserCompetencyTarget"("deadline");

-- AddForeignKey
ALTER TABLE "UserCompetencyTarget" ADD CONSTRAINT "UserCompetencyTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompetencyTarget" ADD CONSTRAINT "UserCompetencyTarget_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
