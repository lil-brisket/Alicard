-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('GATHERING', 'PROCESSING', 'COMBAT', 'UTILITY');

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "defenseBonus" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ItemTemplate" ADD COLUMN     "statsJSON" JSONB;

-- CreateTable
CREATE TABLE "TrainingSkill" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tags" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "maxLevel" INTEGER NOT NULL DEFAULT 99,
    "xpCurveBase" DOUBLE PRECISION NOT NULL DEFAULT 1.15,
    "icon" TEXT,

    CONSTRAINT "TrainingSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillAction" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tags" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "skillId" TEXT NOT NULL,
    "requiredLevel" INTEGER NOT NULL DEFAULT 1,
    "actionTimeSeconds" INTEGER NOT NULL DEFAULT 3,
    "xpReward" INTEGER NOT NULL DEFAULT 10,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "staminaCost" INTEGER NOT NULL DEFAULT 0,
    "unlockConditionsJSON" JSONB,
    "bonusEffectsJSON" JSONB,

    CONSTRAINT "SkillAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillActionInput" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillActionInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillActionOutput" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillActionOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerTrainingSkill" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerTrainingSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerActiveAction" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextCompletionAt" TIMESTAMP(3) NOT NULL,
    "actionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerActiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillActionLog" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "xpGained" INTEGER NOT NULL DEFAULT 0,
    "itemsConsumedJSON" JSONB,
    "itemsGainedJSON" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingSkill_key_key" ON "TrainingSkill"("key");

-- CreateIndex
CREATE INDEX "TrainingSkill_key_idx" ON "TrainingSkill"("key");

-- CreateIndex
CREATE INDEX "TrainingSkill_status_idx" ON "TrainingSkill"("status");

-- CreateIndex
CREATE INDEX "TrainingSkill_category_idx" ON "TrainingSkill"("category");

-- CreateIndex
CREATE INDEX "TrainingSkill_createdBy_idx" ON "TrainingSkill"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "SkillAction_key_key" ON "SkillAction"("key");

-- CreateIndex
CREATE INDEX "SkillAction_skillId_idx" ON "SkillAction"("skillId");

-- CreateIndex
CREATE INDEX "SkillAction_requiredLevel_idx" ON "SkillAction"("requiredLevel");

-- CreateIndex
CREATE INDEX "SkillAction_status_idx" ON "SkillAction"("status");

-- CreateIndex
CREATE INDEX "SkillAction_key_idx" ON "SkillAction"("key");

-- CreateIndex
CREATE INDEX "SkillAction_createdBy_idx" ON "SkillAction"("createdBy");

-- CreateIndex
CREATE INDEX "SkillActionInput_actionId_idx" ON "SkillActionInput"("actionId");

-- CreateIndex
CREATE INDEX "SkillActionInput_itemId_idx" ON "SkillActionInput"("itemId");

-- CreateIndex
CREATE INDEX "SkillActionOutput_actionId_idx" ON "SkillActionOutput"("actionId");

-- CreateIndex
CREATE INDEX "SkillActionOutput_itemId_idx" ON "SkillActionOutput"("itemId");

-- CreateIndex
CREATE INDEX "PlayerTrainingSkill_playerId_idx" ON "PlayerTrainingSkill"("playerId");

-- CreateIndex
CREATE INDEX "PlayerTrainingSkill_skillId_idx" ON "PlayerTrainingSkill"("skillId");

-- CreateIndex
CREATE INDEX "PlayerTrainingSkill_playerId_level_idx" ON "PlayerTrainingSkill"("playerId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerTrainingSkill_playerId_skillId_key" ON "PlayerTrainingSkill"("playerId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerActiveAction_playerId_key" ON "PlayerActiveAction"("playerId");

-- CreateIndex
CREATE INDEX "PlayerActiveAction_playerId_idx" ON "PlayerActiveAction"("playerId");

-- CreateIndex
CREATE INDEX "PlayerActiveAction_actionId_idx" ON "PlayerActiveAction"("actionId");

-- CreateIndex
CREATE INDEX "PlayerActiveAction_nextCompletionAt_idx" ON "PlayerActiveAction"("nextCompletionAt");

-- CreateIndex
CREATE INDEX "SkillActionLog_playerId_createdAt_idx" ON "SkillActionLog"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "SkillActionLog_actionId_createdAt_idx" ON "SkillActionLog"("actionId", "createdAt");

-- CreateIndex
CREATE INDEX "SkillActionLog_skillId_createdAt_idx" ON "SkillActionLog"("skillId", "createdAt");

-- CreateIndex
CREATE INDEX "SkillActionLog_playerId_idx" ON "SkillActionLog"("playerId");

-- CreateIndex
CREATE INDEX "SkillActionLog_actionId_idx" ON "SkillActionLog"("actionId");

-- CreateIndex
CREATE INDEX "SkillActionLog_skillId_idx" ON "SkillActionLog"("skillId");

-- CreateIndex
CREATE INDEX "SkillActionLog_createdAt_idx" ON "SkillActionLog"("createdAt");

-- AddForeignKey
ALTER TABLE "SkillAction" ADD CONSTRAINT "SkillAction_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "TrainingSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillActionInput" ADD CONSTRAINT "SkillActionInput_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "SkillAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillActionInput" ADD CONSTRAINT "SkillActionInput_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillActionOutput" ADD CONSTRAINT "SkillActionOutput_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "SkillAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillActionOutput" ADD CONSTRAINT "SkillActionOutput_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTrainingSkill" ADD CONSTRAINT "PlayerTrainingSkill_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTrainingSkill" ADD CONSTRAINT "PlayerTrainingSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "TrainingSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerActiveAction" ADD CONSTRAINT "PlayerActiveAction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerActiveAction" ADD CONSTRAINT "PlayerActiveAction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "SkillAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillActionLog" ADD CONSTRAINT "SkillActionLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillActionLog" ADD CONSTRAINT "SkillActionLog_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "SkillAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
