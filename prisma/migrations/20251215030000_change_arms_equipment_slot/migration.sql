-- AlterEnum: Remove LEFT_ARM and RIGHT_ARM, add ARMS
-- Note: This is a breaking change. Existing data with LEFT_ARM or RIGHT_ARM will need manual migration.

-- Step 1: Add the new armsItemId column to Equipment table
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "armsItemId" TEXT;

-- Step 2: Migrate data from leftArmItemId and rightArmItemId to armsItemId
-- Prefer leftArmItemId if both exist, otherwise use whichever exists
UPDATE "Equipment" 
SET "armsItemId" = COALESCE("leftArmItemId", "rightArmItemId")
WHERE ("leftArmItemId" IS NOT NULL OR "rightArmItemId" IS NOT NULL)
  AND "armsItemId" IS NULL;

-- Step 3: Drop the old foreign key constraints (if they exist)
-- Note: Prisma may have named these differently, so we use IF EXISTS
ALTER TABLE "Equipment" DROP CONSTRAINT IF EXISTS "Equipment_leftArmItemId_fkey";
ALTER TABLE "Equipment" DROP CONSTRAINT IF EXISTS "Equipment_rightArmItemId_fkey";

-- Step 4: Drop the old columns
ALTER TABLE "Equipment" DROP COLUMN IF EXISTS "leftArmItemId";
ALTER TABLE "Equipment" DROP COLUMN IF EXISTS "rightArmItemId";

-- Step 5: Add foreign key constraint for armsItemId
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_armsItemId_fkey" 
  FOREIGN KEY ("armsItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 6: Create new enum with ARMS instead of LEFT_ARM and RIGHT_ARM
CREATE TYPE "EquipmentSlot_new" AS ENUM ('HEAD', 'ARMS', 'BODY', 'LEGS', 'FEET', 'RING', 'NECKLACE', 'BELT', 'CLOAK');

-- Step 7: Update ItemTemplate table
ALTER TABLE "ItemTemplate" ALTER COLUMN "equipmentSlot" TYPE "EquipmentSlot_new" USING (
  CASE 
    WHEN "equipmentSlot"::text = 'LEFT_ARM' OR "equipmentSlot"::text = 'RIGHT_ARM' THEN 'ARMS'::"EquipmentSlot_new"
    ELSE "equipmentSlot"::text::"EquipmentSlot_new"
  END
);

-- Step 8: Update Item table
ALTER TABLE "Item" ALTER COLUMN "equipmentSlot" TYPE "EquipmentSlot_new" USING (
  CASE 
    WHEN "equipmentSlot"::text = 'LEFT_ARM' OR "equipmentSlot"::text = 'RIGHT_ARM' THEN 'ARMS'::"EquipmentSlot_new"
    ELSE "equipmentSlot"::text::"EquipmentSlot_new"
  END
);

-- Step 9: Drop old enum and rename new one
DROP TYPE "EquipmentSlot";
ALTER TYPE "EquipmentSlot_new" RENAME TO "EquipmentSlot";
