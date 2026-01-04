-- CreateEnum
CREATE TYPE "CraftingStation" AS ENUM ('SMELTER', 'ANVIL', 'FORGE', 'TEMPERING_RACK');

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "allowNonGatherableInputs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "craftTimeSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "station" "CraftingStation",
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Recipe_station_idx" ON "Recipe"("station");

-- CreateIndex
CREATE INDEX "Recipe_isActive_idx" ON "Recipe"("isActive");
