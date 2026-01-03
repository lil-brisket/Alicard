-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('ATTACK', 'BUFF', 'HEAL', 'UTILITY', 'DEBUFF');

-- CreateEnum
CREATE TYPE "DamageType" AS ENUM ('PHYSICAL', 'MAGIC', 'TRUE');

-- CreateEnum
CREATE TYPE "SkillTargeting" AS ENUM ('SINGLE', 'MULTI', 'AOE');

-- CreateEnum
CREATE TYPE "StatType" AS ENUM ('VITALITY', 'STRENGTH', 'SPEED', 'DEXTERITY');

-- CreateEnum
CREATE TYPE "SkillEffectType" AS ENUM ('DAMAGE', 'HEAL', 'BUFF_STAT', 'DEBUFF_STAT', 'DOT', 'HOT', 'STUN', 'SILENCE', 'TAUNT', 'SHIELD', 'CLEANSE', 'DISPEL');

-- AlterTable: Add slug column as nullable first
ALTER TABLE "Skill" ADD COLUMN "slug" TEXT;

-- Backfill slug from name (lowercase, replace spaces/special chars with hyphens)
UPDATE "Skill" SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("name", '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE "slug" IS NULL;

-- If any slugs are still null or empty, use key as fallback
UPDATE "Skill" SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("key", '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE "slug" IS NULL OR "slug" = '';

-- Ensure unique slugs by appending numbers if needed
DO $$
DECLARE
    skill_record RECORD;
    base_slug TEXT;
    new_slug TEXT;
    counter INTEGER;
BEGIN
    FOR skill_record IN SELECT id, slug FROM "Skill" ORDER BY id LOOP
        base_slug := skill_record.slug;
        new_slug := base_slug;
        counter := 1;
        
        WHILE EXISTS (SELECT 1 FROM "Skill" WHERE slug = new_slug AND id != skill_record.id) LOOP
            new_slug := base_slug || '-' || counter;
            counter := counter + 1;
        END LOOP;
        
        IF new_slug != skill_record.slug THEN
            UPDATE "Skill" SET slug = new_slug WHERE id = skill_record.id;
        END IF;
    END LOOP;
END $$;

-- Now make slug NOT NULL and add unique constraint
ALTER TABLE "Skill" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- AlterTable: Add new combat fields to Skill
ALTER TABLE "Skill" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Skill" ADD COLUMN "castTimeTurns" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Skill" ADD COLUMN "skillType" "SkillType" NOT NULL DEFAULT 'ATTACK';
ALTER TABLE "Skill" ADD COLUMN "damageType" "DamageType";
ALTER TABLE "Skill" ADD COLUMN "hits" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Skill" ADD COLUMN "targeting" "SkillTargeting" NOT NULL DEFAULT 'SINGLE';
ALTER TABLE "Skill" ADD COLUMN "maxTargets" INTEGER;
ALTER TABLE "Skill" ADD COLUMN "basePower" INTEGER;
ALTER TABLE "Skill" ADD COLUMN "scalingStat" "StatType";
ALTER TABLE "Skill" ADD COLUMN "scalingRatio" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
ALTER TABLE "Skill" ADD COLUMN "flatBonus" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Skill_slug_idx" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "Skill_isArchived_idx" ON "Skill"("isArchived");

-- CreateIndex
CREATE INDEX "Skill_skillType_idx" ON "Skill"("skillType");

-- CreateTable: SkillEffect
CREATE TABLE "SkillEffect" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "type" "SkillEffectType" NOT NULL,
    "stat" "StatType",
    "value" INTEGER NOT NULL,
    "ratio" DOUBLE PRECISION,
    "durationTurns" INTEGER NOT NULL DEFAULT 0,
    "chance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "tickIntervalTurns" INTEGER NOT NULL DEFAULT 1,
    "maxStacks" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillEffect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkillEffect_skillId_ordering_idx" ON "SkillEffect"("skillId", "ordering");

-- CreateIndex
CREATE INDEX "SkillEffect_skillId_idx" ON "SkillEffect"("skillId");

-- AddForeignKey
ALTER TABLE "SkillEffect" ADD CONSTRAINT "SkillEffect_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

