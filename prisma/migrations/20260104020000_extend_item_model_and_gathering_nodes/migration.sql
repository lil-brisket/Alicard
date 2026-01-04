-- AlterEnum
ALTER TYPE "ItemType" ADD VALUE 'QUEST';
ALTER TYPE "ItemType" ADD VALUE 'CURRENCY';
ALTER TYPE "ItemType" ADD VALUE 'KEY';
ALTER TYPE "ItemType" ADD VALUE 'MISC';

-- AlterEnum
ALTER TYPE "EquipmentSlot" ADD VALUE 'OFFHAND';
ALTER TYPE "EquipmentSlot" ADD VALUE 'MAINHAND';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN "isTradeable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Item" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Item" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "itemType" SET DEFAULT 'MATERIAL';
ALTER TABLE "Item" ALTER COLUMN "maxStack" SET DEFAULT 999;

-- CreateIndex
CREATE INDEX "Item_isActive_idx" ON "Item"("isActive");

-- AlterTable
ALTER TABLE "GatheringNode" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "GatheringNode_isActive_idx" ON "GatheringNode"("isActive");

-- AlterTable
ALTER TABLE "NodeYield" ADD COLUMN "chance" DOUBLE PRECISION;

