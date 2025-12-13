-- AlterTable
ALTER TABLE "PlayerPvpRecord" ADD COLUMN     "pvpWinStreakBest" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pvpWinStreakCurrent" INTEGER NOT NULL DEFAULT 0;
