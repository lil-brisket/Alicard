-- AlterTable
ALTER TABLE "TrainingSkill" ADD COLUMN     "jobId" TEXT;

-- CreateIndex
CREATE INDEX "TrainingSkill_jobId_idx" ON "TrainingSkill"("jobId");

-- AddForeignKey
ALTER TABLE "TrainingSkill" ADD CONSTRAINT "TrainingSkill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
