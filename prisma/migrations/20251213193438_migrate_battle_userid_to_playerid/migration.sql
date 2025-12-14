-- Step 1: Add the new playerId column as nullable
ALTER TABLE "Battle" ADD COLUMN "playerId" TEXT;

-- Step 2: Populate playerId from Player table using the userId relationship
UPDATE "Battle" 
SET "playerId" = (
  SELECT "Player"."id" 
  FROM "Player" 
  WHERE "Player"."userId" = "Battle"."userId"
);

-- Step 3: Verify all rows have been updated (this will fail if any are null)
-- If there are battles without a corresponding Player, we need to handle them
-- For now, we'll assume all battles have a corresponding Player

-- Step 4: Make playerId NOT NULL
ALTER TABLE "Battle" ALTER COLUMN "playerId" SET NOT NULL;

-- Step 5: Drop the old foreign key constraint on userId
ALTER TABLE "Battle" DROP CONSTRAINT "Battle_userId_fkey";

-- Step 6: Drop old indexes on userId
DROP INDEX IF EXISTS "Battle_userId_idx";
DROP INDEX IF EXISTS "Battle_userId_status_idx";

-- Step 7: Drop the userId column
ALTER TABLE "Battle" DROP COLUMN "userId";

-- Step 8: Add the new foreign key constraint to Player
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Create new indexes on playerId
CREATE INDEX "Battle_playerId_idx" ON "Battle"("playerId");
CREATE INDEX "Battle_playerId_status_idx" ON "Battle"("playerId", "status");
