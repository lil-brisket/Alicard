-- CreateTable
CREATE TABLE "PlayerLeaderboardStats" (
    "userId" TEXT NOT NULL,
    "pveKills" INTEGER NOT NULL DEFAULT 0,
    "pvpKills" INTEGER NOT NULL DEFAULT 0,
    "pvpWins" INTEGER NOT NULL DEFAULT 0,
    "pvpLosses" INTEGER NOT NULL DEFAULT 0,
    "jobXpTotal" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerLeaderboardStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PlayerStatsPeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "pveKills" INTEGER NOT NULL DEFAULT 0,
    "pvpKills" INTEGER NOT NULL DEFAULT 0,
    "pvpWins" INTEGER NOT NULL DEFAULT 0,
    "pvpLosses" INTEGER NOT NULL DEFAULT 0,
    "jobXpTotal" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStatsPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerLeaderboardStats_pveKills_idx" ON "PlayerLeaderboardStats"("pveKills");

-- CreateIndex
CREATE INDEX "PlayerLeaderboardStats_pvpKills_idx" ON "PlayerLeaderboardStats"("pvpKills");

-- CreateIndex
CREATE INDEX "PlayerLeaderboardStats_jobXpTotal_idx" ON "PlayerLeaderboardStats"("jobXpTotal");

-- CreateIndex
CREATE INDEX "PlayerStatsPeriod_periodType_periodStart_idx" ON "PlayerStatsPeriod"("periodType", "periodStart");

-- CreateIndex
CREATE INDEX "PlayerStatsPeriod_userId_periodType_periodStart_idx" ON "PlayerStatsPeriod"("userId", "periodType", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStatsPeriod_userId_periodType_periodStart_key" ON "PlayerStatsPeriod"("userId", "periodType", "periodStart");

-- AddForeignKey
ALTER TABLE "PlayerLeaderboardStats" ADD CONSTRAINT "PlayerLeaderboardStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStatsPeriod" ADD CONSTRAINT "PlayerStatsPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
