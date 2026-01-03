-- CreateEnum
CREATE TYPE "TileOverlay" AS ENUM ('NONE', 'SAFEZONE', 'DANGER', 'TOWN', 'DUNGEON', 'RESOURCE_RICH');

-- CreateEnum
CREATE TYPE "POIType" AS ENUM ('NPC', 'SHOP', 'BANK', 'GUILD_HALL', 'PORTAL', 'SHRINE', 'QUEST_BOARD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
-- Note: We cannot use the new enum values in the same transaction.
-- The MapVersionTile table will use 'PLAIN' as default, which can be
-- changed to 'GROUND' in a follow-up migration if needed.

ALTER TYPE "TileType" ADD VALUE 'GROUND';
ALTER TYPE "TileType" ADD VALUE 'WALL';
ALTER TYPE "TileType" ADD VALUE 'DOOR';
ALTER TYPE "TileType" ADD VALUE 'PORTAL';
ALTER TYPE "TileType" ADD VALUE 'POI';

-- AlterTable
ALTER TABLE "EncounterDefinition" ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "ResourceNodeDefinition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceNodeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestTrigger" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "biome" TEXT,
    "recommendedMinLevel" INTEGER,
    "recommendedMaxLevel" INTEGER,
    "dangerRating" INTEGER NOT NULL DEFAULT 1,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapVersion" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "changeNotes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapVersionTile" (
    "id" TEXT NOT NULL,
    "mapVersionId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "tileType" "TileType" NOT NULL DEFAULT 'PLAIN',
    "overlay" "TileOverlay" NOT NULL DEFAULT 'NONE',
    "isWalkable" BOOLEAN NOT NULL DEFAULT true,
    "movementCost" INTEGER NOT NULL DEFAULT 1,
    "safeZone" BOOLEAN NOT NULL DEFAULT false,
    "fogDiscoverable" BOOLEAN NOT NULL DEFAULT true,
    "encounterDefinitionId" TEXT,
    "resourceNodeId" TEXT,
    "questTriggerId" TEXT,
    "notes" TEXT,
    "tagsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapVersionTile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapZoneVersion" (
    "id" TEXT NOT NULL,
    "mapVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "minX" INTEGER NOT NULL,
    "minY" INTEGER NOT NULL,
    "maxX" INTEGER NOT NULL,
    "maxY" INTEGER NOT NULL,
    "recommendedMinLevel" INTEGER,
    "recommendedMaxLevel" INTEGER,
    "dangerRating" INTEGER,
    "defaultEncounterDefinitionId" TEXT,
    "defaultResourceNodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapZoneVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapPOI" (
    "id" TEXT NOT NULL,
    "mapVersionId" TEXT NOT NULL,
    "type" "POIType" NOT NULL,
    "name" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "icon" TEXT,
    "destinationMapVersionId" TEXT,
    "destinationX" INTEGER,
    "destinationY" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapPOI_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceNodeDefinition_slug_key" ON "ResourceNodeDefinition"("slug");

-- CreateIndex
CREATE INDEX "ResourceNodeDefinition_slug_idx" ON "ResourceNodeDefinition"("slug");

-- CreateIndex
CREATE INDEX "ResourceNodeDefinition_status_idx" ON "ResourceNodeDefinition"("status");

-- CreateIndex
CREATE INDEX "ResourceNodeDefinition_isArchived_idx" ON "ResourceNodeDefinition"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "QuestTrigger_slug_key" ON "QuestTrigger"("slug");

-- CreateIndex
CREATE INDEX "QuestTrigger_slug_idx" ON "QuestTrigger"("slug");

-- CreateIndex
CREATE INDEX "QuestTrigger_status_idx" ON "QuestTrigger"("status");

-- CreateIndex
CREATE INDEX "QuestTrigger_isArchived_idx" ON "QuestTrigger"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "MapDefinition_slug_key" ON "MapDefinition"("slug");

-- CreateIndex
CREATE INDEX "MapDefinition_slug_idx" ON "MapDefinition"("slug");

-- CreateIndex
CREATE INDEX "MapDefinition_isArchived_idx" ON "MapDefinition"("isArchived");

-- CreateIndex
CREATE INDEX "MapVersion_mapId_idx" ON "MapVersion"("mapId");

-- CreateIndex
CREATE INDEX "MapVersion_status_idx" ON "MapVersion"("status");

-- CreateIndex
CREATE INDEX "MapVersion_mapId_status_idx" ON "MapVersion"("mapId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MapVersion_mapId_versionNumber_key" ON "MapVersion"("mapId", "versionNumber");

-- CreateIndex
CREATE INDEX "MapVersionTile_mapVersionId_idx" ON "MapVersionTile"("mapVersionId");

-- CreateIndex
CREATE INDEX "MapVersionTile_tileType_idx" ON "MapVersionTile"("tileType");

-- CreateIndex
CREATE INDEX "MapVersionTile_overlay_idx" ON "MapVersionTile"("overlay");

-- CreateIndex
CREATE UNIQUE INDEX "MapVersionTile_mapVersionId_x_y_key" ON "MapVersionTile"("mapVersionId", "x", "y");

-- CreateIndex
CREATE INDEX "MapZoneVersion_mapVersionId_idx" ON "MapZoneVersion"("mapVersionId");

-- CreateIndex
CREATE INDEX "MapZoneVersion_mapVersionId_slug_idx" ON "MapZoneVersion"("mapVersionId", "slug");

-- CreateIndex
CREATE INDEX "MapPOI_mapVersionId_idx" ON "MapPOI"("mapVersionId");

-- CreateIndex
CREATE INDEX "MapPOI_mapVersionId_x_y_idx" ON "MapPOI"("mapVersionId", "x", "y");

-- CreateIndex
CREATE INDEX "EncounterDefinition_status_idx" ON "EncounterDefinition"("status");

-- AddForeignKey
ALTER TABLE "MapVersion" ADD CONSTRAINT "MapVersion_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "MapDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapVersionTile" ADD CONSTRAINT "MapVersionTile_mapVersionId_fkey" FOREIGN KEY ("mapVersionId") REFERENCES "MapVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapVersionTile" ADD CONSTRAINT "MapVersionTile_encounterDefinitionId_fkey" FOREIGN KEY ("encounterDefinitionId") REFERENCES "EncounterDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapVersionTile" ADD CONSTRAINT "MapVersionTile_resourceNodeId_fkey" FOREIGN KEY ("resourceNodeId") REFERENCES "ResourceNodeDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapVersionTile" ADD CONSTRAINT "MapVersionTile_questTriggerId_fkey" FOREIGN KEY ("questTriggerId") REFERENCES "QuestTrigger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapZoneVersion" ADD CONSTRAINT "MapZoneVersion_mapVersionId_fkey" FOREIGN KEY ("mapVersionId") REFERENCES "MapVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPOI" ADD CONSTRAINT "MapPOI_mapVersionId_fkey" FOREIGN KEY ("mapVersionId") REFERENCES "MapVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPOI" ADD CONSTRAINT "MapPOI_destinationMapVersionId_fkey" FOREIGN KEY ("destinationMapVersionId") REFERENCES "MapVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
