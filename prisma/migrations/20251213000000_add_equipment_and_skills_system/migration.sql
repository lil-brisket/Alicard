-- AlterEnum
-- Remove old EquipmentSlot values and add new ones
ALTER TYPE "EquipmentSlot" RENAME TO "EquipmentSlot_old";
CREATE TYPE "EquipmentSlot" AS ENUM ('HEAD', 'LEFT_ARM', 'RIGHT_ARM', 'BODY', 'LEGS', 'FEET', 'RING', 'NECKLACE', 'BELT', 'CLOAK');
ALTER TABLE "Item" ALTER COLUMN "equipmentSlot" TYPE "EquipmentSlot" USING CASE
  WHEN "equipmentSlot"::text = 'HEAD' THEN 'HEAD'::"EquipmentSlot"
  WHEN "equipmentSlot"::text = 'LEGS' THEN 'LEGS'::"EquipmentSlot"
  WHEN "equipmentSlot"::text = 'FEET' THEN 'FEET'::"EquipmentSlot"
  WHEN "equipmentSlot"::text = 'CHEST' THEN 'BODY'::"EquipmentSlot"
  WHEN "equipmentSlot"::text = 'WEAPON' THEN 'LEFT_ARM'::"EquipmentSlot"
  WHEN "equipmentSlot"::text = 'ACCESSORY_1' THEN 'RING'::"EquipmentSlot"
  WHEN "equipmentSlot"::text = 'ACCESSORY_2' THEN 'RING'::"EquipmentSlot"
  ELSE NULL
END;
DROP TYPE "EquipmentSlot_old";

-- AlterEnum
-- Add EQUIPMENT to ItemType
ALTER TYPE "ItemType" ADD VALUE 'EQUIPMENT';

-- AlterTable Equipment: Drop old columns and add new ones
ALTER TABLE "Equipment" DROP CONSTRAINT IF EXISTS "Equipment_weaponId_fkey";
ALTER TABLE "Equipment" DROP CONSTRAINT IF EXISTS "Equipment_chestId_fkey";
ALTER TABLE "Equipment" DROP CONSTRAINT IF EXISTS "Equipment_accessory1Id_fkey";
ALTER TABLE "Equipment" DROP CONSTRAINT IF EXISTS "Equipment_accessory2Id_fkey";

-- Migrate data: weapon -> leftArm, chest -> body, accessory1 -> ring1, accessory2 -> ring2
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "headItemId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "leftArmItemId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "rightArmItemId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "bodyItemId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "legsItemId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "feetItemId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "ring1ItemId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "ring2ItemId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "ring3ItemId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "necklaceItemId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "beltItemId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "cloakItemId" TEXT;

-- Migrate existing data
UPDATE "Equipment" SET 
  "leftArmItemId" = "weaponId",
  "bodyItemId" = "chestId",
  "ring1ItemId" = "accessory1Id",
  "ring2ItemId" = "accessory2Id"
WHERE "weaponId" IS NOT NULL OR "chestId" IS NOT NULL OR "accessory1Id" IS NOT NULL OR "accessory2Id" IS NOT NULL;

-- Drop old columns
ALTER TABLE "Equipment" DROP COLUMN IF EXISTS "weaponId";
ALTER TABLE "Equipment" DROP COLUMN IF EXISTS "chestId";
ALTER TABLE "Equipment" DROP COLUMN IF EXISTS "accessory1Id";
ALTER TABLE "Equipment" DROP COLUMN IF EXISTS "accessory2Id";

-- Add foreign keys for new columns
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_headItemId_fkey" FOREIGN KEY ("headItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_leftArmItemId_fkey" FOREIGN KEY ("leftArmItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_rightArmItemId_fkey" FOREIGN KEY ("rightArmItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_bodyItemId_fkey" FOREIGN KEY ("bodyItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_legsItemId_fkey" FOREIGN KEY ("legsItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_feetItemId_fkey" FOREIGN KEY ("feetItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_ring1ItemId_fkey" FOREIGN KEY ("ring1ItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_ring2ItemId_fkey" FOREIGN KEY ("ring2ItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_ring3ItemId_fkey" FOREIGN KEY ("ring3ItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_necklaceItemId_fkey" FOREIGN KEY ("necklaceItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_beltItemId_fkey" FOREIGN KEY ("beltItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_cloakItemId_fkey" FOREIGN KEY ("cloakItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Note: Item reverse relations are handled by Prisma automatically, no manual constraints needed

-- Drop old PlayerSkill model and create new one
DROP TABLE IF EXISTS "PlayerSkill";
CREATE TABLE "PlayerSkill" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "learnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerSkill_pkey" PRIMARY KEY ("id")
);

-- Create Skill table
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "staminaCost" INTEGER NOT NULL DEFAULT 0,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "jobUnlock" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- Create PlayerSkillLoadout table
CREATE TABLE "PlayerSkillLoadout" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "slot1SkillId" TEXT,
    "slot2SkillId" TEXT,
    "slot3SkillId" TEXT,
    "slot4SkillId" TEXT,
    "slot5SkillId" TEXT,
    "slot6SkillId" TEXT,
    "slot7SkillId" TEXT,
    "slot8SkillId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerSkillLoadout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Skill_key_key" ON "Skill"("key");

-- CreateIndex
CREATE INDEX "Skill_key_idx" ON "Skill"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSkill_playerId_skillId_key" ON "PlayerSkill"("playerId", "skillId");

-- CreateIndex
CREATE INDEX "PlayerSkill_playerId_idx" ON "PlayerSkill"("playerId");

-- CreateIndex
CREATE INDEX "PlayerSkill_skillId_idx" ON "PlayerSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSkillLoadout_playerId_key" ON "PlayerSkillLoadout"("playerId");

-- CreateIndex
CREATE INDEX "PlayerSkillLoadout_playerId_idx" ON "PlayerSkillLoadout"("playerId");

-- AddForeignKey
ALTER TABLE "PlayerSkill" ADD CONSTRAINT "PlayerSkill_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkill" ADD CONSTRAINT "PlayerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkillLoadout" ADD CONSTRAINT "PlayerSkillLoadout_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkillLoadout" ADD CONSTRAINT "PlayerSkillLoadout_slot1SkillId_fkey" FOREIGN KEY ("slot1SkillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkillLoadout" ADD CONSTRAINT "PlayerSkillLoadout_slot2SkillId_fkey" FOREIGN KEY ("slot2SkillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkillLoadout" ADD CONSTRAINT "PlayerSkillLoadout_slot3SkillId_fkey" FOREIGN KEY ("slot3SkillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkillLoadout" ADD CONSTRAINT "PlayerSkillLoadout_slot4SkillId_fkey" FOREIGN KEY ("slot4SkillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkillLoadout" ADD CONSTRAINT "PlayerSkillLoadout_slot5SkillId_fkey" FOREIGN KEY ("slot5SkillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkillLoadout" ADD CONSTRAINT "PlayerSkillLoadout_slot6SkillId_fkey" FOREIGN KEY ("slot6SkillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkillLoadout" ADD CONSTRAINT "PlayerSkillLoadout_slot7SkillId_fkey" FOREIGN KEY ("slot7SkillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkillLoadout" ADD CONSTRAINT "PlayerSkillLoadout_slot8SkillId_fkey" FOREIGN KEY ("slot8SkillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
