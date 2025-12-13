-- CreateTable
CREATE TABLE "World" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "World_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "World_name_idx" ON "World"("name");

-- Create default world
INSERT INTO "World" ("id", "name", "width", "height", "createdAt", "updatedAt")
VALUES ('default-world', 'Alicard', 20, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add worldId to MapTile as nullable first
ALTER TABLE "MapTile" ADD COLUMN "worldId" TEXT;

-- Update existing MapTile rows to use default world
UPDATE "MapTile" SET "worldId" = 'default-world' WHERE "worldId" IS NULL;

-- Make worldId required on MapTile
ALTER TABLE "MapTile" ALTER COLUMN "worldId" SET NOT NULL;

-- Add meta JSON column to MapTile
ALTER TABLE "MapTile" ADD COLUMN "meta" JSONB;

-- Drop old unique constraint on MapTile
DROP INDEX IF EXISTS "MapTile_x_y_key";

-- Create new unique constraint with worldId
CREATE UNIQUE INDEX "MapTile_worldId_x_y_key" ON "MapTile"("worldId", "x", "y");

-- CreateIndex
CREATE INDEX "MapTile_worldId_x_y_idx" ON "MapTile"("worldId", "x", "y");

-- CreateIndex
CREATE INDEX "MapTile_worldId_idx" ON "MapTile"("worldId");

-- Add worldId to MapPosition as nullable first
ALTER TABLE "MapPosition" ADD COLUMN "worldId" TEXT;

-- Update existing MapPosition rows to use default world
UPDATE "MapPosition" SET "worldId" = 'default-world' WHERE "worldId" IS NULL;

-- Make worldId required on MapPosition
ALTER TABLE "MapPosition" ALTER COLUMN "worldId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "MapPosition_worldId_idx" ON "MapPosition"("worldId");

-- AddForeignKey
ALTER TABLE "MapTile" ADD CONSTRAINT "MapTile_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPosition" ADD CONSTRAINT "MapPosition_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add PLAIN and WATER to TileType enum
ALTER TYPE "TileType" ADD VALUE IF NOT EXISTS 'PLAIN';
ALTER TYPE "TileType" ADD VALUE IF NOT EXISTS 'WATER';
