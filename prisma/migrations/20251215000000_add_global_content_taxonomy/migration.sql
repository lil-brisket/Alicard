-- CreateEnum (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable ItemTemplate (add columns only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ItemTemplate' AND column_name='tags') THEN
        ALTER TABLE "ItemTemplate" ADD COLUMN "tags" JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ItemTemplate' AND column_name='status') THEN
        ALTER TABLE "ItemTemplate" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ItemTemplate' AND column_name='version') THEN
        ALTER TABLE "ItemTemplate" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ItemTemplate' AND column_name='createdBy') THEN
        ALTER TABLE "ItemTemplate" ADD COLUMN "createdBy" TEXT;
    END IF;
END $$;

-- AlterTable MonsterTemplate
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MonsterTemplate' AND column_name='description') THEN
        ALTER TABLE "MonsterTemplate" ADD COLUMN "description" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MonsterTemplate' AND column_name='tags') THEN
        ALTER TABLE "MonsterTemplate" ADD COLUMN "tags" JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MonsterTemplate' AND column_name='status') THEN
        ALTER TABLE "MonsterTemplate" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MonsterTemplate' AND column_name='version') THEN
        ALTER TABLE "MonsterTemplate" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MonsterTemplate' AND column_name='createdBy') THEN
        ALTER TABLE "MonsterTemplate" ADD COLUMN "createdBy" TEXT;
    END IF;
END $$;

-- AlterTable QuestTemplate
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='QuestTemplate' AND column_name='name') THEN
        ALTER TABLE "QuestTemplate" ADD COLUMN "name" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='QuestTemplate' AND column_name='tags') THEN
        ALTER TABLE "QuestTemplate" ADD COLUMN "tags" JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='QuestTemplate' AND column_name='status') THEN
        ALTER TABLE "QuestTemplate" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='QuestTemplate' AND column_name='version') THEN
        ALTER TABLE "QuestTemplate" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='QuestTemplate' AND column_name='createdBy') THEN
        ALTER TABLE "QuestTemplate" ADD COLUMN "createdBy" TEXT;
    END IF;
END $$;

-- AlterTable MapZone
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MapZone' AND column_name='description') THEN
        ALTER TABLE "MapZone" ADD COLUMN "description" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MapZone' AND column_name='tags') THEN
        ALTER TABLE "MapZone" ADD COLUMN "tags" JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MapZone' AND column_name='status') THEN
        ALTER TABLE "MapZone" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MapZone' AND column_name='version') THEN
        ALTER TABLE "MapZone" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MapZone' AND column_name='createdBy') THEN
        ALTER TABLE "MapZone" ADD COLUMN "createdBy" TEXT;
    END IF;
END $$;

-- AlterTable Skill
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Skill' AND column_name='tags') THEN
        ALTER TABLE "Skill" ADD COLUMN "tags" JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Skill' AND column_name='status') THEN
        ALTER TABLE "Skill" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Skill' AND column_name='version') THEN
        ALTER TABLE "Skill" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Skill' AND column_name='createdBy') THEN
        ALTER TABLE "Skill" ADD COLUMN "createdBy" TEXT;
    END IF;
END $$;

-- AlterTable Recipe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Recipe' AND column_name='tags') THEN
        ALTER TABLE "Recipe" ADD COLUMN "tags" JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Recipe' AND column_name='status') THEN
        ALTER TABLE "Recipe" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Recipe' AND column_name='version') THEN
        ALTER TABLE "Recipe" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Recipe' AND column_name='createdBy') THEN
        ALTER TABLE "Recipe" ADD COLUMN "createdBy" TEXT;
    END IF;
END $$;

-- AlterTable GatheringNode
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='GatheringNode' AND column_name='tags') THEN
        ALTER TABLE "GatheringNode" ADD COLUMN "tags" JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='GatheringNode' AND column_name='status') THEN
        ALTER TABLE "GatheringNode" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='GatheringNode' AND column_name='version') THEN
        ALTER TABLE "GatheringNode" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='GatheringNode' AND column_name='createdBy') THEN
        ALTER TABLE "GatheringNode" ADD COLUMN "createdBy" TEXT;
    END IF;
END $$;

-- CreateIndex (only if they don't exist)
CREATE INDEX IF NOT EXISTS "ItemTemplate_status_idx" ON "ItemTemplate"("status");
CREATE INDEX IF NOT EXISTS "ItemTemplate_createdBy_idx" ON "ItemTemplate"("createdBy");
CREATE INDEX IF NOT EXISTS "MonsterTemplate_status_idx" ON "MonsterTemplate"("status");
CREATE INDEX IF NOT EXISTS "MonsterTemplate_createdBy_idx" ON "MonsterTemplate"("createdBy");
CREATE INDEX IF NOT EXISTS "QuestTemplate_status_idx" ON "QuestTemplate"("status");
CREATE INDEX IF NOT EXISTS "QuestTemplate_createdBy_idx" ON "QuestTemplate"("createdBy");
CREATE INDEX IF NOT EXISTS "MapZone_status_idx" ON "MapZone"("status");
CREATE INDEX IF NOT EXISTS "MapZone_createdBy_idx" ON "MapZone"("createdBy");
CREATE INDEX IF NOT EXISTS "Skill_status_idx" ON "Skill"("status");
CREATE INDEX IF NOT EXISTS "Skill_createdBy_idx" ON "Skill"("createdBy");
CREATE INDEX IF NOT EXISTS "Recipe_status_idx" ON "Recipe"("status");
CREATE INDEX IF NOT EXISTS "Recipe_createdBy_idx" ON "Recipe"("createdBy");
CREATE INDEX IF NOT EXISTS "GatheringNode_status_idx" ON "GatheringNode"("status");
CREATE INDEX IF NOT EXISTS "GatheringNode_createdBy_idx" ON "GatheringNode"("createdBy");
