/*
  Warnings:

  - You are about to drop the column `coinsReward` on the `QuestTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `QuestTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `damageValue` on the `QuestTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `QuestTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `isArchived` on the `QuestTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `rewardsJSON` on the `QuestTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `stepsJSON` on the `QuestTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `QuestTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `QuestTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `QuestTemplate` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "QuestRepeatability" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'REPEATABLE');

-- CreateEnum
CREATE TYPE "QuestStepType" AS ENUM ('KILL_ENEMY', 'GATHER_ITEM', 'CRAFT_ITEM', 'VISIT_LOCATION', 'DELIVER_ITEM', 'TALK_TO_NPC', 'INTERACT_NODE');

-- CreateEnum
CREATE TYPE "QuestRewardType" AS ENUM ('XP_CHARACTER', 'XP_OCCUPATION', 'ITEM', 'GOLD', 'RECIPE_UNLOCK', 'SKILL_UNLOCK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentStatus" ADD VALUE 'PUBLISHED';
ALTER TYPE "ContentStatus" ADD VALUE 'ARCHIVED';

-- DropIndex
DROP INDEX "QuestTemplate_createdBy_idx";

-- DropIndex
DROP INDEX "QuestTemplate_isArchived_idx";

-- AlterTable
ALTER TABLE "QuestTemplate" DROP COLUMN "coinsReward",
DROP COLUMN "createdBy",
DROP COLUMN "damageValue",
DROP COLUMN "deletedAt",
DROP COLUMN "isArchived",
DROP COLUMN "rewardsJSON",
DROP COLUMN "stepsJSON",
DROP COLUMN "tags",
DROP COLUMN "title",
DROP COLUMN "version",
ADD COLUMN     "occupationType" TEXT,
ADD COLUMN     "prerequisiteQuestId" TEXT,
ADD COLUMN     "recommendedMinLevel" INTEGER,
ADD COLUMN     "repeatability" "QuestRepeatability" NOT NULL DEFAULT 'ONCE',
ADD COLUMN     "startTriggerRefId" TEXT,
ADD COLUMN     "startTriggerType" TEXT;

-- CreateTable
CREATE TABLE "QuestStep" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "type" "QuestStepType" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "targetRefType" TEXT,
    "targetRefId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "conditionsJson" JSONB,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuestStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestReward" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "type" "QuestRewardType" NOT NULL,
    "refId" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "probability" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "notes" TEXT,

    CONSTRAINT "QuestReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestStep_questId_idx" ON "QuestStep"("questId");

-- CreateIndex
CREATE INDEX "QuestStep_type_idx" ON "QuestStep"("type");

-- CreateIndex
CREATE UNIQUE INDEX "QuestStep_questId_ordering_key" ON "QuestStep"("questId", "ordering");

-- CreateIndex
CREATE INDEX "QuestReward_questId_idx" ON "QuestReward"("questId");

-- CreateIndex
CREATE INDEX "QuestReward_type_idx" ON "QuestReward"("type");

-- CreateIndex
CREATE INDEX "QuestTemplate_repeatability_idx" ON "QuestTemplate"("repeatability");

-- CreateIndex
CREATE INDEX "QuestTemplate_prerequisiteQuestId_idx" ON "QuestTemplate"("prerequisiteQuestId");

-- CreateIndex
CREATE INDEX "QuestTemplate_createdAt_idx" ON "QuestTemplate"("createdAt");

-- AddForeignKey
ALTER TABLE "QuestTemplate" ADD CONSTRAINT "QuestTemplate_prerequisiteQuestId_fkey" FOREIGN KEY ("prerequisiteQuestId") REFERENCES "QuestTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestStep" ADD CONSTRAINT "QuestStep_questId_fkey" FOREIGN KEY ("questId") REFERENCES "QuestTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestReward" ADD CONSTRAINT "QuestReward_questId_fkey" FOREIGN KEY ("questId") REFERENCES "QuestTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
