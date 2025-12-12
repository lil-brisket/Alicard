/*
  Warnings:

  - A unique constraint covering the columns `[playerId,itemId]` on the table `InventoryItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[key]` on the table `Item` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "key" TEXT;

-- CreateIndex
CREATE INDEX "CraftAttempt_playerId_createdAt_idx" ON "CraftAttempt"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "CraftAttempt_recipeId_createdAt_idx" ON "CraftAttempt"("recipeId", "createdAt");

-- CreateIndex
CREATE INDEX "GatherAttempt_playerId_createdAt_idx" ON "GatherAttempt"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "GatherAttempt_nodeId_createdAt_idx" ON "GatherAttempt"("nodeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_playerId_itemId_key" ON "InventoryItem"("playerId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_key_key" ON "Item"("key");
