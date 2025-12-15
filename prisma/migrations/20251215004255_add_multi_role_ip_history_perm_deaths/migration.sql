/*
  Warnings:

  - You are about to drop the column `deathCount` on the `DeathLog` table. All the data in the column will be lost.
  - Made the column `cause` on table `DeathLog` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'MODERATOR', 'ADMIN', 'CONTENT');

-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "lastInterestApplied" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "permDeaths" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "DeathLog" DROP COLUMN "deathCount",
ADD COLUMN     "location" TEXT,
ALTER COLUMN "cause" SET NOT NULL;

-- AlterTable
ALTER TABLE "PlayerStats" ADD COLUMN     "dexterityBase" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "dexterityTrain" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "speedBase" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "speedTrain" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "strengthBase" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "strengthTrain" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vitalityBase" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "vitalityTrain" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "bannedUntil" TIMESTAMP(3),
ADD COLUMN     "credit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedDates" JSONB,
ADD COLUMN     "isBanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isMuted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "muteReason" TEXT,
ADD COLUMN     "mutedUntil" TIMESTAMP(3),
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'PLAYER';

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "zone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetCharacterId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rarity" "ItemRarity" NOT NULL DEFAULT 'COMMON',
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "maxStack" INTEGER NOT NULL DEFAULT 1,
    "value" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "hp" INTEGER NOT NULL,
    "sp" INTEGER NOT NULL DEFAULT 0,
    "statsJSON" JSONB NOT NULL,
    "lootTableId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonsterTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stepsJSON" JSONB NOT NULL,
    "rewardsJSON" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "tilesJSON" JSONB NOT NULL,
    "poisJSON" JSONB,
    "spawnJSON" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserIpHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserIpHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Position_characterId_key" ON "Position"("characterId");

-- CreateIndex
CREATE INDEX "Position_x_y_idx" ON "Position"("x", "y");

-- CreateIndex
CREATE INDEX "Position_zone_idx" ON "Position"("zone");

-- CreateIndex
CREATE INDEX "AdminActionLog_targetUserId_createdAt_idx" ON "AdminActionLog"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_targetCharacterId_createdAt_idx" ON "AdminActionLog"("targetCharacterId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_actorId_createdAt_idx" ON "AdminActionLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemTemplate_isArchived_idx" ON "ItemTemplate"("isArchived");

-- CreateIndex
CREATE INDEX "ItemTemplate_rarity_idx" ON "ItemTemplate"("rarity");

-- CreateIndex
CREATE INDEX "MonsterTemplate_isArchived_idx" ON "MonsterTemplate"("isArchived");

-- CreateIndex
CREATE INDEX "MonsterTemplate_level_idx" ON "MonsterTemplate"("level");

-- CreateIndex
CREATE INDEX "QuestTemplate_isArchived_idx" ON "QuestTemplate"("isArchived");

-- CreateIndex
CREATE INDEX "MapZone_isArchived_idx" ON "MapZone"("isArchived");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_userId_idx" ON "UserRoleAssignment"("userId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_role_idx" ON "UserRoleAssignment"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleAssignment_userId_role_key" ON "UserRoleAssignment"("userId", "role");

-- CreateIndex
CREATE INDEX "UserIpHistory_userId_createdAt_idx" ON "UserIpHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserIpHistory_ipAddress_idx" ON "UserIpHistory"("ipAddress");

-- CreateIndex
CREATE INDEX "DeathLog_createdAt_idx" ON "DeathLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserIpHistory" ADD CONSTRAINT "UserIpHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
