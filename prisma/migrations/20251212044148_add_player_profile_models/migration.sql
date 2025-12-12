-- CreateEnum
CREATE TYPE "AchievementRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateTable
CREATE TABLE "PlayerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerProfileStats" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "vitality" INTEGER NOT NULL DEFAULT 10,
    "strength" INTEGER NOT NULL DEFAULT 10,
    "speed" INTEGER NOT NULL DEFAULT 10,
    "dexterity" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerProfileStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerPvpRecord" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerPvpRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerPveRecord" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "totalKills" INTEGER NOT NULL DEFAULT 0,
    "bossesSlain" INTEGER NOT NULL DEFAULT 0,
    "deathsUsed" INTEGER NOT NULL DEFAULT 0,
    "deathsLimit" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerPveRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "rarity" "AchievementRarity" NOT NULL DEFAULT 'COMMON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAchievement" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSocial" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "guildName" TEXT,
    "title" TEXT,
    "tagline" TEXT,
    "commendationsHelpful" INTEGER NOT NULL DEFAULT 0,
    "commendationsSkilled" INTEGER NOT NULL DEFAULT 0,
    "commendationsStrategic" INTEGER NOT NULL DEFAULT 0,
    "friendsCount" INTEGER NOT NULL DEFAULT 0,
    "guildRole" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerSocial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_userId_key" ON "PlayerProfile"("userId");

-- CreateIndex
CREATE INDEX "PlayerProfile_userId_idx" ON "PlayerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfileStats_profileId_key" ON "PlayerProfileStats"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerPvpRecord_profileId_key" ON "PlayerPvpRecord"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerPveRecord_profileId_key" ON "PlayerPveRecord"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_key_key" ON "Achievement"("key");

-- CreateIndex
CREATE INDEX "Achievement_key_idx" ON "Achievement"("key");

-- CreateIndex
CREATE INDEX "PlayerAchievement_profileId_idx" ON "PlayerAchievement"("profileId");

-- CreateIndex
CREATE INDEX "PlayerAchievement_achievementId_idx" ON "PlayerAchievement"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAchievement_profileId_achievementId_key" ON "PlayerAchievement"("profileId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSocial_profileId_key" ON "PlayerSocial"("profileId");

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfileStats" ADD CONSTRAINT "PlayerProfileStats_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPvpRecord" ADD CONSTRAINT "PlayerPvpRecord_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPveRecord" ADD CONSTRAINT "PlayerPveRecord_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSocial" ADD CONSTRAINT "PlayerSocial_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
