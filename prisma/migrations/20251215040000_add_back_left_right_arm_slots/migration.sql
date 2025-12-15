-- Add back LEFT_ARM and RIGHT_ARM slots to Equipment
-- Both slots will accept items with equipmentSlot: ARMS

-- Step 1: Add the new columns
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "leftArmItemId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "rightArmItemId" TEXT;

-- Step 2: Migrate data from armsItemId to both slots (if armsItemId exists)
-- Copy the same item to both slots so players don't lose their equipped item
UPDATE "Equipment" 
SET "leftArmItemId" = "armsItemId",
    "rightArmItemId" = "armsItemId"
WHERE "armsItemId" IS NOT NULL
  AND ("leftArmItemId" IS NULL OR "rightArmItemId" IS NULL);

-- Step 3: Drop the old foreign key constraint for armsItemId
ALTER TABLE "Equipment" DROP CONSTRAINT IF EXISTS "Equipment_armsItemId_fkey";

-- Step 4: Drop the old armsItemId column
ALTER TABLE "Equipment" DROP COLUMN IF EXISTS "armsItemId";

-- Step 5: Add foreign key constraints for the new columns
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_leftArmItemId_fkey" 
  FOREIGN KEY ("leftArmItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_rightArmItemId_fkey" 
  FOREIGN KEY ("rightArmItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
