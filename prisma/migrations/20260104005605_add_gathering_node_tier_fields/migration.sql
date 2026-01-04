-- AlterTable
ALTER TABLE "GatheringNode" ADD COLUMN     "cooldownSeconds" INTEGER,
ADD COLUMN     "gatherTimeSeconds" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "requiredJobLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "tier" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "xpReward" INTEGER NOT NULL DEFAULT 10;

-- CreateIndex
CREATE INDEX "GatheringNode_tier_idx" ON "GatheringNode"("tier");

-- CreateIndex
CREATE INDEX "GatheringNode_requiredJobLevel_idx" ON "GatheringNode"("requiredJobLevel");
