-- Rename cooldownSeconds to cooldownTurns in Skill table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Skill') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Skill' AND column_name='cooldownSeconds') THEN
            ALTER TABLE "Skill" RENAME COLUMN "cooldownSeconds" TO "cooldownTurns";
        END IF;
    END IF;
END $$;

-- Rename jobUnlock to levelUnlock and change type from TEXT to INTEGER in Skill table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Skill') THEN
        -- First check if jobUnlock column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Skill' AND column_name='jobUnlock') THEN
            -- Drop the old column
            ALTER TABLE "Skill" DROP COLUMN IF EXISTS "jobUnlock";
        END IF;
        -- Add the new levelUnlock column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Skill' AND column_name='levelUnlock') THEN
            ALTER TABLE "Skill" ADD COLUMN "levelUnlock" INTEGER;
        END IF;
    END IF;
END $$;
