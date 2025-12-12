-- CreateEnum
CREATE TYPE "BattleStatus" AS ENUM ('ACTIVE', 'WON', 'LOST', 'FLED');

-- CreateTable
CREATE TABLE "Monster" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "vitality" INTEGER NOT NULL,
    "strength" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "dexterity" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "goldReward" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Monster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monsterId" TEXT NOT NULL,
    "status" "BattleStatus" NOT NULL DEFAULT 'ACTIVE',
    "turnNumber" INTEGER NOT NULL DEFAULT 1,
    "playerHp" INTEGER NOT NULL,
    "playerSp" INTEGER NOT NULL,
    "monsterHp" INTEGER NOT NULL,
    "log" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Monster_key_key" ON "Monster"("key");

-- CreateIndex
CREATE INDEX "Monster_level_idx" ON "Monster"("level");

-- CreateIndex
CREATE INDEX "Monster_key_idx" ON "Monster"("key");

-- CreateIndex
CREATE INDEX "Battle_userId_idx" ON "Battle"("userId");

-- CreateIndex
CREATE INDEX "Battle_status_idx" ON "Battle"("status");

-- CreateIndex
CREATE INDEX "Battle_userId_status_idx" ON "Battle"("userId", "status");

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
