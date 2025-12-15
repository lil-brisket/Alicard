-- AlterTable ItemTemplate: Add damage field (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ItemTemplate') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ItemTemplate' AND column_name='damage') THEN
            ALTER TABLE "ItemTemplate" ADD COLUMN "damage" INTEGER NOT NULL DEFAULT 0;
        END IF;
    END IF;
END $$;

-- AlterTable MonsterTemplate: Add damage and goldReward fields (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='MonsterTemplate') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MonsterTemplate' AND column_name='damage') THEN
            ALTER TABLE "MonsterTemplate" ADD COLUMN "damage" INTEGER NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MonsterTemplate' AND column_name='goldReward') THEN
            ALTER TABLE "MonsterTemplate" ADD COLUMN "goldReward" INTEGER NOT NULL DEFAULT 0;
        END IF;
    END IF;
END $$;

-- AlterTable QuestTemplate: Add coinsReward and damageValue fields (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='QuestTemplate') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='QuestTemplate' AND column_name='coinsReward') THEN
            ALTER TABLE "QuestTemplate" ADD COLUMN "coinsReward" INTEGER NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='QuestTemplate' AND column_name='damageValue') THEN
            ALTER TABLE "QuestTemplate" ADD COLUMN "damageValue" INTEGER NOT NULL DEFAULT 0;
        END IF;
    END IF;
END $$;

-- AlterTable MapZone: Add coinsReward and damageModifier fields (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='MapZone') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MapZone' AND column_name='coinsReward') THEN
            ALTER TABLE "MapZone" ADD COLUMN "coinsReward" INTEGER NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MapZone' AND column_name='damageModifier') THEN
            ALTER TABLE "MapZone" ADD COLUMN "damageModifier" INTEGER NOT NULL DEFAULT 0;
        END IF;
    END IF;
END $$;
