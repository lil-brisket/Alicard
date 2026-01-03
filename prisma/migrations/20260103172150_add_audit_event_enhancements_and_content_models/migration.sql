/*
  Warnings:

  - You are about to drop the column `type` on the `AuditEvent` table. All the data in the column will be lost.
  - Added the required column `action` to the `AuditEvent` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "AuditEvent_actorCharacterId_createdAt_idx";

-- DropIndex
DROP INDEX "AuditEvent_type_createdAt_idx";

-- AlterTable
ALTER TABLE "AuditEvent" DROP COLUMN "type",
ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "targetEntityId" TEXT,
ADD COLUMN     "targetEntityType" TEXT,
ADD COLUMN     "targetUserId" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateTable
CREATE TABLE "EnemyTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "maxHp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL DEFAULT 0,
    "defense" INTEGER NOT NULL DEFAULT 0,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "goldReward" INTEGER NOT NULL DEFAULT 0,
    "dropTableId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnemyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropTable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DropTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropTableEntry" (
    "id" TEXT NOT NULL,
    "dropTableId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "minQty" INTEGER NOT NULL DEFAULT 1,
    "maxQty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DropTableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncounterDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "zoneId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncounterDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncounterEnemy" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "enemyTemplateId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncounterEnemy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnemyTemplate_slug_key" ON "EnemyTemplate"("slug");

-- CreateIndex
CREATE INDEX "EnemyTemplate_slug_idx" ON "EnemyTemplate"("slug");

-- CreateIndex
CREATE INDEX "EnemyTemplate_isArchived_idx" ON "EnemyTemplate"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "DropTable_slug_key" ON "DropTable"("slug");

-- CreateIndex
CREATE INDEX "DropTable_slug_idx" ON "DropTable"("slug");

-- CreateIndex
CREATE INDEX "DropTable_isArchived_idx" ON "DropTable"("isArchived");

-- CreateIndex
CREATE INDEX "DropTableEntry_dropTableId_idx" ON "DropTableEntry"("dropTableId");

-- CreateIndex
CREATE INDEX "DropTableEntry_itemId_idx" ON "DropTableEntry"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "EncounterDefinition_slug_key" ON "EncounterDefinition"("slug");

-- CreateIndex
CREATE INDEX "EncounterDefinition_slug_idx" ON "EncounterDefinition"("slug");

-- CreateIndex
CREATE INDEX "EncounterDefinition_isArchived_idx" ON "EncounterDefinition"("isArchived");

-- CreateIndex
CREATE INDEX "EncounterEnemy_encounterId_idx" ON "EncounterEnemy"("encounterId");

-- CreateIndex
CREATE INDEX "EncounterEnemy_enemyTemplateId_idx" ON "EncounterEnemy"("enemyTemplateId");

-- CreateIndex
CREATE INDEX "AuditEvent_targetUserId_createdAt_idx" ON "AuditEvent"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_targetEntityType_targetEntityId_idx" ON "AuditEvent"("targetEntityType", "targetEntityId");

-- AddForeignKey
ALTER TABLE "EnemyTemplate" ADD CONSTRAINT "EnemyTemplate_dropTableId_fkey" FOREIGN KEY ("dropTableId") REFERENCES "DropTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropTableEntry" ADD CONSTRAINT "DropTableEntry_dropTableId_fkey" FOREIGN KEY ("dropTableId") REFERENCES "DropTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropTableEntry" ADD CONSTRAINT "DropTableEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterEnemy" ADD CONSTRAINT "EncounterEnemy_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "EncounterDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterEnemy" ADD CONSTRAINT "EncounterEnemy_enemyTemplateId_fkey" FOREIGN KEY ("enemyTemplateId") REFERENCES "EnemyTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
