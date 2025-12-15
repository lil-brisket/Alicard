/*
  Warnings:

  - The `tags` column on the `Skill` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `name` to the `QuestTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ItemTemplate" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "damage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "MapZone" ADD COLUMN     "coinsReward" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "damageModifier" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "MonsterTemplate" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "damage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "goldReward" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "QuestTemplate" ADD COLUMN     "coinsReward" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "damageValue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Skill" DROP COLUMN "tags",
ADD COLUMN     "tags" JSONB;

-- CreateIndex
CREATE INDEX "ItemTemplate_status_idx" ON "ItemTemplate"("status");

-- CreateIndex
CREATE INDEX "ItemTemplate_createdBy_idx" ON "ItemTemplate"("createdBy");

-- CreateIndex
CREATE INDEX "MapZone_status_idx" ON "MapZone"("status");

-- CreateIndex
CREATE INDEX "MapZone_createdBy_idx" ON "MapZone"("createdBy");

-- CreateIndex
CREATE INDEX "MonsterTemplate_status_idx" ON "MonsterTemplate"("status");

-- CreateIndex
CREATE INDEX "MonsterTemplate_createdBy_idx" ON "MonsterTemplate"("createdBy");

-- CreateIndex
CREATE INDEX "QuestTemplate_status_idx" ON "QuestTemplate"("status");

-- CreateIndex
CREATE INDEX "QuestTemplate_createdBy_idx" ON "QuestTemplate"("createdBy");
